# 施工方案：水星计划 → 安卓版（Tauri 2 Android）

> 目标：安卓端功能与 Windows 版完全对齐；Windows 导出的 JSON 备份可原样导入安卓端，反之亦然。
> 路线：同一套 `ui/` 前端 + Tauri 2 安卓壳，不做 Flutter/Compose 重写（重写会丢 3400 行已验证的交互逻辑）。
> 源工程：`E:\Mercury_Plan`（Windows 版，Tauri 2 + 原生 HTML/CSS/JS）。新工作区请先把源工程相关文件复制过去。

---

## 0. 签名与安全，先给结论

**安卓要求所有可安装的 APK 必须签名（v2 及以上）。完全未签名的 APK 装不上**：手机提示「应用未安装 / 解析包时出现问题」，`adb install` 报 `INSTALL_PARSE_FAILED_NO_CERTIFICATES`。

但「必须签名」≠「必须买证书 / 必须上架」：

| 情况 | 是否需要自己处理签名 | 能否直接装手机 |
|---|---|---|
| `tauri android dev` 调试包 | 不用，Gradle 自动用 `~/.android/debug.keystore` 签 | 能，直接 sideload |
| release APK，未配 keystore | 会产出 **unsigned** APK | **不能** |
| release APK，自建 keystore（keytool 一条命令，免费） | 配一次 Gradle | 能，直接 sideload |
| 上架 Google Play | 还要 AAB + Play App Signing + 当年 targetSdk 政策 | 走商店 |
| 上架国内商店 | 要企业资质、软著、备案 | 走商店审核 |

安装侧还有一个门槛（与签名无关）：手机需对该来源开启「允许安装未知应用」，Android 8+ 是**按来源应用授权**，不是全局开关。

安全性上安卓确实更「结构化」：应用沙箱、权限清单（本应用只需要 `INTERNET`）、数据落在私有目录、卸载即清除。这些对我们是好事，不增加开发量，详见第 9 节。

---

## 1. 环境准备

**平台：直接用现有 Windows 10/11 x64 即可，不需要 Linux，也不需要双系统。** Tauri 2 官方支持在 Windows 上构建安卓包（只有 iOS 必须 macOS）。Linux 同样可行，但换系统要重装 Rust 工具链（msvc → gnu）并重配整套环境，纯亏。

| 依赖 | 版本 | 说明 |
|---|---|---|
| JDK | 17（推荐）；21 也可 | 21 需 Gradle 8.5+；若报 `Unsupported class file major version 65`，装个 JDK 17 并把 `JAVA_HOME` 指过去即可 |
| Android Studio | 最新稳定版 | 只为装 SDK / NDK / 模拟器，不必用它写代码 |
| SDK Platform | API 35（或当年最新） | `targetSdk` 用 35 |
| NDK | 27.x（Tauri 文档标注的版本） | `sdkmanager "ndk;27.0.12077973"` |
| Build Tools | 35.x | 随 SDK 装 |
| Rust target | 4 个 | `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android` |
| Node | ≥ 20 | 已具备 |

环境变量（Windows，系统环境变量里加）：

```
JAVA_HOME       = C:\Program Files\Android\Android Studio\jbr
ANDROID_HOME    = C:\Users\<你>\AppData\Local\Android\Sdk
NDK_HOME        = %ANDROID_HOME%\ndk\27.0.12077973
```

验证：`java -version`（17.x）、`adb version`、`rustup target list --installed`（含 4 个 android target）。

Windows 上的三条注意：

- 工程路径避开中文和空格（Gradle / NDK 偶发解析失败），新工作区别放在含中文的目录下。
- 开启长路径支持：`reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f`（管理员）。
- 模拟器要硬件加速：BIOS 开 VT-x/SVM，Windows 启用「虚拟机平台 / Hyper-V」，否则 x86_64 模拟器起不来；真机调试则只需 USB 驱动 + 开发者模式。

> 首次 `npm run android:dev` 会下载 Gradle 依赖，5–20 分钟属正常，别中途重启。

---

## 2. 新工作区初始化

新目录（例：`E:\Mercury_Plan_Android`）只复制这些，**不要**复制 `src-tauri/target`、`node_modules`、`shots`：

```
Mercury_Plan_Android\
├── ui\                     ← 原样复制 index.html / app.js / styles.css
├── assets\icon-256.png     ← 图标源
├── icons\                  ← 桌面图标，桌面端仍在用（安卓图标由 tauri icon --android 另生成）
├── scripts\bump.js
├── package.json
├── rust-toolchain.toml
├── src-tauri\
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json
│   ├── capabilities\default.json     ← 新增
│   └── src\
│       ├── lib.rs                    ← 新增（原 main.rs 的 command 全搬这里）
│       └── main.rs                   ← 只剩一行调用 lib.rs
└── README.md
```

`package.json` 增加脚本：

```json
{
  "scripts": {
    "dev": "tauri dev",
    "build": "tauri build",
    "android:init": "tauri android init",
    "android:dev": "tauri android dev",
    "android:apk": "tauri android build --apk"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "@tauri-apps/plugin-fs": "^2"
  }
}
```

初始化安卓工程（只需一次）：

```powershell
npm install
npx tauri android init
```

`tauri android init` 会问 keystore：**这一步先跳过（回车跳过），先用 debug 包跑通功能**，签名放到第 8 节。

---

## 3. 后端改造（Rust 侧）

### 3.1 `main.rs` → `lib.rs`

安卓要求 mobile entry point。`Cargo.toml` 加：

```toml
[lib]
name = "mercury_plan_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[target.'cfg(not(target_os = "android"))'.dependencies]
rfd = "0.16"          # rfd 不支持 Android，必须加 target 限定

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
ureq = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

`src/main.rs`：

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    mercury_plan_lib::run()
}
```

`src/lib.rs`：把现有 6 个 command 搬进来，改成 `pub fn run()`：

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            webdav_test, webdav_upload, webdav_list, webdav_download, webdav_delete
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

`export_backup` 命令删掉（改由前端 dialog + fs 完成，双端同一条代码路径，`rfd` 只保留给桌面端旧逻辑兜底）。

### 3.2 WebDAV 必须改异步（关键，不改必崩）

安卓主线程禁止网络请求，同步 command 会抛 `NetworkOnMainThreadException`。把 5 个 `webdav_*` 全改成：

```rust
#[tauri::command]
async fn webdav_upload(
    server: String, username: String, password: String,
    folder: String, filename: String, content: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        // 原同步实现原样放这里
    })
    .await
    .map_err(|e| e.to_string())?
}
```

其余四个同构。注意参数要 `move` 进闭包（先 clone 或直接消费）。

### 3.3 `tauri.conf.json` 增量

```json
{
  "app": {
    "withGlobalTauri": true,
    "windows": [{ "title": "水星计划", "width": 1440, "height": 900, "resizable": true }],
    "security": { "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:" }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "icon": ["../icons/32x32.png", "../icons/128x128.png", "../icons/icon.ico"],
    "android": { "minSdkVersion": 26 }
  }
}
```

`identifier` 保持 `com.mercuryplan.app`（它就是安卓包名，别改，改了等于换应用）。

### 3.4 `capabilities/default.json`（新建）

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:allow-write-file",
    {
      "identifier": "fs:scope",
      "allow": [{ "path": "$DOWNLOAD/**" }, { "path": "$DOCUMENT/**" }]
    }
  ]
}
```

若写入用户选中的路径被 scope 拦截，加一个运行时放行命令（dialog 选中的 content URI 可这样加入作用域）：

```rust
#[tauri::command]
fn allow_fs_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_fs::FsExt;
    app.fs_scope().allow_file(&path).map_err(|e| e.to_string())
}
```

---

## 4. 平台适配层：备份导入导出（需求 2 的核心）

新增 `ui/platform.js`，在 `index.html` 里放在 `app.js` **之前**，只负责一件事：告诉 `app.js` 当前平台并提供文件读写。

```js
// platform.js
(function () {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const T = window.__TAURI__ || {};

  async function pickJsonText() {
    if (!isAndroid) {                      // 桌面：保留原 <input type=file> 逻辑
      return null;                          // null = 让 app.js 走老流程
    }
    const p = await T.dialog.open({
      multiple: false, directory: false,
      filters: [{ name: '水星计划备份', extensions: ['json'] }]
    });
    if (!p) return null;
    const text = await T.fs.readTextFile(p);
    return text.replace(/^\uFEFF/, '');     // 安卓端可能带 BOM，必须剥掉再 JSON.parse
  }

  async function saveJsonText(defaultName, text) {
    const p = await T.dialog.save({
      defaultPath: defaultName,
      filters: [{ name: '水星计划备份', extensions: ['json'] }]
    });
    if (!p) return null;
    if (isAndroid) await T.fs.writeTextFile(p, text);
    else await T.fs.writeTextFile(p, text);
    return p;
  }

  window.MercuryPlatform = { isAndroid, pickJsonText, saveJsonText };
})();
```

`app.js` 只改两处（其余逻辑一行不动）：

**导出**（替换 `exportBackup()` 内部）：

```js
const text = JSON.stringify(createBackup(), null, 2);
const name = `水星计划备份-${TODAY_K}.json`;
const path = await window.MercuryPlatform.saveJsonText(name, text);
if (!path) return;
openExportSuccess(path);   // 安卓上把 "文件已导出到：<content://...>" 改成友好文案
```

**导入**（替换 `importBackup()` 里 `<input type=file>` 那段）：

```js
let payload;
const text = await window.MercuryPlatform.pickJsonText();
if (text === null) {
  // 桌面：走原有 input 流程，保持原样
} else {
  try { payload = JSON.parse(text); }
  catch { throw new Error('文件不是合法的 JSON'); }
}
```

导入后的校验、二次确认、`meta.demo=false`、主题恢复、`S.trash` 兜底——**全部保持现有代码不动**，这是跨端兼容的保证。

### 兼容契约（后端不要碰的常量）

| 项 | 值 |
|---|---|
| localStorage 主键 | `mercury.plan.v1` |
| 主题键 | `mercury.theme` |
| 坚果云配置键 | `mercury.webdav` |
| 备份 `format` | `mercury-plan-backup` |
| 备份 `version` | `1` |
| 必须存在的数组 | `tasks projects goals habits wishes trivia achievements routines hobbies memos trash` |
| 必须存在的对象 | `data.ui` |
| `theme` 取值 | `graphite` / `day` / `ink` / `cyber` / `forest` |
| 状态内部版本 | `S.v = 2`（加载时自动迁移） |
| 导出文件名 | `水星计划备份-YYYY-MM-DD.json` |

**导入容错规则（必须照抄）**：`routines` / `hobbies` / `memos` 缺失时补 `[]` 再校验，否则老备份会被拦。`ui` 缺失直接报错。`theme` 不在列表内报错。

---

## 5. 界面移动化（需求 1 的可见部分）

原则：**桌面外观一行不改**。新增 `ui/mobile.css`，用媒体查询 + 粗指针条件覆盖，`index.html` 里追加一行 `<link rel="stylesheet" href="mobile.css">`。

### 5.1 布局映射

| 桌面 | 安卓 |
|---|---|
| 左侧 212px 固定侧栏（11 个导航项分组） | 底部固定 tab 栏，横向可滑动，图标在上文字在下 |
| 顶栏日期切换 + 快捷按钮 | 保留一行，高度压到 52px，日期条支持左右滑动切日（可选） |
| `.today-grid` 三栏 | 单列，卡片顺序不变 |
| `.goals-layout` 1fr + 372px | 单列，目标树折叠 |
| `.trivia-layout` 268px + 正文 | 单列，日历在上列表在下 |
| `.memo-layout` 258px + 正文；编辑双栏 | 列表/编辑两页切换；编辑器「编辑 / 预览」分 tab |
| 抽屉 430px 右侧滑出 | 全屏 sheet，从底部升起 |
| 弹窗居中 | 底部 sheet，最大高度 88vh |
| 习惯周网格 7×20px | 横向滚动，格子加大到 34px |
| 行内 hover 才出现的删除按钮 | 常驻「⋯」按钮或左滑删除 |
| `Ctrl+Z` / `Ctrl+K` / `Ctrl+Shift+Space` | 顶部撤销条 + 「更多」里的命令入口；快捷键代码保留但不用 |

### 5.2 骨架 CSS（可直接用）

```css
/* ui/mobile.css —— 只在手机上生效 */
@media (max-width: 760px), (pointer: coarse) {
  .app { grid-template-columns: 1fr; grid-template-rows: minmax(0,1fr) auto; height: 100dvh; }

  /* 侧栏 → 底部 tab */
  .sidebar {
    position: fixed; left: 0; right: 0; bottom: 0; top: auto;
    height: 58px; width: auto; padding: 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    display: flex; flex-direction: column; justify-content: flex-end;
    border-right: 0; border-top: 1px solid var(--line, #262c33);
    z-index: 30; background: var(--bg-1, #12171c);
  }
  .sidebar .brand, .sidebar .side-foot, .sidebar .nav-label { display: none; }
  .sidebar .nav { display: flex; flex-direction: row; overflow-x: auto; padding: 0 4px; gap: 2px; }
  .sidebar .nav-item {
    flex: 0 0 auto; min-width: 62px; height: 54px;
    flex-direction: column; justify-content: center; gap: 3px;
    font-size: 10.5px; padding: 0 6px; border-radius: 10px;
  }
  .sidebar .nav-item .nav-extra { position: absolute; top: 6px; right: 8px; font-size: 9px; }

  /* 顶部安全区 */
  .main { padding-top: env(safe-area-inset-top, 0px); }
  .topbar { height: 52px; padding: 0 10px; }
  .view { padding: 10px 12px calc(58px + env(safe-area-inset-bottom, 0px)); }

  /* 所有多栏 → 单列 */
  .today-grid, .goals-layout, .trivia-layout, .memo-layout, .wish-layout { grid-template-columns: 1fr !important; }
  .memo-edit-split { grid-template-columns: 1fr; }
  .memo-preview { display: none; }          /* 用 tab 切换代替并排 */

  /* 抽屉 / 弹窗 */
  .drawer { width: 100vw; max-width: 100vw; border-radius: 14px 14px 0 0; top: auto; height: 92vh; }
  .modal { width: calc(100vw - 24px); max-height: 88vh; border-radius: 14px; }
  #modalLayer { align-items: flex-end; padding-bottom: env(safe-area-inset-bottom, 0px); }

  /* 触控尺寸 */
  .icon-btn, .btn { min-height: 40px; min-width: 40px; }
  .row-x, .card-x, .wish-item-x { opacity: .6; pointer-events: auto; }
  .hrow { grid-template-columns: minmax(0,1fr) 74px 84px; }
  .hrow .week { justify-content: start; overflow-x: auto; }
  html { -webkit-text-size-adjust: 100%; }
  body { overscroll-behavior-y: contain; }
}
```

`index.html` 的 viewport 改成：

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
```

### 5.3 返回键（必须处理，否则一点返回就退出应用）

用 `history.pushState` 做「层栈」，把路由、抽屉、弹窗都当成一层：

```js
// 追加到 app.js 末尾（或 platform.js 里包装）
function pushLayer() { try { history.pushState({ mp: 1 }, ''); } catch (e) {} }
const _openModal = openModal, _openDrawer = openDrawer;
openModal = function (h) { _openModal(h); pushLayer(); };
openDrawer = function (h) { _openDrawer(h); pushLayer(); };

window.addEventListener('popstate', function () {
  const layer = document.getElementById('modalLayer');
  if (layer && !layer.hidden) { closeModal(); return; }
  if (drawerOpen()) { closeDrawer(); return; }
  // 已经是首页时再按返回 → 允许系统退出（不再 pushState）
});
```

路由切换也要 `pushState`，否则返回键会一路退到空白页。

### 5.4 其他触点

- `index.html` 里 `<link rel="icon">` 无意义，删掉。
- 输入框全部加 `autocomplete="off" autocapitalize="off" spellcheck="false"`，中文输入法下 `Enter` 行为已在现有代码里处理，别动。
- 备忘录 textarea 加 `style="font-size:16px"`，否则 iOS/部分安卓 WebView 聚焦会放大页面。
- 长列表（成就时间轴、云端记录）保留现有分页/滚动，别引入虚拟列表。

---

## 6. 功能清单（逐项对齐，也是验收表）

| # | 模块 | 安卓端必须做到 |
|---|---|---|
| 1 | 今日总览 | 日程、琐事、今日焦点、习惯打卡四块都能操作、能完成、能撤销 |
| 2 | 日程待办 | 日视图 / 清单切换；自然语言添加（「明天 10 点 开会」）解析正确；逾期标记；完成可撤销 |
| 3 | 目标拆解 | 多层级树、增删子目标、进度汇总、「排入今日」 |
| 4 | 我的项目 | 卡片、状态、下一步行动编辑、详情抽屉 |
| 5 | 日常记录 | 周期规则、完成追加日志、「哪天做的」必填、「预计下次」可选 |
| 6 | 习惯 | 养成/戒除两类、补卡、连续天数、最长纪录、破戒记录 |
| 7 | 兴趣爱好 | 卡片、热爱程度、投入记录（日期/时长/感想）、全部记录 |
| 8 | 心愿清单 | 想要程度、预算、拆子项、子项进度自动统计 |
| 9 | 备忘录 | 列表 + Markdown 编辑 + 预览、保存、删除进回收站 |
| 10 | 琐事记录 | 按日记录、日历跳转、关联备忘录 |
| 11 | 成就 | 时间轴、来源标签、手动新增 |
| 12 | 回收站 | 40 条上限、按类型恢复、彻底清除 |
| 13 | 撤销删除 | 顶部撤销条 + 回收站双通道（快捷键在手机上不可用） |
| 14 | 主题 | 5 套主题（graphite/day/ink/cyber/forest）全部生效，重启保留 |
| 15 | 导出备份 | dialog.save + fs 写入，内容与 Windows 导出的 JSON **逐字段等价** |
| 16 | 导入备份 | dialog.open + fs 读取，校验、二次确认、覆盖、恢复主题 |
| 17 | 坚果云云备份 | 测试连接、备份、云端记录、恢复、删除，与 Windows 同一文件夹 `/MercuryPlan/` |
| 18 | 重置演示数据 | 二次确认后清空并重载 |
| 19 | 命令面板 / 快速记录 | 手机端降到「更多」菜单入口，功能不丢 |

---

## 7. 跨端备份测试矩阵（必须全绿）

| 用例 | 步骤 | 期望 |
|---|---|---|
| W→A 全量 | Windows 导出 → 传到手机 → 安卓导入 | 11 个模块数据条数与桌面一致，主题恢复 |
| A→W 回灌 | 安卓改几条 → 导出 → Windows 导入 | 桌面正常显示，无字段丢失 |
| 老备份 | 手工删掉 `routines`/`hobbies`/`memos` 字段再导入 | 自动补空数组，导入成功 |
| 损坏文件 | 传一个 `.txt` 改名 `.json` | 提示「导入失败」，现有数据不变 |
| 空数据 | 全新安装导出后再导入 | 正常，无报错 |
| 大文件 | 2000 条待办 / 5MB JSON | 10 秒内完成，无 ANR |
| BOM 文件 | 用记事本另存为 UTF-8 with BOM | 成功（依赖 `\uFEFF` 剥离） |
| 中途取消 | 打开选择器后点返回 | 不报错、不清数据 |
| 云备份互通 | 桌面备份到坚果云 → 手机「云端记录」恢复 | 条数一致 |
| 中文文件名 | 导出 `水星计划备份-2026-11-03.json` | 文件管理器可见，可再次选中导入 |

---

## 8. 签名与打包

### 8.1 生成 keystore（一次，永久保管）

```powershell
keytool -genkeypair -v ^
  -keystore mercury-release.keystore ^
  -alias mercury ^
  -keyalg RSA -keysize 2048 -validity 10000 ^
  -storepass 你的密码 -keypass 你的密码 ^
  -dname "CN=Mercury Plan, OU=Personal, O=Mercury, C=CN"
```

> keystore 丢了 = 无法再覆盖安装同一包名的升级包（只能卸载重装，本地数据随之清空）。备份到网盘。

### 8.2 Gradle 配置

`src-tauri/gen/android/app/build.gradle.kts`，在 `android { }` 内加：

```kotlin
signingConfigs {
    create("release") {
        storeFile = file("../../../../mercury-release.keystore")
        storePassword = System.getenv("MERCURY_STORE_PASS") ?: "你的密码"
        keyAlias = "mercury"
        keyPassword = System.getenv("MERCURY_KEY_PASS") ?: "你的密码"
    }
}
buildTypes {
    getByName("release") {
        signingConfig = signingConfigs.getByName("release")
    }
}
```

### 8.3 构建

```powershell
# 调试包（自动签名，日常真机测试用这个）
npm run android:dev          # 直接装到已连接设备并热更新

# release APK
npm run android:apk
```

产物：

```
src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release.apk   ← 通用包，优先发这个
src-tauri\gen\android\app\build\outputs\apk\arm64\release\app-arm64-release.apk           ← 体积更小
src-tauri\gen\android\app\build\outputs\bundle\release\app-release.aab                   ← 上架 Play 才需要
```

安装：

```powershell
adb install -r app-universal-release.apk
```

或把 APK 传到手机，文件管理器点开安装（首次需允许「安装未知应用」）。

### 8.4 图标与应用名

```powershell
npx tauri icon assets\icon-256.png --android
```

应用名在 `src-tauri/gen/android/app/src/main/res/values/strings.xml`：

```xml
<string name="app_name">水星计划</string>
```

---

## 9. 权限与安全配置

`src-tauri/gen/android/app/src/main/AndroidManifest.xml`：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<application
    android:allowBackup="false"
    android:usesCleartextTraffic="false"
    android:label="@string/app_name">
```

- **只要 `INTERNET`**：坚果云 WebDAV 需要；文件导入导出走系统选择器（SAF），不需要任何存储权限。
- `allowBackup="false"`：避免数据被系统云备份/`adb backup` 拖走。代价是换机不带数据——用导出备份或坚果云解决。
- `usesCleartextTraffic="false"`：坚果云是 HTTPS，禁止明文，避免中间人。
- 坚果云账号与应用密码存在 localStorage（与 Windows 一致）；如需更强保护，后续换成 `EncryptedSharedPreferences`，但会打破双端代码一致，**首版不做**。
- `.gitignore` 加：`*.keystore`、`keystore.properties`、`src-tauri/gen/android/.gradle/`、`src-tauri/gen/android/app/build/`。
- `src-tauri/gen/android/` 里除构建产物外**要提交**（Gradle 配置、Manifest、图标），否则换机重装环境要重来。

---

## 10. 分阶段施工

| 阶段 | 内容 | 完成标志 |
|---|---|---|
| P0 | 环境装齐、`tauri android init`、空壳跑起来 | 手机/模拟器能看到默认页面 |
| P1 | 复制 `ui/`，`lib.rs` 拆分，debug 包启动 | 界面能显示，但布局错乱 |
| P2 | `mobile.css` + viewport + 返回键 | 11 个模块都能点进去操作 |
| P3 | 备份导出/导入切 dialog+fs，跑第 7 节矩阵 | W↔A 双向互通全绿 |
| P4 | WebDAV 改 async，坚果云全链路 | 手机能备份到 `/MercuryPlan/` 并恢复 |
| P5 | 图标/应用名/签名/release APK | 手机可安装、覆盖升级、数据保留 |

P0–P2 是主要工作量；P3 决定「能不能用」，P5 只花 20 分钟。

---

## 11. 已知坑（提前避）

| 坑 | 处理 |
|---|---|
| `rfd` 在 Android 编译失败 | Cargo 里用 `[target.'cfg(not(target_os = "android"))'.dependencies]` 隔离 |
| WebDAV 在手机上必崩 | 全部改 `async` + `spawn_blocking`（第 3.2 节） |
| 返回键直接退出应用 | `pushState` 层栈（第 5.3 节） |
| 弹窗被键盘顶住 | `windowSoftInputMode="adjustResize"` + `interactive-widget=resizes-content` |
| 顶部/底部被状态栏、手势条压住 | `env(safe-area-inset-*)` + `viewport-fit=cover` |
| 输入框聚焦页面放大 | `font-size:16px` |
| 备份带 BOM 解析失败 | `text.replace(/^\uFEFF/,'')` |
| 卸载/清除数据即丢全部数据 | 首次启动提示「建议开启坚果云备份」；设置页强化文案 |
| debug 包能装、release 包装不上 | release 必须签（第 8 节），否则 `unsigned` |
| 中文 APK 文件名在部分手机乱码 | 分发时重命名为 `mercury-plan-<version>.apk`，应用名仍为中文 |
| 模拟器用 x86_64 包、真机 arm64 | 发版用 universal 包，测试机按 ABI 选 |
| 桌面外观被移动样式污染 | 所有移动样式关在 `@media (max-width:760px), (pointer:coarse)` 里 |

---

## 12. 新工作区开场白（可直接复制）

> 把 `E:\Mercury_Plan` 的水星计划（Tauri 2，原生 HTML/CSS/JS，`ui/app.js` 约 3400 行）做成安卓版，施工方案在 `E:\Mercury_Plan\docs\android-施工方案.md`，严格按它执行。
>
> 硬约束：
> - 功能与 Windows 版**逐项对齐**（方案第 6 节 19 条），不许砍模块
> - Windows 导出的 JSON 备份必须能导入安卓，反之亦然（第 4 节兼容契约、第 7 节测试矩阵）
> - 不重写业务逻辑：`app.js` 只允许改「导出/导入的文件读写」+ 「返回键层栈」两处，其余原样
> - 桌面外观零改动：所有移动样式只写在 `ui/mobile.css` 的媒体查询里
> - WebDAV 五个命令必须 `async` + `spawn_blocking`，否则安卓抛 `NetworkOnMainThreadException`
> - `rfd` 必须用 `cfg(not(target_os = "android"))` 隔离
> - 先跑通 debug 包，再配签名出 release APK
>
> 每阶段结束按方案对应章节逐条报结果，不要用截屏反复验证。
