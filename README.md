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
- 多设备同步：通过坚果云 WebDAV 在 Windows 与 Android 之间按条目合并数据，自动上传、自动拉取，两端内容互不覆盖
- 切换数据源（测试用）：一键清空本机并载入演示数据，或清空后从云端整份重建，方便双端测试时在测试数据与真实数据间来回切换

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

数据保存在当前 Windows 用户的 WebView2 本地存储中；配置坚果云后会与云端同步库交换数据。清除应用数据或清空本机数据前，请先导出备份。

### 导出与导入备份

打开「设置」，点击「导出备份」即可通过系统下载流程生成 JSON 备份文件；文件通常会保存到当前 Windows 用户的“下载”目录。备份包含全部任务、目标、项目、习惯、日常记录、兴趣、心愿、琐事、成就、备忘录、回收站数据及当前主题。

「导入备份」会先校验文件格式，再经二次确认后完整覆盖当前数据；导入无效文件或取消确认不会修改现有数据。导入成功后会恢复备份中的主题设置。

### 多设备同步（坚果云）

在「设置 → 多设备同步」填写坚果云账号（注册邮箱）和**应用密码**（登录坚果云网页版 → 账户信息 → 安全选项 → 添加应用密码生成），点「测试连接」确认可用后点「同步云端」。

电脑版和手机版共用同一份云端同步库 `/MercuryPlan/sync.json`，同步不会整包覆盖，而是按条目合并：

- 每条记录都带修改时间，云端独有、本机独有的内容都会保留，互不覆盖
- 同一件事两端都改过，以较新的改动为准
- 删除会记录墓碑，不会因为另一台设备还有旧副本而复活
- 习惯打卡按日期取并集，日常记录、兴趣记录、心愿子项按条目并集，两端记的都留着

自动同步默认开启：改动停下 6 秒后自动上传，打开应用时自动拉一次；之后窗口可见时每 60 秒、隐藏时每 3 分钟各拉一次，窗口重新获得焦点或发生点击、按键操作时再补拉一次（45 秒退避，刚同步过 60 秒内不重复）。窗口隐藏不会停止拉取，只是把间隔拉长。坚果云免费账户对 WebDAV 有频率限制，因此两次自动同步至少间隔 20 秒。

自动同步的前提是已填写账号和应用密码。刚安装、从未改动过的演示数据不会上传；新增或修改任何一条内容后，数据就转为正式数据，从此照常自动同步（也不会再每天重置演示数据）。

同步状态是可见的：

- 底部状态栏右侧显示「N 条待上传」→「云端已同步」，失败时显示「云端同步失败」
- 备忘录列表里每条笔记的时间旁边有小图标：转圈表示等待上传，云勾表示已传上云端；未配置账号时不显示
- 自动同步失败会弹一次提示（同一分钟内不重复），设置页「上次同步」也会显示失败原因

手动操作：

- 「同步云端」：立即拉取 → 合并 → 写回本机 → 合并结果回传云端
- 「云端记录」：列出云端的历史备份快照，可对某一份「合并」（补入云端独有内容，不丢本机数据）、「覆盖」（整包替换，需二次确认）或「删除」
- 「备份快照」：额外在云端留一份带时间戳的完整 JSON（`mercury-plan-backup-*.json` 和 `latest.json`）

应用密码只保存在本机 localStorage，不会随备份数据上传。

### 切换数据源（测试用）

Windows 与 Android 双端联调时，常要在真实数据和测试数据之间反复切换。「设置 → 切换数据源（测试用）」提供两个一键入口，两者都会清空本机全部数据（待办、目标、项目、习惯、日常记录、兴趣、心愿、琐事、成就、备忘录、回收站及墓碑）和同步标记（`mercury.sync.marks`、`mercury.sync.before`、`mercury.sync.at`），但**不改动坚果云上的任何文件，也保留账号、应用密码和主题设置**。操作前有二次确认，且不可撤销，重要数据请先「导出备份」。

| 入口 | 用途 | 清空后的行为 | 自动同步 |
| --- | --- | --- | --- |
| 载入演示数据 | 开始一轮测试 | 重载进入一组演示数据 | 自动关闭，避免几秒后又被云端数据合并回来 |
| 从云端重建 | 测完回到真实数据 | 以空数据启动，随后静默同步把云端内容整份拉回 | 保持开启 |

典型流程：点「载入演示数据」→ 造测试数据、双端验证 → 点「从云端重建」→ 本机恢复成云端的真实数据。原来的「重置演示数据」按钮已被这两个入口取代（它不清同步标记、也不关自动同步，清完很快会被云端拉回来）。

几点限制：

- 「从云端重建」的来源是最后一次同步写下的 `/MercuryPlan/sync.json`，不是历史快照；想回更早的版本请用「云端记录」挑一份备份
- 账号未配置、或云端还没有 `sync.json` 时，点它只会得到空数据，不要在这种情况下使用；本机尚未上传的改动会被直接丢弃，这正是该按钮的用途
- 「载入演示数据」会关掉自动同步；若要做双端互通测试，需手动重新打开，此时测试数据会写入云端
- 若希望测试数据完全不进云端，可以另配一个测试用的云端文件夹，目前界面上尚未提供这个开关

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
