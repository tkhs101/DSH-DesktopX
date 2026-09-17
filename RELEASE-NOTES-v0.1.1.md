<div align="center">

<img src="https://raw.githubusercontent.com/tkhs101/DSH-DesktopX/master/docs/images/icon.png" width="96" alt="DSH-DesktopX">

# DSH-DesktopX v0.1.1

**把本机已经装好的 `dsh` 装进一个真正的桌面窗口。**

</div>

---

## 这一版改了什么

### 🎬 启动动画重做

旧版是黑底 + 细转圈的粗糙动画，本版换成与官方视觉一致的启动页：

- 白色圆角卡片 + 右上淡蓝光斑 + 底部三层浅蓝波浪
- 官方 `deepseek HARNESS` LOGO 居中
- 蓝色圆环 loading（圆头弧段，无接缝）
- 窗口从 `420x300` 黑框改为 `980x640` 无边框透明窗口

<img src="https://raw.githubusercontent.com/tkhs101/DSH-DesktopX/master/docs/images/splash.png" width="640" alt="启动动画">

### 🫥 不再挡视线

- **去掉 `alwaysOnTop`**：旧版启动动画强行置顶，挡住别的窗口又没法处理
- 新增右上角**最小化 `─`** 和**关闭 `✕`**（通过 preload + IPC 实现）
  - `─` 缩到任务栏，不挡事，切回来继续等
  - `✕` 取消启动，连刚拉起的 `dsh` 子进程一起干净退出
- 卡片可拖动

### ⚡ 澄清：没有「动画跑满才进软件」

代码里**没有任何倒计时、最小展示时长或人为延时**。流程是：

```
后端 stdout 出现 "dsh web: http://..."  →  立刻 loadURL  →  关掉启动动画
```

你觉得慢的那段时间，是 `dsh` 后端自己在启动（本机实测冷启动约 **23 秒**）。换回旧的黑底动画也一样要等这 23 秒。二次启动会明显快很多。

---

## 安装

### 1. 先装依赖

```powershell
# Node.js 22.19+ 或 24+
node --version

# 全局安装 DeepSeek Harness
npm i -g @deepseek-ai/dsh
dsh --version
```

### 2. 下载安装本版

下载下方 **`DSH-DesktopX.Setup.0.1.1.exe`**（89.7 MB）。

> ⚠️ **SmartScreen 蓝框是预期的**：本项目未签名（个人项目，不打算买证书）。点「更多信息」→「仍要运行」即可继续安装。这是所有新发布软件的正常流程。

- per-user 安装，**不需要管理员权限**
- 目录页显示裸路径（如 `C:\RUANJIAN`）时，安装时会**自动**进 `C:\RUANJIAN\DSH-DesktopX\` 子目录，不会散在外面
- 聊天记录/设置存在本机 `$DSH_HOME`，重装壳不受影响

### 3. 用法

| 操作 | 结果 |
|---|---|
| 双击桌面图标 | 启动动画 → 进 WebUI |
| 点窗口 X | 缩到托盘，**后端继续运行** |
| 点托盘图标 | 立刻把窗口拉回来 |
| 右键托盘 → 重启后端 | 重跑一次 `dsh web` |
| 右键托盘 → 彻底退出 | 停掉后端并退出 |
| 启动动画上的 `─` / `✕` | 最小化到任务栏 / 取消启动并退出 |

---

## 和 dsh-desktop 的关系

社区主流方案是 [anywhere-labs/dsh-desktop](https://github.com/anywhere-labs/dsh-desktop)。**它功能更全，本项目不是它的替代品**，定位不同：

| | DSH-DesktopX | dsh-desktop |
|---|---|---|
| 后端来源 | 跑你本机的 `dsh`，升级即生效 | 固定并内置上游版本 |
| 需要 Node.js | ✅ 需要（设计前提） | ❌ 不需要 |
| 平台 | Windows x64 | Windows + macOS |
| 安装包 | **89.7 MB** | 156 MB / 319 MB |
| 源码规模 | **218 行 TS** | 13,275 commits |
| 插件市场 / 手机远程 / 自动更新 | ❌ 都不做 | ✅ 都有 |
| 出网行为 | **零**（源码无任何 HTTP 调用） | 自动更新带版本/通道/随机安装 ID 请求头 |

**选我们的理由**：你已装 `dsh`、想要一个干净窗口、希望它尽可能小且不碍事、并且不想有任何外部网络请求。

**该选它的理由**：你不想装 Node.js、你用 macOS、你要插件市场/手机远程/自动更新、或你希望有社区长期维护。

完整对比与源码地图见 [README](https://github.com/tkhs101/DSH-DesktopX#为什么不选-dsh-desktop)。

---

## 已知限制

- **冷启动约 20s+**：等 `dsh` 后端就绪，属正常；二次启动快很多
- **仅 Windows x64**：macOS / Linux 未构建
- **未签名**：SmartScreen 会拦一次
- 端口被占用时自动换空闲端口，无需处理

## 依赖版本

- 已验证上游 `dsh 0.1.5-rc.1`
- Electron 38.8.6
- 若上游改了就绪行格式，只需改 `src/main/backend.ts` 的 `WEB_READY_RE`
