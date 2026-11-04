# 水星计划

水星计划是一个基于 Tauri 2 的 Windows 桌面应用。前端使用原生 HTML、CSS 和 JavaScript，数据首版保存在本机 WebView2 的 `localStorage` 中。

## 功能

- 今日总览：日程、琐事、今日焦点和习惯打卡
- 日程待办：日视图、清单视图、自然语言添加、完成撤销和逾期处理
- 目标拆解：多层级目标树、进度汇总和排入今日
- 我的项目：项目卡片、下一步行动和详情抽屉
- 习惯：养成、戒除、补卡、连续天数和最长纪录
- 日常记录：周期重复的事项，每次做完追加一条记录（哪天做的必填，预计下次可选）
- 兴趣爱好：爱好卡片、热爱程度、每次投入记一笔（日期、时长、感想）和全部记录
- 心愿清单：想要程度、预算，可以拆成子项一步步行进（子项进度自动统计）
- 琐事记录和成就时间轴
- 备忘录：Markdown 笔记，左列表右正文，编辑器带实时预览
- 回收站、撤销删除和快捷键操作
- 用户数据备份：从设置中导出或导入 JSON 备份
- 坚果云云备份：通过坚果云 WebDAV 上传、恢复和删除云端备份

## 运行环境

当前正式支持 Windows 10/11 x64。

### 必需依赖

| 依赖 | 要求 | 用途 |
| --- | --- | --- |
| Node.js | 20 或更高版本 | 安装并运行 Tauri CLI |
| npm | 随 Node.js 安装 | 管理前端开发依赖 |
| Rust | stable，MSVC 工具链 | 编译 Tauri 后端 |
| Visual Studio Build Tools | Desktop development with C++ 工作负载 | Windows 原生编译链接 |
| WebView2 Runtime | Windows 10/11 通常已预装 | 渲染前端界面 |

项目通过 [`package.json`](./package.json)、[`package-lock.json`](./package-lock.json)、[`src-tauri/Cargo.toml`](./src-tauri/Cargo.toml) 和 [`src-tauri/Cargo.lock`](./src-tauri/Cargo.lock) 声明并锁定依赖。Rust 工具链要求写在 [`rust-toolchain.toml`](./rust-toolchain.toml) 中。本项目不使用 Python，因此不提供 `requirements.txt`。

### 安装 Rust

在 PowerShell 中执行：

```powershell
winget install --exact --id Rustlang.Rustup --accept-source-agreements --accept-package-agreements
rustup default stable-msvc
```

安装后验证：

```powershell
rustc --version
cargo --version
```

如果 PowerShell 找不到 `cargo`，先为当前窗口临时补充 PATH：

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
```

如需永久加入当前用户 PATH，执行一次以下命令，然后重新打开 PowerShell：

```powershell
$cargoBin = "$env:USERPROFILE\.cargo\bin"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($userPath -notlike "*$cargoBin*") {
    [Environment]::SetEnvironmentVariable("Path", "$cargoBin;$userPath", "User")
}
```

### 安装 Visual Studio Build Tools

如果构建时提示找不到 `cl.exe` 或 MSVC linker，请安装 Visual Studio Build Tools，并勾选：

- Desktop development with C++
- MSVC v143 或更新版本
- Windows 10/11 SDK

安装完成后重启终端再构建。

## 开发

克隆项目并进入目录：

```powershell
git clone https://github.com/HUAHUA768/Mercury_Plan.git
cd Mercury_Plan
```

安装 Node 依赖：

```powershell
npm install
```

启动开发窗口：

```powershell
npm run dev
```

开发模式会自动编译 Rust 后端并打开 Tauri 窗口。前端源文件位于 [`ui/`](./ui)，修改后会触发开发更新。

## 构建发布版

```powershell
npm run build
```

构建产物：

- 绿色版：`src-tauri/target/release/mercury-plan.exe`
- NSIS 安装包：`src-tauri/target/release/bundle/nsis/水星计划_0.1.0_x64-setup.exe`

安装包使用 `currentUser` 模式，不要求管理员权限。应用图标由 [`assets/icon-256.png`](./assets/icon-256.png) 生成到 [`icons/`](./icons)，并编译进 exe：

```powershell
npx tauri icon assets\icon-256.png -o icons
```

## Android 版

将本项目编译为安卓 APK（Tauri 2 mobile）。除桌面依赖外，还需要：

| 依赖 | 本项目使用的版本 |
| --- | --- |
| Android SDK | Platform 37、Build-Tools 37.0.0、Platform-Tools |
| Android NDK | 27.0.12077973 |
| JDK | 17+（本机用 Temurin 21） |
| Rust Android 目标 | `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android` |

环境变量 `ANDROID_HOME`、`NDK_HOME` 需指向 SDK/NDK 目录。

### 构建命令

```powershell
# release 签名包（每次构建前自动把版本号 patch +1）
npm run android:apk

# 不动版本号重新构建
npm run android:apk:keep

# debug 包（可直接 adb 安装，无需签名配置）
npx tauri android build --apk --debug
```

### APK 输出目录

| 包类型 | 路径（相对项目根） |
| --- | --- |
| release（universal，含全部 4 种 ABI） | `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk` |
| debug（universal） | `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk` |
| debug（arm64 单架构） | `src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk` |

发给别人安装时建议把 APK 重命名为 `mercury-plan-<版本号>.apk`，避免中文文件名在部分手机上乱码。

### 安装与升级

```powershell
adb install -r "src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk"
```

- release 包使用项目自有的签名密钥，之后所有版本都用同一把密钥才能覆盖升级；**密钥丢失则无法升级**，只能卸载重装（本地数据会丢，请先导出备份）
- 从 debug 包切换到 release 包（或反过来）签名不同，必须先卸载再安装
- 签名配置在 [`src-tauri/gen/android/keystore.properties`](./src-tauri/gen/android/keystore.properties)，密钥库文件在 [`keystore/`](./keystore)（含「密钥信息-务必备份.txt」），两者均已被 `.gitignore` 排除，不会提交进 Git

### 国网络环境注意

`dl.google.com` 直连不稳，仓库已在 `src-tauri/gen/android/build.gradle.kts` 的 repositories 里优先配置了阿里云镜像（google/public/gradle-plugin）。如果换网络后依赖解析失败，优先检查镜像与代理设置，不要往 `~/.gradle/gradle.properties` 里写临时代理后忘记删。

## 发布到 GitHub Releases

每次发布新版本时，先更新 [`src-tauri/tauri.conf.json`](./src-tauri/tauri.conf.json) 中的 `version`，然后重新构建：

```powershell
npm install
npm run build
```

在 GitHub 的 **Releases** 页面创建与版本号一致的 Tag，例如 `v0.1.0`，并上传：

| 文件 | 用途 |
| --- | --- |
| `水星计划_0.1.0_x64-setup.exe` | 推荐下载的 Windows 安装包 |
| `mercury-plan.exe` | 可选的免安装绿色版 |

这两个文件位于 `src-tauri/target/release/` 及其 `bundle/nsis/` 子目录。`target/` 已被 `.gitignore` 忽略，因此发布文件应作为 Release 附件上传，不要提交到 Git 仓库。发布说明中建议写明版本变化、系统要求和已知问题。

## 数据与隐私

首版数据只保存在当前 Windows 用户的 WebView2 本地存储中，不上传到服务器。清除应用数据或重置演示数据会影响本机数据，请先自行备份。

### 导出与导入备份

打开「设置」，点击「导出备份」即可通过系统下载流程生成 JSON 备份文件；文件通常会保存到当前 Windows 用户的“下载”目录。备份包含全部任务、目标、项目、习惯、日常记录、兴趣、心愿、琐事、成就、备忘录、回收站数据及当前主题。

「导入备份」会先校验文件格式，再经二次确认后完整覆盖当前数据；导入无效文件或取消确认不会修改现有数据。导入成功后会恢复备份中的主题设置。

### 坚果云云备份

在「设置 → 坚果云云备份」填写坚果云账号（注册邮箱）和**应用密码**（登录坚果云网页版 → 账户信息 → 安全选项 → 添加应用密码生成），点「测试连接」确认可用后，即可「备份到坚果云」或从「云端记录」中恢复/删除备份。

- 备份文件保存在坚果云的 `/MercuryPlan/` 文件夹：每次备份生成一份带时间戳的 JSON，并同步覆盖一份 `latest.json`
- 应用密码只保存在本机 localStorage，不会随备份数据上传
- 坚果云免费账户对 WebDAV 有流量和请求次数限制，正常手动备份足够使用

## 权限标签故障排查

如果 Windows 资源管理器显示 exe 或快捷方式图标为空白，先检查项目目录的完整性标签：

```powershell
$projectRoot = (Get-Location).Path
icacls (Join-Path $projectRoot "assets\mercury.ico")
```

如果输出包含 `Low Mandatory Level`，请使用**管理员 PowerShell**执行：

```powershell
$projectRoot = (Get-Location).Path
icacls $projectRoot /setintegritylevel Medium /T /C
```

再次检查时应显示 `Medium Mandatory Level`，且不应再出现 `Low Mandatory Level`。这只是修复目录权限标签；应用本身仍通过 exe 内嵌图标工作，不依赖外部快捷方式图标文件。

## 项目结构

```text
Mercury_Plan_Android/
├── ui/                     # HTML、CSS、JavaScript 前端（含移动端适配 mobile.css）
├── assets/                 # 图标源素材
├── icons/                  # Tauri 打包图标
├── keystore/               # Android 签名密钥（不入库，务必备份）
├── scripts/                # 构建辅助脚本（版本号自增等）
├── src-tauri/              # Rust/Tauri 后端和打包配置
│   └── gen/android/        # Tauri 生成的 Android 工程（gradle、Manifest、图标）
├── package.json            # Node/Tauri CLI 依赖与构建命令
├── package-lock.json       # Node 依赖锁文件
├── rust-toolchain.toml     # Rust 工具链要求
└── README.md
```

## 许可证

本仓库当前未声明开源许可证。若要公开发布，请在仓库根目录补充 `LICENSE` 文件并明确许可协议。
