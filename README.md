<div align="center">

<img src="docs/images/icon.png" width="120" alt="DSH-DesktopX">

# DSH-DesktopX

**把本机已经装好的 `dsh` 装进一个真正的桌面窗口。**

双击图标 → 启动动画 → 进入 `dsh web`。不打包后端，不修改上游，不做多余的事。

[![Release](https://img.shields.io/github/v/release/tkhs101/DSH-DesktopX?label=release&color=3f8cff)](https://github.com/tkhs101/DSH-DesktopX/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-0078d4)](#-安装)
[![Source](https://img.shields.io/badge/source-218%20%E8%A1%8C%20TypeScript-2ea44f)](src)
[![Network](https://img.shields.io/badge/network-%E4%BB%85%20localhost-9aa4b2)](#-为什么不选-dsh-desktop)
[![Upstream](https://img.shields.io/badge/upstream-deepseek--harness-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

<img src="docs/images/splash.png" width="720" alt="DSH-DesktopX 启动动画">

<sub>启动动画：官方 LOGO + 蓝色圆环，后端就绪即刻进窗，无倒计时</sub>

</div>

---

## 它是什么

DSH-DesktopX 是一个 **Windows 桌面套壳**。它只做四件事：

1. 双击图标，弹出启动动画；
2. 用 `dsh web --no-open --port 0` 拉起**你本机已安装的** DeepSeek Harness 后端；
3. 从 stdout 抓出那行带 token 的 `http://127.0.0.1:<port>/?token=...`；
4. 把它装进一个独立窗口。关窗缩托盘，后端继续跑。

**后端就是你自己的 `dsh`**——你 `npm i -g` 升级到哪个版本，壳就跑哪个版本。壳不复制、不打包、不固定上游版本。

> 上游项目：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（本机已验证 `dsh 0.1.5-rc.1`）

## 特性

| | |
|---|---|
| 🪟 **独立窗口** | 不再是一堆浏览器标签页，有自己的任务栏图标和窗口 |
| 🎬 **启动动画** | 官方 LOGO + 圆环 loading，白卡片 + 浅蓝波浪，非黑底粗糙转圈 |
| 🫥 **不挡视线** | 启动动画**不置顶**，可拖动，右上角自带最小化 `─` / 关闭 `✕` |
| ⚡ **无倒计时** | 后端一就绪就进窗，动画不会拖时间（冷启动的等待来自 `dsh` 本身） |
| 📌 **托盘常驻** | 点 X 缩到托盘，后端继续跑；点托盘图标秒开 |
| 🔒 **零外部网络** | 源码里没有任何 `fetch`/`http` 调用，只连 `127.0.0.1` |
| 📖 **可审计** | 全部逻辑 5 个文件、约 218 行 TypeScript，几分钟读完 |
| 🧯 **失败不白屏** | 找不到 `dsh` 时弹中文错误页，直接告诉你装什么 |

## 安装

### 1. 先装依赖（必须）

```powershell
# Node.js 22.19+ 或 24+
node --version

# 全局安装 DeepSeek Harness
npm i -g @deepseek-ai/dsh
dsh --version
```

### 2. 再装壳

到 [Releases](https://github.com/tkhs101/DSH-DesktopX/releases) 下载 `DSH-DesktopX Setup x.y.z.exe`，双击安装。

> ⚠️ **SmartScreen 蓝框是预期的**：本项目未签名（个人项目，不打算买证书）。点「更多信息」→「仍要运行」即可。这是所有新发布软件的正常流程。

- per-user 安装，**不需要管理员权限**
- 目录页显示裸路径（如 `C:\RUANJIAN`）时，安装时会**自动**进 `C:\RUANJIAN\DSH-DesktopX\` 子目录
- 聊天记录/设置存在本机 `$DSH_HOME`，重装壳不受影响

### 3. 用法

| 操作 | 结果 |
|---|---|
| 双击桌面图标 | 启动动画 → 进 WebUI |
| 点窗口 X | 缩到托盘，**后端继续运行** |
| 点托盘图标 | 立刻把窗口拉回来 |
| 右键托盘 → 重启后端 | 重跑一次 `dsh web` |
| 右键托盘 → 彻底退出 | 停掉后端并退出（含子进程树） |
| 启动动画上的 `─` / `✕` | 最小化到任务栏 / 取消启动并退出 |

## 为什么不选 dsh-desktop

社区里最主流的选择是 [anywhere-labs/dsh-desktop](https://github.com/anywhere-labs/dsh-desktop)（27k stars，MIT，功能确实更全）。下面是**如实**对比，包括我们不如它的地方。

| 对比项 | **DSH-DesktopX**（本项目） | [anywhere-labs/dsh-desktop](https://github.com/anywhere-labs/dsh-desktop) |
|---|---|---|
| 定位 | 极简套壳：只管开窗 | 完整桌面端：插件生态 + 市场 + 远程 |
| 后端来源 | **跑你本机的 `dsh`**，你升级它就升级 | **固定并内置**上游版本（`deepseek-harness @ 0a15e36`） |
| 需要 Node.js / `dsh` | ✅ 需要（这是设计前提） | ❌ 不需要，下载即用 |
| 平台 | Windows x64 | Windows x64 + macOS Universal |
| 安装包 | **89.7 MB** | 156 MB（x64 Setup）/ 319 MB（dmg） |
| 源码规模 | **218 行 TS / 5 文件** | 13,275 commits，Yarn workspace + 子模块 + 插件 fabric |
| 自动更新 | ❌ 不做，手动下新版 | ✅ 内置 |
| 插件市场 | ❌ 不做 | ✅ 内置 DSH Community Market |
| 手机远程控制 | ❌ 不做 | ✅ iOS / Android 内置（2.0.9+） |
| 终端 / 局域网访问 / Setup Wizard | ❌ 不做 | ✅ 都有 |
| 出网行为 | **零**：源码无任何 HTTP 调用 | 自动更新会带 `X-DSH-Desktop-Version`、`Channel`、`Installation-Id`(随机 UUID) 请求头 |
| 社区 | 个人项目，无社区 | 27k stars、Discord、QQ 群、赞助商 |

### 我们选择它的理由

**1. 你的 `dsh` 永远是最新的，不需要等壳发版。**
dsh-desktop 固定内置某个上游版本——上游修了 bug、加了能力，你得等它同步 + 发版才能用上。本项目 `npm i -g @deepseek-ai/dsh` 一升级，下次启动就是新版。对 `dsh` 这种还在 developer preview、迭代很快的项目，这一点很关键。

**2. 不重复一份 Node 运行时 + 一份后端。**
dsh-desktop 156 MB 里装着一整套固定上游；我们 89.7 MB 里只有 Electron 运行时和 218 行胶水代码。你机器上本来就有 `dsh`，没必要再来一份。

**3. 零出网，源码能读完。**
全部逻辑 5 个文件：`backend.ts` 拉进程 + 解析 URL、`windows.ts` 建窗、`index.ts` 串流程、`tray.ts` 托盘、`preload.ts` 两个 IPC。源码里没有任何 `fetch`/`http` 调用，只连 `127.0.0.1`。dsh-desktop 的自动更新会带安装 ID 请求头——那是它的合理设计，但如果你就是不想要任何外部请求，本项目更干净。

**4. 没有你不需要的攻击面。**
插件市场、手机远程控制、局域网访问（dsh-desktop 自己文档里明确警告：局域网开放不提供鉴权）——功能越多，可被利用的面越大。本项目**只有**「开窗 + 托盘」两件事，其余全在「非目标」清单里。

**5. 出问题你能自己修。**
218 行 TypeScript，读一遍就知道 `dsh web:` 那行正则在哪（`src/main/backend.ts`）。上游改了就绪行格式，改一行正则就行。

### 你应该选 dsh-desktop 的情况

说清楚边界，不硬吹：

- 你**不想装 Node.js**，想下载就双击用 → 选它，这是它的核心优势；
- 你用 **macOS** → 目前只有它支持；
- 你要**插件市场 / 手机远程控制 / 自动更新 / 内置终端** → 选它，这些本项目明确不做；
- 你需要**固定可复现的上游版本**（团队统一环境）→ 它的固定版本策略反而更合适；
- 你希望有**社区和长期维护** → 27k stars 的项目比个人项目靠谱。

本项目适合的是：**已经装了 `dsh`、想要一个干净窗口、并且希望这个窗口尽可能小、尽可能透明、尽可能不碍事**的人。

## 开发

```sh
npm install
npm run dev     # 构建 + 启动 Electron（会真实 spawn 本机 dsh）
npm run smoke   # 启动探针：真实起后端，180s 内抓到就绪行则 pass
npm run pack    # 打 NSIS 安装包（unsigned），产物在 release/
```

### 源码地图

| 文件 | 行数 | 职责 |
|---|---|---|
| `src/main/backend.ts` | 85 | spawn `dsh web`、解析就绪行、超时/退出处理、优雅停服 |
| `src/main/index.ts` | 61 | 应用启动、单实例锁、IPC、错误页兜底 |
| `src/main/windows.ts` | 36 | 主窗口 + 启动窗口创建、外链拦截、标题锁定 |
| `src/main/tray.ts` | 25 | 托盘菜单 |
| `src/preload/preload.ts` | 11 | `hideWindow` / `minimizeSplash` / `closeSplash` / `appVersion` |
| `assets/splash.html` | — | 启动动画（纯 HTML/CSS/SVG，无框架无依赖） |

### 上游兼容性

就绪行契约：stdout 出现 `dsh web: http://127.0.0.1:<port>/?token=<token>` 即视为就绪。

- 已验证：`dsh 0.1.5-rc.1`
- 上游若改了这行格式，只需改 `src/main/backend.ts` 里的 `WEB_READY_RE`。

## 非目标

自动更新、插件市场、手机远程、局域网共享、内置终端、多后端、记住关窗选择——**都不做**。

## 声明

本项目是**独立的社区套壳**，与深度求索（DeepSeek）不存在隶属、合作、授权或背书关系。「DeepSeek Harness」是深度求索公司的注册商标，此处仅用于说明兼容性与技术来源。核心智能体能力、Web UI、插件系统均来自[上游项目](https://github.com/deepseek-ai/deepseek-harness)。

## License

MIT
