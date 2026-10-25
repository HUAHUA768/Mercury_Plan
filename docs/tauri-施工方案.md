# 施工方案：水星计划 → Tauri 桌面 exe

> 目标：一个双击即开、图标正确、不用浏览器、不依赖 `.cmd` 的 Windows 桌面应用。
> 起因：Web 原型用 `.cmd` 启动 + 外部 `.ico` 做快捷方式图标，在 Win11 上图标一直显示成白纸。
> 换 exe 路线后，图标在编译时写进 exe 资源，快捷方式直接继承，不再依赖任何外部图标文件。

---

## 0. 先决条件（开场让 AI 先确认）

| 项目 | 要求 | 检查命令 |
|---|---|---|
| Rust | stable 1.7x+ | `rustc --version` |
| VS Build Tools | C++ 工作负载 | `cl.exe` 或 Tauri 文档的 `xwin` 方案 |
| WebView2 | Win10/11 自带（Win11 一定有） | 跳过 |
| Node | 可选，仅用于 Tauri CLI 脚手架 | `node -v` |

若 Rust 没装：

```powershell
winget install Rustlang.Rustup
rustup default stable-msvc
```

### 顺手清理低完整性标签（必做）

这是这次图标问题的**真正根因**，不是 Win11 的特色：

- `E:\Mercury_Plan` 目录被写入了低完整性等级标签
  (`Mandatory Label\Low Mandatory Level:(OI)(CI)(NW)`)，底下所有文件都会继承；
- 后果是**任何** ico 放进去都显示白纸 —— 换成正常的 `PaperTodo.ico`、甚至把正常的 Edge
  快捷方式改成它，桌面照样白纸；
- 该标签清除需要 SYSTEM 权限改 SACL，普通管理员进程也改不动。

管理员 PowerShell 执行：

```powershell
icacls E:\Mercury_Plan /setintegritylevel Medium /T /C
```

执行完用下面命令确认已经没有 `Low Mandatory` 字样：

```powershell
icacls E:\Mercury_Plan\assets\mercury.ico
```

> 这一步和新 exe 路线**不是同一个问题**，但留着会继续影响其他软件读取这个目录，顺手清掉。

---

## 1. 目标目录结构

```
E:\Mercury_Plan\
├── src\                    # Rust 后端（主要就是 main.rs）
│   └── main.rs
├── ui\                     # 前端（把现有文件挪进来）
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── icons\                  # 打包进 exe 的图标（由 assets\icon-*.png 生成）
│   ├── icon.ico
│   ├── 32x32.png
│   ├── 128x128.png
│   └── icon.png
├── assets\                 # 保留现有 PNG 源（生成图标的原料）
├── tauri.conf.json
├── Cargo.toml
├── build.rs
└── package.json            # 只用于 @tauri-apps/cli
```

**原样保留**：`app.js`、`styles.css`、`index.html`（`index.html` 里那个
`<link rel="icon">` 可以删掉，不再需要外部文件）。

**删除 / 归档**：

| 文件 | 处理 |
|---|---|
| `启动水星计划.cmd` | 删除（Edge 启动方案不再需要） |
| `server.py` | 删除（Tauri 自己起前端服务） |
| `.edge-profile\`、`.edge-apptest\` | 删除（几百 MB 浏览器缓存） |
| `_history-backup-*.bundle` | 移出仓库目录（64 MB） |
| `shots\` | 可保留，作为历史截图 |
| `assets\make-icon.ps1` | 删除（改由 `tauri icon` 生成） |

---

## 2. 依赖配置

### `Cargo.toml`

```toml
[package]
name = "mercury-plan"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[profile.release]
opt-level = "s"
lto = true
strip = true
codegen-units = 1
panic = "abort"
```

### `build.rs`

```rust
fn main() {
    tauri_build::build()
}
```

### `package.json`

```json
{
  "name": "mercury-plan",
  "private": true,
  "scripts": {
    "dev": "tauri dev",
    "build": "tauri build"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2"
  }
}
```

---

## 3. `tauri.conf.json`

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "水星计划",
  "version": "0.1.0",
  "identifier": "com.mercuryplan.app",
  "build": {
    "frontendDist": "ui"
  },
  "app": {
    "windows": [
      {
        "title": "水星计划",
        "width": 1440,
        "height": 900,
        "minWidth": 1280,
        "minHeight": 800,
        "center": true,
        "resizable": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "installMode": "currentUser",
        "installerIcon": "icons/icon.ico"
      }
    }
  }
}
```

要点：

- `productName` 用中文，exe 文件名直接就是 `水星计划.exe`
- `installMode: currentUser` → 安装不需要管理员，装到 `%LOCALAPPDATA%`
- `bundle.icon` 里的 `icon.ico` 会**同时**作为 exe 资源图标和快捷方式图标 ——
  这就是项目要达成的目标：图标跟着 exe 走

---

## 4. 图标生成

Tauri 自带图标生成器，直接用现有的 PNG 当原料：

```powershell
cd E:\Mercury_Plan
npx tauri icon assets\icon-256.png -o icons
```

产出一整套标准尺寸（含 `icon.ico`、`32x32.png`、`128x128.png`、`icon.png`），
由官方工具保证格式正确 —— 不要再手写 ICO 打包脚本（之前的坑就在那里：
文件头字段写错，导致解码成乱码）。

生成后确认：

```powershell
Get-ChildItem icons
```

---

## 5. `src/main.rs`

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

> `windows_subsystem = "windows"` 保证双击时不弹出黑色控制台窗口。

---

## 6. 前端适配（改动最小）

现有 `app.js` 用 `localStorage` 存数据，Tauri 的 WebView2 同样支持，**首版完全不用改**。

后续升级数据层时再选：

- 方案 A：`tauri-plugin-store` —— JSON 文件存到 `%APPDATA%\com.mercuryplan.app`
- 方案 B：`rusqlite` —— SQLite，对应 README 里承诺的「正式版本地数据库」

建议**首版先跑通，数据层第二步再换**。

### 开场必须检查的三点

1. `index.html` 里的 `<link rel="icon" href="assets/mercury.ico">` —— 删掉，否则 404
2. `app.js` 里如果有 `window.location`、`fetch('...')` 之类的绝对路径请求，改成相对路径
3. `Ctrl+Z`、`Ctrl+K` 在 WebView2 里正常；如果被 Tauri 默认菜单拦截，
   在 `tauri.conf.json` 里禁掉默认菜单

---

## 7. 构建

```powershell
cd E:\Mercury_Plan
npm install
npm run build
```

产物：

```
src-tauri\target\release\mercury-plan.exe                             ← 绿色版，双击即开
src-tauri\target\release\bundle\nsis\水星计划_0.1.0_x64-setup.exe    ← 安装包
```

### 验收清单

逐条给出明确结果，**不要用截屏反复验证**（上次就是这么烧掉大量 token 的）：

- [ ] 双击 `水星计划.exe` → 直接打开窗口，没有控制台黑框
- [ ] 窗口标题栏图标是金色水星
- [ ] 安装后桌面 / 开始菜单快捷方式图标是金色水星
- [ ] 所有页面能点、能记、能改
- [ ] 关闭再打开，数据还在
- [ ] exe 体积（预期 5–15 MB）

---

## 8. Git 与忽略规则

现有 `.gitignore` 里的 `*.lnk`、`.edge-profile/` 等条目保留，新增：

```gitignore
# Tauri / Rust
src-tauri/target/
target/
node_modules/
```

- `Cargo.lock` **要提交**（应用类项目锁死依赖版本）
- `_history-backup-*.bundle` 建议移出仓库目录，别跟着新构建一起提交

---

## 9. 时间预估

| 阶段 | 预计 |
|---|---|
| 环境检查 + 脚手架 | 10 分钟 |
| 前端挪进 `ui\` + 路径适配 | 10 分钟 |
| 图标生成 + 配置 | 5 分钟 |
| 首次编译（下载依赖，最慢） | 5–15 分钟 |
| 验收 + 小修 | 10 分钟 |

首次 `cargo build` 会下载并编译大量依赖，建议提前告诉 AI
「耐心等编译完成，不要反复重启或重复构建」。

---

## 10. 新对话开场白（可直接复制）

> 把 E:\Mercury_Plan 这个 Web 原型重写成 Tauri 2 桌面应用，目标是双击即开的 exe，
> 图标编译进 exe 资源。
>
> 约束：
> - `app.js` / `styles.css` / `index.html` 原样复用，挪到 `ui\`，不改业务逻辑
>   （首版数据仍用 localStorage）
> - 图标用 `assets\icon-256.png` 经 `npx tauri icon` 生成到 `icons\`
> - `productName` 叫「水星计划」，NSIS、currentUser 安装，
>   `windows_subsystem = "windows"`
> - 删除 `启动水星计划.cmd`、`server.py`、`assets\make-icon.ps1` 和 `.edge-profile` 相关残留
> - 顺便提示我管理员执行 `icacls E:\Mercury_Plan /setintegritylevel Medium /T /C`
> - 验收按方案第 7 节逐项报告，不要用截屏反复验证

---

## 附：这次图标问题的排查结论（存档）

| 观察 | 结论 |
|---|---|
| 快捷方式图标显示白纸，图标文件一直存在 | 不是路径问题 |
| 「更改图标」对话框里能看到图标，确定后桌面仍白纸 | 不是 ico 解码问题 |
| 换成正常的 `PaperTodo.ico`，同样白纸 | 不是本项目图标质量问题 |
| 把正常的 Edge 快捷方式图标改成 `PaperTodo.ico`，也白纸 | 不是某个快捷方式坏了 |
| `E:\Mercury_Plan` 下所有文件都有 `Low Mandatory Level` 标签 | **根因：目录被打上低完整性标签** |

另外独立修掉的一个真实 bug：`assets\mercury.ico` 原本被打包坏了
（目录项登记 16 色 / 0 位深，帧头 4bpp 调色板，实际数据却是 32bpp），
已用现成 PNG 重新打包为 8 个尺寸、帧头全部正确的版本。

改走 exe 路线后，这两个问题都不再影响图标显示。