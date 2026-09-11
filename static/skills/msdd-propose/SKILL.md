---
name: msdd-propose
description: 一次性生成所有产物来提议一个新变更。当用户想快速描述他们想要构建的内容，并获得包含设计、规范和任务的完整提案以供实现时使用。
allowed-tools: Bash(msdd:*)
license: MIT
compatibility: Requires msdd CLI.
metadata:
  author: msdd
  version: "1.0"
  generatedBy: "1.7.0"
---

提议一个新变更 - 一步创建变更并生成所有产物。

我将创建一个包含你的模式定义的产物的变更。本项目主仓 schema 为 multi-repo，产物为：
- requirement-proposal.md（msdd 原生格式：Why/What Changes/Capabilities/Impact）
- `specs/<capability>/spec.md`（全局/跨仓行为契约 delta）
- requirement-design.md（story-design，按子仓拆分，不含代码设计）

主仓无 tasks；实施任务在子仓产生。另有 test-design 产物（requirement-test-design.md，测试用例设计），由 /opsx-test 单独生成，不随本流程产生。
当准备实现时，运行 /opsx-apply ，/opsx-apply 会按 story 到各子仓初始化 msdd（story-driven schema）并创建 change 骨架（story-task 在子仓产生）。
---

**存储选择：** 如果用户指定了存储（存储是在此机器上注册的独立 msdd 仓库）或工作在其中一个存储中，请运行 `msdd store list --json` 来发现已注册的存储 ID，然后在读取或写入规范和变更的命令（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）上传递 `--store <id>`。其他命令不接受该标志。命令打印的提示已经包含该标志；在后续操作中保持它。如果没有存储，命令将作用于最近的本地 `msdd/` 根目录。

**输入**：用户的请求应包含变更名称（kebab-case）或他们想要构建的内容的描述。

**步骤**

1. **如果未提供明确输入，询问他们想要构建什么**

   询问用户（开放式，无预设选项）：
   > "你想要处理什么变更？描述你想要构建或修复的内容。"

   从他们的描述中，派生一个 kebab-case 名称（例如，"add user authentication" → `add-user-auth`）。

   **重要**：在理解用户想要构建什么之前不要继续。

2. **创建变更目录**
   ```bash
   msdd new change "<name>"
   ```
   这会在 CLI 解析的规划主目录中创建一个带有 `.msdd.yaml` 的脚手架变更。

3. **获取产物构建顺序**
   ```bash
   msdd status --change "<name>" --json
   ```
   解析 JSON 以获取：
   - `applyRequires`：实现前需要的产物 ID 数组（例如 `["tasks"]`）
   - `artifacts`：所有产物的列表，每个都有其 `status` 和其 `requires` 边（它直接依赖的产物 ID）
   - `planningHome`、`changeRoot`、`artifactPaths` 和 `actionContext`：路径和范围上下文。使用这些而不是假设仓库本地路径。

4. **在必需集合中创建每个产物**

   使用待办事项列表跟踪产物进度。

   按依赖顺序循环处理产物（没有未完成依赖的产物优先）：

   a. **对于每个状态为 `ready`（依赖已满足）的产物**：
      - 获取指令：
        ```bash
        msdd instructions <artifact-id> --change "<name>" --json
        ```
      - 指令 JSON 包括：
        - `context`：项目背景（对你的约束 - 不要包含在输出中）
        - `rules`：产物特定规则（对你的约束 - 不要包含在输出中）
        - `template`：用于输出文件的结构
        - `instruction`：此产物类型的特定模式指导
        - `skipped`/`warning`：当变更声明 skip_specs 且此产物不得创建时存在 - 停止并选择另一个产物
        - `resolvedOutputPath`：用于写入产物的解析路径或模式
        - `dependencies`：要读取以获取上下文的已完成产物
      - 读取任何已完成的依赖文件以获取上下文 - 始终从磁盘重新读取，即使你之前在对话中看到过它们（用户可能已编辑过它们）
      - 如果 `instruction` 字段将创建委托给特定技能或命令，请调用它来生成产物而不是自己写入文件，然后验证产物文件是否存在于 `resolvedOutputPath`
      - 否则使用 `template` 作为结构创建产物文件并将其写入 `resolvedOutputPath`。如果 `resolvedOutputPath` 是 glob，请按照 `instruction` 选择具体的文件路径
      - 将 `context` 和 `rules` 应用为约束 - 但不要将它们复制到文件中
      - 显示简要进度："已创建 <artifact-id>"

   b. **继续直到必需集合中的每个产物都存在（不仅仅是 `apply.requires`）**
      - 创建每个产物后，重新运行 `msdd status --change "<name>" --json`
      - 必需集合是 `applyRequires` 加上通过遵循 `status --json` 中的 `requires` 边从这些产物可达的每个产物 - 传递性地遍历它们（spec-driven 会封闭 proposal、specs、design、tasks）。让该集合外的产物保持原样
      - `status` 仅基于文件存在性，因此读取为 `done` 的 `applyRequires` 产物并不意味着其依赖存在 - 提前写入 `tasks.md` 会标记 `tasks` 为完成，而 `specs` 从未被写入。使用每个产物的 `requires` 边而不是其 `status` 来构建必需集合：`done` 的产物仍然列出它依赖的内容
      - 已经读取为 `status: "skipped"` 的产物已满足：变更在 `.msdd.yaml` 中声明了 `skip_specs`，因此其文件不得存在。永远不要尝试创建一个
      - 创建必需集合中缺失的每个产物，然后重新检查 - 创建一个可能会解除其他产物的阻塞
      - 仅当 `status` 已经报告其为 `skipped`，或其自身 `instruction` 说它是条件性时才跳过一个：运行 `msdd instructions <artifact-id> --change "<name>" --json`，仅当其 `instruction` 字段标记为可选时才跳过（例如"仅在...时创建"）。spec-driven 的 `design.md` 符合条件；`specs` 仅通过上面的 `skipped` 状态符合条件，绝不由你自己的判断决定。告知用户，不要重新考虑它
      - 依赖是启用器，而非门控：如果必需产物仍处于 `blocked` 状态仅仅是因为你跳过了条件性依赖，请无论如何写入它
      - 当必需集合中的每个产物都处于 `done`、`skipped` 状态或被有意跳过时停止

   c. **如果产物需要用户输入**（上下文不明确）：
      - 请求用户澄清
      - 然后继续创建

5. **显示最终状态**
   ```bash
   msdd status --change "<name>"
   ```

**输出**

完成所有产物后，总结：
- 变更名称和位置
- 创建的产物列表及简要描述，以及你跳过的任何条件性产物及其原因
- 已就绪："实现所需的所有产物都已就绪。"
- 提示："运行 `/opsx-apply` 或要求我实现以开始处理任务。"

**产物创建指南**

- 遵循 `msdd instructions` 中每个产物类型的 `instruction` 字段 - 这是权威指南，即使是熟悉的产物名称
- 如果 `instruction` 字段指导你使用特定技能或命令来创建产物，请调用它而不是直接写入产物
- 模式定义了每个产物应包含的内容 - 遵循它
- 在创建新产物之前读取依赖产物以获取上下文
- 使用 `template` 作为输出文件的结构 - 填充其各个部分
- **重要**：`context` 和 `rules` 是对你的约束，而非文件内容
  - 不要将 `<context>`、`<rules>`、`<project_context>` 块复制到产物中
  - 这些指导你写什么，但不应出现在输出中

**防护栏**
- 创建实现阶段传递性依赖的每个产物，而不仅仅是 `apply.requires` 中列出的 ID
- 在创建新产物之前始终读取依赖产物 - 从磁盘重新读取，而不是从对话记忆中读取（文件可能自你上次查看后已更改）
- 如果上下文严重不明确，请询问用户 - 但优先做出合理决策以保持进度
- 如果具有该名称的变更已存在，请询问用户是否要继续它还是创建一个新变更
- 在继续下一个之前验证每个产物文件在写入后是否存在