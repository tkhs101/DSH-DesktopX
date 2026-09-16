# DSH-DesktopX v0.1.0（首版）

Windows 桌面套壳：双击 → Splash“正在启动 DeepSeek Harness 后端…”→ 独立窗口进入本机 `dsh web`。**不打包后端、不修改上游**——后端就是你本机已装好的 `dsh`。

上游：https://github.com/deepseek-ai/deepseek-harness（已验证 `dsh 0.1.5-rc.1`）

## 前置依赖（必须先装）

1. Node.js 22.19+ 或 24+
2. `npm i -g @deepseek-ai/dsh`（`dsh --version` 能跑通）

找不到 `dsh` 时壳会弹中文错误页提示，不会白屏。

## 安装说明

1. 下载下方 `DSH-DesktopX Setup 0.1.0.exe`。
2. **SmartScreen 蓝框是预期的**（首版未签名）：点“更多信息”→“仍要运行”即可继续安装。这是所有新发布软件的正常流程，后续版本接免费签名后消除。
3. per-user 安装，无需管理员权限。选目录页显示的是裸路径（如 `C:\RUANJIAN`），**点安装后文件会自动进 `C:\RUANJIAN\DSH-DesktopX\` 子目录**，不会散在外面（目录页上有中文提示）。
4. 用法：双击图标 → Splash → 进 WebUI；点 X 缩到托盘（后端继续跑，点托盘图标秒开）；右键托盘 → 彻底退出。
5. 聊天记录/设置存在本机 `$DSH_HOME`，重装壳不受影响。

## 已知限制

- 首次冷启动需几十秒（等 dsh 后端就绪），属正常。
- 3080 被占用时自动换空闲端口，无需处理。
