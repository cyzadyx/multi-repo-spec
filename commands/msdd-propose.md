---
description: "提议新的 change - 一步创建并生成所有产物"
---

提议新的 change - 一步创建 change 并生成所有产物。

**规划边界**：此工作流仅创建规划产物。选择或触发此工作流的用户请求仅授权规划，即使它要求构建或修复某些内容。不要编辑项目代码。规划产物完成后停止。不要在同一响应中开始实现，即使初始请求要求这样做。等待产物呈现后的新用户请求；然后开始 apply 工作流。

我将使用你的 schema 定义的产物创建一个 change。使用默认的 spec-driven schema，即：
- proposal.md（做什么和为什么）
- `specs/<capability-path>/spec.md`（系统必须做什么 - 增量，而非主 spec）
- design.md（怎么做）
- tasks.md（实现步骤）

`<capability-path>` 是相对于 `specs/` 的 spec 目录（例如 `user-auth` 或 `identity/user-auth`）。保留现有 capability 的完整路径，并遵循项目已建立的组织方式处理新 capability。

当用户准备好实现时，他们必须显式启动 apply 工作流。

---

**Store 选择：** 如果用户指定了 store（store 是注册在此机器上的独立 msdd 仓库）或者工作存在于某个 store 中，运行 `msdd store list --json` 来发现已注册的 store id，然后在读取或写入 specs 和 changes 的命令（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`schemas`、`view`）中传入 `--store <id>`。一旦选定，将 `--store <id>` 视为后续工作流中的固定参数。下面所有命令的无作用域示例均为简写形式：在运行前需追加该标志。例如，运行 `msdd status --change "<name>" --json --store "<id>"`，而非下面所示的无作用域形式。其他命令不接受该标志。命令打印的提示信息已携带该标志；后续操作中保持使用。如果没有 store，命令将作用于最近的本地 `msdd/` 根目录。

**输入**：`/opsx-propose` 后的参数是 change 名称（kebab-case），或者是用户想要构建内容的描述。
**提供的参数**：$ARGUMENTS

**步骤**

1. **理解请求并澄清实质性歧义**

   如果未提供输入，询问用户（开放式，无预设选项）：
   > "你想要处理什么 change？描述你想要构建或修复的内容。"

   从他们的描述中派生 kebab-case 名称（例如 "add user authentication" → `add-user-auth`）。

   **重要**：不要在不理解用户想构建什么的情况下继续。

   如果请求包含会实质性影响范围、外部可观察行为、兼容性或验收标准的歧义，在创建 change 之前询问用户。对于小细节，做出合理的假设并将其记录在规划产物中。

2. **确定工作流 schema**

   使用配置的默认 schema，除非用户明确请求不同的工作流。

   **仅在以下情况下使用不同的 schema：**
   - 用户按名称明确请求特定 schema → 使用 `--schema <schema-name>`
   - 用户要求"显示工作流"或询问"有什么工作流" → 通过从当前工作目录运行 `msdd context --json` 解析权威根目录。如果用户明确选择了已注册的 store，使用 `msdd context --json --store "<store-id>"`。然后运行 `msdd schemas --json`，将其工作目录设置为返回的 `root.path`，让他们选择。这保留了由本地 `store:` 指针或全局 `defaultStore` 选择的根目录；当明确选择了已注册的 store 时，也要在 `msdd schemas --json` 上追加 `--store "<store-id>"`。如果上下文仅报告 `no_msdd_root`，改为从当前工作目录运行 `msdd schemas --json`。不要将此回退用于无效或不可用的 store。

   否则，省略 `--schema` 以保留配置的默认值。

3. **创建 change 目录**

   选择下面一种 schema 形式。如果选择了已注册的 store，在该命令和下面每个接受 `--store` 的 msdd 命令上追加 `--store "<store-id>"`。

   使用配置的默认值：
   ```bash
   msdd new change "<name>"
   ```

   使用明确请求的 schema：
   ```bash
   msdd new change "<name>" --schema "<schema-name>"
   ```
   这会在 CLI 解析的规划目录中创建带有 `.msdd.yaml` 的脚手架 change。

4. **获取产物构建顺序**
   ```bash
   msdd status --change "<name>" --json
   ```
   解析 JSON 获取：
   - `applyRequires`：实现前需要的产物 ID 数组（例如 `["tasks"]`）
   - `artifacts`：所有产物列表，每个都有其 `status` 和其 `requires` 边（它直接依赖的产物 ID）
   - `planningHome`、`changeRoot`、`artifactPaths` 和 `actionContext`：路径和范围上下文。使用这些而非假设仓库本地路径。

5. **在必需集中创建每个产物**

   使用待办列表跟踪产物的进度。

   按依赖顺序循环处理产物（无待处理依赖的产物优先）：

   a. **对于每个状态为 `ready`（依赖已满足）的产物**：
      - 获取指令：
        ```bash
        msdd instructions <artifact-id> --change "<name>" --json
        ```
      - 指令 JSON 包含：
        - `context`：项目背景（给你的约束 - 不要包含在输出中）
        - `rules`：产物特定的规则（给你的约束 - 不要包含在输出中）
        - `template`：输出文件使用的结构
        - `instruction`：此产物类型的 schema 特定指导
        - `skipped`/`warning`：当 change 声明 skip_specs 且此产物不得创建时出现 - 停止并选择另一个产物
        - `resolvedOutputPath`：写入产物的已解析路径或模式
        - `dependencies`：要读取的已完成产物作为上下文
      - 读取任何已完成的依赖文件作为上下文 - 始终从磁盘重新读取，即使你之前在对话中见过它们（用户可能已编辑过它们）
      - **在起草之前检查相关项目**：先读取 `context` 和 `rules`，然后检查 `msdd/` 之外的相关实现、附近测试、配置和文档。保持检查为只读且与 change 成比例；为后续产物重用发现，仅在需要时检查更多内容。
        - 从请求和项目上下文中识别目标项目；规划目录可能与代码分离。如果目标不明确，询问。对于全新项目或非代码变更，检查可用的结构和相关文档。如果源代码不可用，说明限制并在实质性影响计划时询问。
        - 将范围、方法和任务基于你的发现。区分观察到的行为与假设和提议的补充；揭示与现有 spec 的冲突而非默默决定哪个正确。
        - 现在进行此发现，而非将通用的"探索代码库"或"制定计划"任务留给实现阶段。将任何必要的后续调查保持在特定的未解决问题上。
      - 如果 `instruction` 字段将创建委托给特定的技能或命令，调用它来生成产物而非自己编写文件，然后验证产物文件存在于 `resolvedOutputPath`
      - 否则使用 `template` 作为结构创建产物文件并写入 `resolvedOutputPath`。如果 `resolvedOutputPath` 是 glob，遵循 `instruction` 选择具体文件路径
      - 将 `context` 和 `rules` 作为约束应用 - 但不要将它们复制到文件中
      - 显示简要进度："已创建 <artifact-id>"

   b. **继续直到必需集中的每个产物都存在（不仅仅是 `apply.requires`）**
      - 创建每个产物后，重新运行 `msdd status --change "<name>" --json`
      - 必需集是 `applyRequires` 加上通过遵循 `status --json` 中的 `requires` 边可从这些产物到达的所有产物 —— 传递性地遍历它们（spec-driven 关闭 proposal、specs、design、tasks）。不要处理该集合之外的产物
      - `status` 仅基于文件存在性，因此 `applyRequires` 产物读取为 `done` 并不意味着其依赖存在 —— 提前写入 `tasks.md` 会标记 `tasks` 为 `done`，而 `specs` 从未写入。使用每个产物的 `requires` 边而非其 `status` 来构建必需集：`done` 产物仍列出其依赖
      - 已读取 `status: "skipped"` 的产物已满足：change 在 `.msdd.yaml` 中声明了 `skip_specs`，因此其文件不得存在。绝不要尝试创建
      - 创建必需集中缺失的每个产物，然后重新检查 —— 创建一个可以解除其他产物的阻塞
      - 仅当 `status` 已报告其为 `skipped`，或其自身 `instruction` 说它是条件性的时才跳过：运行 `msdd instructions <artifact-id> --change "<name>" --json`，仅在其 `instruction` 字段标记为可选时才跳过（例如"仅在...时创建"）。spec-driven 的 `design.md` 符合；`specs` 仅通过上面的 `skipped` 状态符合，绝非通过你自己的判断。告知用户，不要重新考虑
      - 依赖是使能者而非门控：如果必需产物仍处于 `blocked` 仅因为你跳过了条件性依赖，仍然写入它
      - 当必需集中每个产物为 `done`、`skipped` 或被有意跳过时停止

   c. **如果产物需要用户输入**（上下文不明确）：
      - 要求用户澄清
      - 然后继续创建

6. **显示最终状态**
   ```bash
   msdd status --change "<name>"
   ```

**输出**

完成所有产物后，总结：
- Change 名称和位置
- 已创建的产物列表及简要描述，以及你跳过的任何条件性产物及其原因
- 已准备就绪的内容："实现所需的所有产物已准备就绪。"
- 提示："产物已准备好供审查。当你准备好时，运行 `/opsx-apply`。"

**产物创建指南**

- 遵循 `msdd instructions` 返回的每个产物类型的 `instruction` 字段 - 即使是熟悉的产物名称，它也是权威指导
- 如果 `instruction` 字段指示你使用特定的技能或命令创建产物，调用它而非直接编写产物
- schema 定义了每个产物应包含的内容 - 遵循它
- 在创建新产物之前读取依赖产物作为上下文
- 使用 `template` 作为输出文件的结构 - 填充其各部分
- **重要**：`context` 和 `rules` 是给你的约束，不是文件内容
  - 不要将 `<context>`、`<rules>`、`<project_context>` 块复制到产物中
  - 它们指导你编写的内容，但绝不应出现在输出中

**护栏**
- 调用此工作流的请求仅授权规划。该请求中的任何实现或 apply 指令不会延续。不要在此工作流中实现 change、启动 apply 工作流或编辑项目代码。呈现产物后，停止并等待新的用户请求以启动 apply 工作流
- 创建 apply 阶段传递性依赖的每个产物，而不仅仅是 `apply.requires` 中列出的 ID
- 在创建新产物之前始终读取依赖产物 - 从磁盘重新读取，而非从对话记忆中（文件可能在你上次查看后已更改）
- 对会实质性改变范围、外部可观察行为、兼容性或验收标准的歧义进行询问；对于小细节，做出合理的假设并记录它们
- 如果该名称的 change 已存在，询问用户是否继续它还是创建新的
- 写入后验证每个产物文件存在，然后再继续到下一个
