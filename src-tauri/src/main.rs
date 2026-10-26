#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn export_backup(content: String, default_name: String) -> Result<Option<String>, String> {
    let Some(path) = rfd::FileDialog::new()
        .set_title("导出水星计划备份")
        .set_file_name(&default_name)
        .add_filter("水星计划备份", &["json"])
        .save_file()
    else {
        return Ok(None);
    };

    std::fs::write(&path, content).map_err(|error| format!("无法写入备份文件：{error}"))?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![export_backup])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
