# Baseline Governance

## 1. Baseline Roles
- Product / Requirement Baseline: 本会话确认的需求（B 路线 Electron 壳 + 本机后端 + 托盘常驻 + NSIS + unsigned 首版）、目标状态、验收标准、非目标。
- Architecture / Runtime Boundary Baseline: 壳只拥有进程生命周期+窗口+Splash；上游 dsh 拥有 agent/模型/存储一切；唯一契约 `dsh web --no-open --port 0` stdout 的 `dsh web: <url>` 行；Electron 与 dsh 无 ABI 耦合（分进程）。

## 2. Design Defect
需求/设计/基线本身的错误——先修基线，再对齐实现；不绕基线打补丁。

## 3. Implementation Drift
实现偏离已确认基线——用最小稳定路径回到基线；不“改基线去迎合漂移”。

## 4. Compatibility Aliases
- Architecture Defect = architecture-scoped Design Defect.
- Architecture Drift = architecture-scoped Implementation Drift.

## 5. Baseline Check Protocol
非平凡改动前：读本 INDEX 最新计划 → 对比需求验收与架构边界 → 报告 aligned / Design Defect / Implementation Drift / missing-authority / needs-clarification（+ scope）。

## 6. Architecture Review — 7 Dimensions
每次非平凡改动后：所有者唯一、模块边界、契约变更记录、级联控制、依赖方向、退役完整、熵不增。

## 7. Hard Boundaries
- 本文件是本工作区宪法，不自动更新，改动需用户评审。
- baseline/ 快照是证据，不是权威。
- 不复制上游文档，只引用链接。
