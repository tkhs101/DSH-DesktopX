<div align="center">

<img src="https://raw.githubusercontent.com/tkhs101/DSH-DesktopX/master/docs/images/icon.png" width="96" alt="DSH-DesktopX">

# DSH-DesktopX v0.1.2

**启动更快，退出更干净。**

</div>

---

## 这一版改了什么

### ⚡ 启动更快（冷启动约 −0.8s）

本机实测端到端启动 `~10.1s → ~9.3s`（后端就绪到窗口可见）：

- **后端与 Electron 初始化并行**：以前 `startBackend()` 要等 `app.whenReady()` + 建窗 + 托盘全部做完才起 `dsh`；现在模块加载即起，后端 9 秒多的启动过程与壳初始化重叠（~0.18s）
- **首绘即进窗，不再等满载**：以前 `loadURL` 要等 `did-finish-load` 才 `show()` 关启动动画；现在 `ready-to-show`（首帧可绘）就进窗（~0.65s），另有 15s 兜底防止页面卡死时困在启动动画
- **直调 `node`，免掉 `cmd.exe` 中转**：`resolveDshEntry()` 沿 PATH 找到 `dsh.cmd` 旁边的真实 `lib/bin.js`，`CreateProcess` 直接起（省一次 console-host 跳转，~0.05–0.13s）；找不到时自动回退旧 shim 路径

诚实说明：剩下的 ~9.3s 几乎全是 `dsh` 后端自己的启动成本（shipped base+web-app ~6.5s + 第三方插件 ~3.4s），壳能挤的已经挤完。进一步加速要动上游或裁剪插件，见「已知限制」。

### 🧯 修了一个进程泄漏：重启/退出不再丢孤儿后端

- 根因：`stopBackend` 杀的是 `cmd.exe` 包装进程——实测包装器 2ms 就退出，**真正的 node 后端变成孤儿继续跑**（每个 ~150–230MB + 占 3 个端口），且旧逻辑"包装器已退出"就判定成功，连兜底 `taskkill` 都跳过
- 修复：直调 node 后 `child` 本来就是真后端；`stopBackend` 改为 `taskkill /T /F` 整树带走（Windows 的 kill 本来就是 forceful，不丢优雅度）
- 附带：排查时在测试机上发现并清理了 19 个历史遗留孤儿后端（含本轮测量探针产生的）

### 📏 新增启动探针

- `npm run` 外新增 `scripts/measure-startup.mjs`：给 `dsh web` 就绪行打时间戳，可复测启动耗时

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

下载下方 **`DSH-DesktopX.Setup.0.1.2.exe`**（~90 MB）。

> ⚠️ **SmartScreen 蓝框是预期的**：本项目未签名（个人项目，不打算买证书）。点「更多信息」→「仍要运行」即可继续安装。这是所有新发布软件的正常流程。

- per-user 安装，**不需要管理员权限**
- 目录页显示裸路径（如 `C:\RUANJIAN`）时，安装时会**自动**进 `C:\RUANJIAN\DSH-DesktopX\` 子目录，不会散在外面
- 聊天记录/设置存在本机 `$DSH_HOME`，重装壳不受影响

### 3. 用法

| 操作 | 结果 |
|---|---|
| 双击桌面图标 | 启动动画 → 进 WebUI（比 0.1.1 快约 0.8s） |
| 点窗口 X | 缩到托盘，**后端继续运行** |
| 点托盘图标 | 立刻把窗口拉回来 |
| 右键托盘 → 重启后端 | 重跑一次 `dsh web`（旧后端整树杀干净，不再残留） |
| 右键托盘 → 彻底退出 | 停掉后端并退出（无孤儿进程） |
| 启动动画上的 `─` / `✕` | 最小化到任务栏 / 取消启动并退出 |

---

## 已知限制

- **冷启动约 9s+**：等 `dsh` 后端就绪，属正常。本轮实测：shipped base+web-app ~6.5s，第三方 bundle（bridge-browser / workbuddy-connect / agent-teams / pocket / browserskill / modsearch / rewind / aegis）再 +~3.4s
- 想更快：裁剪不用的第三方 bundle（每砍一个省几百 ms）；修好 home 层 `hindsight` 插件的 401；上游 `0.1.6-alpha.1`（bootfast2）在本机实测**更慢**，暂不建议跟进
- **仅 Windows x64**：macOS / Linux 未构建
- **未签名**：SmartScreen 会拦一次
- 端口被占用时自动换空闲端口，无需处理

## 依赖版本

- 已验证上游 `dsh 0.1.5-rc.1`
- Electron 38.8.6
- 若上游改了就绪行格式，只需改 `src/main/backend.ts` 的 `WEB_READY_RE`
