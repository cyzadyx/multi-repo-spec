---
name: msdd-test
description: 为 msdd 变更生成测试设计（主仓库）和具体测试用例（子仓库）。当用户想要从需求产物创建测试用例设计、在子仓库生成 story-test 用例或将测试执行接入 story-task 时使用。
allowed-tools: Bash(msdd:*)
license: MIT
compatibility: Requires msdd CLI.
metadata:
  author: msdd
  version: "1.0"
---

基于主仓 requirement-* 产物生成测试设计与测试用例。
本项目主仓 schema 为 multi-repo，本流程新增主仓产物 `requirement-test-design.md`（测试用例设计：测试范围/维度/子仓职责，**不含具体用例内容**）；子仓 schema 为 story-driven，新增子仓产物 `story-test.md`（具体用例内容）。
**存储选择：** 如果用户指定了存储，请运行 `msdd store list --json` 并在读取或写入规范和变更的命令上传递 `--store <id>`。如果没有存储，命令将作用于最近的本地 `msdd/` 根目录。

**输入**：主仓变更名称（例如 `/opsx-test add-user-auth`）。默认从上下文推断；无法推断时使用 `msdd list --json` 列出可用变更让用户选择。
**前置条件**
- 主仓变更的 requirement-design.md 已存在（否则提示先运行 `/opsx-propose`）。
- 涉及的子仓变更已由 `/opsx-apply` 创建（子仓变更不存在时停止该仓并提示先运行 `/opsx-apply`，不自动初始化）。

**步骤**

1. **选择变更** - 使用与 /opsx-apply 相同的选择规则；宣布"正在使用变更：<name>"

2. **读取上下文文件**

   读取主仓变更的 requirement-proposal.md、specs/（若有）、requirement-design.md。
   requirement-design.md 中回填的「子仓变更」决定要处理哪些子仓；某 story 的子仓 change 为空则该仓跳过并提示先运行 `/opsx-apply`。
3. **创建主仓测试设计**

   ```bash
   msdd instructions test-design --change "<name>" --json
   ```

   用 `template` 和 `instruction` 写 requirement-test-design.md（resolvedOutputPath）：
   - 测试范围 / 测试维度（测试点，标注关联 Requirement）
   - 子仓测试职责（与 story 一一对应）
   - 环境与数据 / 风险
   - **硬性边界：不写具体用例**——不出现测试步骤、期望结果、用例表。
   - 写完后用 `msdd status --change "<name>" --json` 确认 test-design 为 done。

4. **创建子仓测试用例（逐子仓）**

   对每个涉及子仓（在其目录下执行）：
   a. 确认子仓变更存在（`msdd list`），不存在则提示先运行 `/opsx-apply`。
   b. ```bash
      msdd instructions story-test --change "<子仓change名>" --json
      ```
   c. 读取主仓 requirement-test-design.md「子仓测试职责」分配给该仓的测试点 +
      子仓 story-design.md（需求输入/验收要点），用 `template` 写子仓 story-test.md。
      - 用例字段齐全：编号 TC-<模块>-<序号>、模块、优先级（P0/P1/P2）、前置条件、步骤、期望结果、来源
      - 逐条覆盖分配给该仓的测试点，来源列标注；本仓特有用例来源填"补充"。
      - 文末维护「覆盖对照」（主仓测试点 ↔ 用例编号）。
   d. **更新子仓 story-task.md 的「测试执行」任务组**：确保按 story-test.md 用例分组建立可勾选执行任务（例如 `- [ ] N.1 执行 <模块> 用例 TC-xx-01 ~ TC-xx-09 并记录结果`）；
      已有粗粒度测试任务则细化为用例级，缺失则追加；不改动其他任务。

5. **显示最终状态** - 主仓 `msdd status`；汇总各子仓用例数与任务更新情况。

**输出**

- 主仓 requirement-test-design.md 路径与测试点数量
- 各子仓 story-test.md 路径与用例数（含补充用例数）
- 各子仓 story-task.md 测试执行任务更新情况
- 提示：测试执行任务随实施在 `/opsx-apply` 中勾选。

**防护栏**
- requirement-test-design.md 严禁出现具体用例步骤/期望；具体用例只写在子仓 story-test.md。
- 子仓用例必须逐条对应主仓测试点（来源列），不得凭空扩大测试范围。
- 不修改主仓 specs/requirement-design.md 与子仓 story-design.md 的既有内容；
  子仓 story-task.md 仅允许追加/细化「测试执行」任务组。
- 子仓变更不存在时不自动初始化，提示先运行 `/opsx-apply`。
- 使用 CLI 返回的 resolvedOutputPath，不要假设文件路径。