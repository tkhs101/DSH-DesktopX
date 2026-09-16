# DSH-DesktopX

Windows 桌面套壳：双击 EXE → 显示“正在启动 DeepSeek Harness 后端…”→ 独立窗口进入本机 `dsh web`。**不打包后端、不修改上游**——后端就是你本机已装好的 `dsh`，壳只负责启动它、读出带 token 的 URL、装进独立窗口。

对应上游：https://github.com/deepseek-ai/deepseek-harness

## 已验证 DSH 版本

- `dsh 0.1.5-rc.1`（2026-09-16 本机实测 `dsh web --no-open --port 0` 就绪行格式）
- 上游为 developer preview，若后续版本改了 `dsh web:` 行格式，只需改 `src/main/backend.ts` 的正则。

## 前置依赖（用户机器必须有）

1. Node.js 22.19+ 或 24+（`node --version`）
2. 全局 dsh：`npm i -g @deepseek-ai/dsh`（`dsh --version` 能跑通）

找不到 `dsh` 时壳会弹中文错误页提示安装，不会白屏。

## 开发

```sh
npm install
npm run dev     # 构建 + 启动 Electron（会真实 spawn 本机 dsh）
npm run smoke   # 启动探针：真实起后端，180s 内抓到 URL 行则 pass
npm run pack    # 打 NSIS 安装包（unsigned），产物在 release/
```

## 安装包说明（unsigned 首版）

- 首版未签名：Windows SmartScreen 会弹蓝框 → 点“更多信息”→“仍要运行”即可安装。这是新软件的正常流程，后续版本接免费签名（SignPath）后消除。
- 安装为 per-user，无需管理员权限。
- 用法：安装后双击桌面图标 → Splash → 进 WebUI；点 X 缩到托盘（后端继续跑）；右键托盘 → 彻底退出。
- 聊天记录/设置存在你本机的 `$DSH_HOME`，重装壳不受影响。

## 非目标

自动更新、LAN 共享、插件管理、多后端、记住关窗选择——都不做。
