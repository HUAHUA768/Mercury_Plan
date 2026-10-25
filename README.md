# 水星计划

水星计划是一个基于 Tauri 2 的 Windows 桌面应用。前端使用原生 HTML、CSS 和 JavaScript，数据首版保存在本机 WebView2 的 `localStorage` 中。

## 功能

- 今日总览：日程、琐事、今日焦点和习惯打卡
- 日程待办：日视图、清单视图、自然语言添加、完成撤销和逾期处理
- 目标拆解：多层级目标树、进度汇总和排入今日
- 我的项目：项目卡片、下一步行动和详情抽屉
- 习惯：养成、戒除、补卡、连续天数和最长纪录
- 心愿清单、琐事记录和成就时间轴
- 回收站、撤销删除和快捷键操作

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
Mercury_Plan/
├── ui/                     # HTML、CSS、JavaScript 前端
├── assets/                 # 图标源素材
├── icons/                  # Tauri 打包图标
├── src-tauri/              # Rust/Tauri 后端和打包配置
├── package.json            # Node/Tauri CLI 依赖
├── package-lock.json       # Node 依赖锁文件
├── rust-toolchain.toml     # Rust 工具链要求
└── README.md
```

## 许可证

本仓库当前未声明开源许可证。若要公开发布，请在仓库根目录补充 `LICENSE` 文件并明确许可协议。
