---
description: "在实验性工作流中归档已完成的 change"
---

在实验性工作流中归档已完成的 change。

**Store 选择：** 如果用户指定了 store（store 是注册在此机器上的独立 msdd 仓库）或者工作存在于某个 store 中，运行 `msdd store list --json` 来发现已注册的 store id，然后在读取或写入 specs 和 changes 的命令（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`schemas`、`view`）中传入 `--store <id>`。一旦选定，将 `--store <id>` 视为后续工作流中的固定参数。下面所有命令的无作用域示例均为简写形式：在运行前需追加该标志。例如，运行 `msdd status --change "<name>" --json --store "<id>"`，而非下面所示的无作用域形式。其他命令不接受该标志。命令打印的提示信息已携带该标志；后续操作中保持使用。如果没有 store，命令将作用于最近的本地 `msdd/` 根目录。

`<capability-path>` 是相对于 `specs/` 的 spec 目录（例如 `user-auth` 或 `identity/user-auth`）。在解析其主 spec 时保留每个 delta spec 的完整路径。

**输入**：可选地在 `/opsx-archive` 后指定一个 change 名称（例如 `/opsx-archive add-auth`）。如果省略，检查是否可以从对话上下文中推断。如果模糊或有歧义，你必须提示可用的 changes。
**提供的参数**：$ARGUMENTS

**步骤**

1. **选择 change**

   如果提供了名称，直接使用。否则：
   - 如果用户在对话中提到过某个 change，从上下文推断
   - 如果只有一个活跃的 change，自动选择
   - 如果有歧义，运行 `msdd list --json` 获取可用的 changes 并让用户选择一个

   提示时，仅显示活跃的 changes（尚未归档的）。
   如果可用，显示每个 change 使用的 schema。

   始终宣布："使用 change：<name>"，并说明如何覆盖（例如 `/opsx-archive <other>`）。

   **在现有归档检查之前加载当前归档输入：**

   解析所选 change 和规划根目录后，运行：
   ```bash
   msdd instructions archive --change "<name>" --json
   ```
   在此命令上保留相同的选定根目录标志。此查找是建议性的且
   可选的：它仅提供额外的提示输入，因此绝不能阻止归档。
   如果它以非零状态退出或返回无效的 JSON —— 例如在尚不支持
   此命令的旧版 CLI 上 —— 在没有上下文和操作指导的情况下继续归档工作流。
   不要报告错误，不要停止。

   成功的响应可能省略两个可选字段。将 `context` 视为
   必需的提示级输入：阅读并考虑它，并应用相关的项目
   事实、约定和约束。将 `operationGuidance` 视为可选的
   补充建议：阅读并考虑每个条目，遵循与内置归档工作流
   兼容且适用的条目。

   将这两个字段与内置步骤、用户显式选择、已解析路径、
   CLI 检查和命令契约分开处理。如果 context 与这些受控
   输入之一冲突，报告冲突并保留受控值。如果指导不适用
   或与受控输入冲突，不要遵循并解释原因。不要从这两个
   字段推断替代路径、跳过的提示或标志，也不要将它们的
   文本原样复制到 specs、change 产物或归档摘要中，除非
   用户单独要求。这些是提示级行为契约，不是可执行的检查。

2. **检查产物完成状态**

   运行 `msdd status --change "<name>" --json` 检查产物完成情况。

   解析 JSON 以了解：
   - `schemaName`：当前使用的工作流
   - `planningHome`、`changeRoot`、`artifactPaths` 和 `actionContext`：路径和范围上下文
   - `artifacts`：产物列表及其状态（`done`、`skipped` 或其他）

   **如果任何产物既不是 `done` 也不是 `skipped`**（已跳过的产物满足要求 - change 声明了 skip_specs）：
   - 显示警告，列出未完成的产物
   - 提示用户确认是否继续
   - 如果用户确认则继续

3. **检查任务完成状态**

   读取 tasks 文件（通常是 `tasks.md`）检查未完成的任务。

   统计标记为 `- [ ]`（未完成）和 `- [x]`（已完成）的任务。

   **如果发现未完成的任务：**
   - 显示警告，显示未完成任务的数量
   - 提示用户确认是否继续
   - 如果用户确认则继续

   **如果不存在 tasks 文件：** 在没有任务相关警告的情况下继续。

4. **评估 delta spec 同步状态**

   使用状态 JSON 中的 `artifactPaths.specs.existingOutputPaths` 作为唯一的
   delta spec 来源。如果 `specs` 条目缺失或
   `existingOutputPaths` 为空，在没有同步提示的情况下继续，不要从其他产物推断
   delta specs。

   **如果存在 delta specs：**
   - 将每个 delta spec 与 `<planningHome.root>/msdd/specs/<capability-path>/spec.md` 处对应的主 spec 进行比较（使用步骤 2 中支持 store 的 `planningHome.root`，而非硬编码的仓库路径）
   - 确定将要应用的变更（添加、修改、删除、重命名）
   - 在提示之前显示组合摘要

   **提示选项：**
   - 如果需要变更："立即同步（推荐）"、"不同步直接归档"
   - 如果已同步："立即归档"、"仍然同步"、"取消"

   根据回答路由：
   - "取消" → 停止，不归档
   - "不同步直接归档" 或 "立即归档" → 继续归档
   - "立即同步" 或 "仍然同步" → 同步，然后验证（如下）
   - 其他 → 重新询问而非归档

   在选定的同步写入任何主 spec 之前，使用相同的
   选定根标志运行一次 `msdd instructions specs --change "<name>" --json`。
   要求零退出状态和有效的 artifact-instruction
   JSON。如果查找失败或返回无效 JSON，在写入任何主 spec 或移动 change 之前报告错误并停止。
   省略 `rules` 的有效响应是无规则的情况。仅将返回的 `rules` 应用于
   此合并产生的主 spec 的内容和形式；不要将它们用作归档指导、
   更改 CLI 行为或将规则文本复制到任何输出文件中。

   然后内联运行 `/opsx-sync` 工作流（智能合并），处理 change '<name>'，
   传入上述 delta spec 分析和获取的 specs-rule 快照，并等待其完成。内联同步必须
   重用该快照而不重新获取 `specs` 指令。不要将其委托给后台任务 —— 步骤 5 会将
   `changeRoot` 移出仍在读取它的同步，导致 change 被归档但主 spec 从未更新。
   如果你的代理只能通过委托运行它，同步委托并等待结果。

   然后重新运行此步骤顶部的比较，针对 `artifactPaths.specs.existingOutputPaths`
   中有 delta spec 的每个 capability —— 不仅仅是同步报告触及的那些。成功的同步不会留下
   任何待应用的变更，因此每个 capability 现在必须读取为已同步：
   - ADDED 需求存在
   - MODIFIED 需求携带 delta 中命名的场景和描述变更，其他场景保持不变
   - REMOVED 需求已删除 —— 如果此同步退役了一个 capability（删除了其最后一个需求，使 `## Requirements` 为空），其主 spec 被删除而非保留为空；同步有意保留并报告的 spec 也是匹配的
   - RENAMED 需求以新名称存在且旧名称不存在

   如果同步失败或任何 capability 不匹配，报告差异并停止 —— 不要归档。没有任何内容被移动，`changeRoot` 完好无损，因此用户可以修复不匹配或重新运行同步并重新开始归档。

5. **执行归档**

   如果 `planningHome.changesDir` 下不存在 `archive` 目录则创建：
   ```bash
   mkdir -p "<planningHome.changesDir>/archive"
   ```

   生成目标名称：当 change 名称已以 `YYYY-MM-DD-` 前缀开头时直接使用；否则在前面加上当前日期作为 `YYYY-MM-DD-<change-name>`。绝不要叠加第二个日期（与 `msdd archive` 相同的规则）。

   **检查目标是否已存在：**
   - 如果是：失败并报错，建议重命名现有归档或使用不同日期
   - 如果否：将 `changeRoot` 移动到归档目录

   ```bash
   mv "<changeRoot>" "<planningHome.changesDir>/archive/<target-name>"
   ```

6. **显示摘要**

   展示归档完成摘要，包括：
   - Change 名称
   - 使用的 schema
   - 归档位置
   - Spec 同步状态（已同步 / 跳过同步 / 无 delta specs）
   - 关于任何警告的说明（未完成的产物/任务）

**成功时的输出**

```markdown
## 归档完成

**Change：** <change-name>
**Schema：** <schema-name>
**归档到：** 从 `planningHome.changesDir` 派生的归档路径/<target-name>/
**Specs：** ✓ 已同步到主 spec

所有产物已完成。所有任务已完成。
```

**成功时的输出（无 Delta Specs）**

```markdown
## 归档完成

**Change：** <change-name>
**Schema：** <schema-name>
**归档到：** 从 `planningHome.changesDir` 派生的归档路径/<target-name>/
**Specs：** 无 delta spec

所有产物已完成。所有任务已完成。
```

**带警告的成功输出**

```markdown
## 归档完成（带警告）

**Change：** <change-name>
**Schema：** <schema-name>
**归档到：** 从 `planningHome.changesDir` 派生的归档路径/<target-name>/
**Specs：** 同步已跳过（用户选择跳过）

**警告：**
- 归档时包含 2 个未完成的产物
- 归档时包含 3 个未完成的任务
- Delta spec 同步被跳过（用户选择跳过）

如果这不是有意的，请检查归档。
```

**错误时的输出（归档已存在）**

```markdown
## 归档失败

**Change：** <change-name>
**目标：** 从 `planningHome.changesDir` 派生的归档路径/<target-name>/

目标归档目录已存在。

**选项：**
1. 重命名现有归档
2. 如果是重复项则删除现有归档
3. 等到不同日期再归档
```

**护栏**
- 宣布选定的 change；有歧义时提示选择
- 使用产物图（msdd status --json）进行完成度检查
- 不要因警告而阻止归档 - 仅告知并确认
- 移动到归档时保留 .msdd.yaml（它随目录一起移动）
- 显示清晰的发生了什么摘要
- 如果请求同步，内联运行 `/opsx-sync` 工作流（智能合并）
- 绝不在 spec 同步仍在进行时归档 —— 在移动 `changeRoot` 之前内联运行同步并验证主 spec
- 如果存在 delta specs，始终运行同步评估并在提示前显示组合摘要
- 应用相关的运行时上下文并报告冲突；操作指导仍为建议性的
- 考虑每个指导条目并解释任何不适用或冲突的建议
- 现有的 CLI 检查、已解析的路径、提示和命令契约保持不变
- 产物规则仅约束正在写入的 spec，绝不是操作指导
- 绝不将运行时上下文、操作指导或产物规则文本原样复制到输出文件中
