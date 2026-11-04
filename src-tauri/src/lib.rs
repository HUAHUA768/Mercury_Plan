use serde::Serialize;
use std::time::Duration;
use ureq::{Agent, AgentBuilder};

// ---------- 通用 ----------

fn webdav_agent() -> Agent {
    AgentBuilder::new()
        .timeout(Duration::from_secs(30))
        .build()
}

fn b64(input: &str) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bytes = input.as_bytes();
    let mut out = String::new();
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = *chunk.get(1).unwrap_or(&0) as u32;
        let b2 = *chunk.get(2).unwrap_or(&0) as u32;
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(T[(n >> 18) as usize & 63] as char);
        out.push(T[(n >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 { T[(n >> 6) as usize & 63] as char } else { '=' });
        out.push(if chunk.len() > 2 { T[n as usize & 63] as char } else { '=' });
    }
    out
}

fn auth_header(username: &str, password: &str) -> String {
    format!("Basic {}", b64(&format!("{username}:{password}")))
}

fn dav_error(code: u16) -> String {
    match code {
        401 => "账号或应用密码不正确（应用密码需在坚果云网页版「安全选项」中生成，不是登录密码）".into(),
        403 => "坚果云拒绝了请求（可能流量或请求次数已达上限）".into(),
        404 => "云端文件或文件夹不存在".into(),
        429 => "请求太频繁：坚果云免费账户有频率限制，稍后再试".into(),
        507 => "坚果云空间不足".into(),
        _ => format!("坚果云返回错误 {code}"),
    }
}

/// 路径段做百分号编码，避免特殊字符破坏 URL
fn encode_path(seg: &str) -> String {
    let mut out = String::new();
    for b in seg.as_bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(*b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Some(v) = std::str::from_utf8(&b[i + 1..i + 3])
                .ok()
                .and_then(|h| u8::from_str_radix(h, 16).ok())
            {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// 拼接 WebDAV URL；folder/file 均可留空
fn join_url(server: &str, folder: &str, filename: Option<&str>) -> Result<String, String> {
    let mut base = server.trim().to_string();
    if base.is_empty() {
        base = "https://dav.jianguoyun.com/dav/".into();
    }
    if !base.starts_with("http://") && !base.starts_with("https://") {
        return Err("服务器地址必须以 http:// 或 https:// 开头".into());
    }
    while base.ends_with('/') {
        base.pop();
    }
    let mut url = base;
    for seg in folder.split('/').filter(|s| !s.trim().is_empty()) {
        url.push('/');
        url.push_str(&encode_path(seg.trim()));
    }
    if let Some(f) = filename {
        let f = f.trim().trim_matches('/');
        if f.is_empty() {
            return Err("文件名无效".into());
        }
        url.push('/');
        url.push_str(&encode_path(f));
    }
    Ok(url)
}

/// 逐级 MKCOL 创建云端文件夹；已存在(405)视为成功
fn ensure_folders(
    agent: &Agent,
    username: &str,
    password: &str,
    server: &str,
    folder: &str,
) -> Result<(), String> {
    let mut url = server.trim().trim_end_matches('/').to_string();
    if url.is_empty() {
        url = "https://dav.jianguoyun.com/dav".into();
    }
    for seg in folder.split('/').filter(|s| !s.trim().is_empty()) {
        url.push('/');
        url.push_str(&encode_path(seg.trim()));
        let res = agent
            .request("MKCOL", &url)
            .set("Authorization", &auth_header(username, password))
            .call();
        match res {
            Ok(_) => {}
            Err(ureq::Error::Status(code, _)) if code == 301 || code == 405 => {}
            Err(ureq::Error::Status(code, _)) => return Err(dav_error(code)),
            Err(e) => return Err(format!("创建云端文件夹失败：{e}")),
        }
    }
    Ok(())
}

fn tag_value(xml: &str, tag: &str) -> Option<String> {
    for pat in [format!("<{tag}>"), format!("<D:{tag}>")] {
        if let Some(i) = xml.find(&pat) {
            let rest = &xml[i + pat.len()..];
            if let Some(j) = rest.find('<') {
                return Some(rest[..j].trim().to_string());
            }
        }
    }
    None
}

fn parse_propfind(xml: &str) -> Vec<CloudFile> {
    let xml = xml.replace("<d:", "<D:").replace("</d:", "</D:");
    let mut out = Vec::new();
    for chunk in xml.split("<D:response").skip(1) {
        let chunk = match chunk.find("</D:response>") {
            Some(i) => &chunk[..i],
            None => chunk,
        };
        if chunk.contains("<D:collection") {
            continue; // 只要文件，不要文件夹本身
        }
        let href = match tag_value(chunk, "href") {
            Some(h) => h,
            None => continue,
        };
        let name = percent_decode(&href)
            .trim_end_matches('/')
            .rsplit('/')
            .next()
            .unwrap_or("")
            .to_string();
        if name.is_empty() {
            continue;
        }
        let size = tag_value(chunk, "getcontentlength")
            .and_then(|s| s.replace(',', "").trim().parse().ok())
            .unwrap_or(0);
        let modified = tag_value(chunk, "getlastmodified").unwrap_or_default();
        out.push(CloudFile {
            name,
            size,
            modified,
        });
    }
    out
}

#[derive(Serialize)]
struct CloudFile {
    name: String,
    size: u64,
    modified: String,
}

// ---------- 同步实现（放 spawn_blocking 里跑） ----------

fn test_sync(server: &str, username: &str, password: &str, folder: &str) -> Result<(), String> {
    let agent = webdav_agent();
    // 先确保备份文件夹存在，再对文件夹本身做 PROPFIND 探测
    ensure_folders(&agent, username, password, server, folder)?;
    let url = join_url(server, folder, None)?;
    let url = format!("{url}/"); // 坚果云对不带尾斜杠的目录会 301 重定向
    let res = agent
        .request("PROPFIND", &url)
        .set("Authorization", &auth_header(username, password))
        .set("Depth", "0")
        .call();
    match res {
        Ok(_) => Ok(()),
        Err(ureq::Error::Status(code, _)) => Err(dav_error(code)),
        Err(e) => Err(format!("无法连接坚果云：{e}")),
    }
}

fn upload_sync(
    server: &str,
    username: &str,
    password: &str,
    folder: &str,
    filename: &str,
    content: &str,
) -> Result<(), String> {
    let agent = webdav_agent();
    ensure_folders(&agent, username, password, server, folder)?;
    let url = join_url(server, folder, Some(filename))?;
    let res = agent
        .put(&url)
        .set("Authorization", &auth_header(username, password))
        .send(content.as_bytes());
    match res {
        Ok(_) => Ok(()),
        Err(ureq::Error::Status(code, r)) => {
            let extra = r
                .into_string()
                .ok()
                .map(|b| b.trim().to_string())
                .filter(|b| !b.is_empty())
                .map(|b| format!("，{b}"))
                .unwrap_or_default();
            Err(format!("{}{extra}", dav_error(code)))
        }
        Err(e) => Err(format!("上传失败：{e}")),
    }
}

fn list_sync(
    server: &str,
    username: &str,
    password: &str,
    folder: &str,
) -> Result<Vec<CloudFile>, String> {
    let agent = webdav_agent();
    let url = join_url(server, folder, None)?;
    let res = agent
        .request("PROPFIND", &url)
        .set("Authorization", &auth_header(username, password))
        .set("Depth", "1")
        .call();
    let body = match res {
        Ok(r) => r
            .into_string()
            .map_err(|e| format!("读取云端列表失败：{e}"))?,
        Err(ureq::Error::Status(404, _)) => return Ok(Vec::new()), // 文件夹还没建过
        Err(ureq::Error::Status(code, _)) => return Err(dav_error(code)),
        Err(e) => return Err(format!("读取云端列表失败：{e}")),
    };
    Ok(parse_propfind(&body))
}

fn download_sync(
    server: &str,
    username: &str,
    password: &str,
    folder: &str,
    filename: &str,
) -> Result<String, String> {
    let agent = webdav_agent();
    let url = join_url(server, folder, Some(filename))?;
    match agent
        .get(&url)
        .set("Authorization", &auth_header(username, password))
        .call()
    {
        Ok(r) => r.into_string().map_err(|e| format!("下载失败：{e}")),
        Err(ureq::Error::Status(code, _)) => Err(dav_error(code)),
        Err(e) => Err(format!("下载失败：{e}")),
    }
}

fn delete_sync(
    server: &str,
    username: &str,
    password: &str,
    folder: &str,
    filename: &str,
) -> Result<(), String> {
    let agent = webdav_agent();
    let url = join_url(server, folder, Some(filename))?;
    match agent
        .delete(&url)
        .set("Authorization", &auth_header(username, password))
        .call()
    {
        Ok(_) => Ok(()),
        Err(ureq::Error::Status(404, _)) => Ok(()),
        Err(ureq::Error::Status(code, _)) => Err(dav_error(code)),
        Err(e) => Err(format!("删除失败：{e}")),
    }
}

// ---------- 坚果云 WebDAV 云备份（安卓主线程禁止同步网络，全部走 spawn_blocking） ----------

#[tauri::command]
async fn webdav_test(
    server: String,
    username: String,
    password: String,
    folder: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || test_sync(&server, &username, &password, &folder))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn webdav_upload(
    server: String,
    username: String,
    password: String,
    folder: String,
    filename: String,
    content: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        upload_sync(&server, &username, &password, &folder, &filename, &content)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn webdav_list(
    server: String,
    username: String,
    password: String,
    folder: String,
) -> Result<Vec<CloudFile>, String> {
    tauri::async_runtime::spawn_blocking(move || list_sync(&server, &username, &password, &folder))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn webdav_download(
    server: String,
    username: String,
    password: String,
    folder: String,
    filename: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        download_sync(&server, &username, &password, &folder, &filename)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn webdav_delete(
    server: String,
    username: String,
    password: String,
    folder: String,
    filename: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        delete_sync(&server, &username, &password, &folder, &filename)
    })
    .await
    .map_err(|e| e.to_string())?
}

// ---------- 文件作用域：把 dialog 选中的路径（安卓 content:// URI）临时放行 ----------

#[tauri::command]
fn allow_fs_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_fs::FsExt;
    app.fs_scope()
        .allow_file(&path)
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            allow_fs_path,
            webdav_test,
            webdav_upload,
            webdav_list,
            webdav_download,
            webdav_delete
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
