---
description: "更新 change - 修订现有规划产物并保持一致性（实验性）"
---

修订 change 的现有规划产物并保持一致性。绝不编辑代码。

**Store 选择：** 如果用户指定了 store（store 是注册在此机器上的独立 msdd 仓库）或者工作存在于某个 store 中，运行 `msdd store list --json` 来发现已注册的 store id，然后在读取或写入 specs 和 changes 的命令（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`schemas`、`view`）中传入 `--store <id>`。一旦选定，将 `--store <id>` 视为后续工作流中的固定参数。下面所有命令的无作用域示例均为简写形式：在运行前需追加该标志。例如，运行 `msdd status --change "<name>" --json --store "<id>"`，而非下面所示的无作用域形式。其他命令不接受该标志。命令打印的提示信息已携带该标志；后续操作中保持使用。如果没有 store，命令将作用于最近的本地 `msdd/` 根目录。

**输入**：可选地在 `/opsx-update` 后指定一个 change 名称（例如 `/opsx-update add-auth`）。如果省略，检查是否可以从对话上下文中推断。如果模糊或有歧义，你必须提示可用的 changes。
**提供的参数**：$ARGUMENTS

`/opsx-continue` 是一个可选工作流，可能未安装。在下面任何地方建议之前，验证其可用性。如果不可用，`msdd status --change "<name>" --json` 显示下一个产物，`msdd instructions "<artifact-id>" --change "<name>" --json` 解释如何创建它。

**步骤**

1. **选择 change**

   如果提供了名称，直接使用。否则：
   - 如果用户在对话中提到过某个 change，从上下文推断
   - 如果只有一个活跃的 change，自动选择
   - 如果有歧义，运行 `msdd list --json` 获取按最近修改排序的可用 changes，并让用户选择一个

   提示时，显示最近修改的前 3-4 个 changes 作为选项，显示：
   - Change 名称
   - Schema（来自 `schema` 字段，如果存在，否则为 "spec-driven"）
   - 状态（例如 "0/5 个任务"、"已完成"、"无任务"）
   - 修改时间（来自 `lastModified` 字段）

   将最近修改的 change 标记为"（推荐）"，因为它可能是用户想要更新的内容。

   始终宣布："使用 change：<name>"，并说明如何覆盖（例如 `/opsx-update <other>`）。

2. **获取 change 的产物**
   ```bash
   msdd status --change "<name>" --json
   ```
   解析 JSON 以了解当前状态。响应包括：
   - `schemaName`：当前使用的工作流 schema（例如 "spec-driven"）
   - `artifacts`：产物数组，每个都有其状态（"done"、"skipped"、"ready"、"blocked"）
   - `isPlanningComplete`：指示所有规划产物是否完成的布尔值。旧版 CLI 版本将相同值暴露为 `isComplete`。
   - `planningHome`、`changeRoot`、`artifactPaths` 和 `actionContext`：路径和范围上下文。使用这些而非假设仓库本地路径。

   产物 ID 和路径来自活跃的 schema - 不要假定它们，不要基于硬编码的产物名称分支。自定义 schema 必须原样工作。

   要编辑的文件是 `artifactPaths.<id>.existingOutputPaths` - 磁盘上存在的具体文件，对于 glob 产物已进行 glob 展开（例如 `specs/**/*.md`）。不要写入 `resolvedOutputPath`：对于 glob 产物，它仍是 glob 模式，而非真实文件。

3. **理解请求**
   - 如果用户要求特定的修订（"设计现在使用 X"），这就是起始编辑。
   - 如果他们只说"更新" / "使其一致"，将其视为一致性审查：读取现有产物并相互检查矛盾、差距和重复。

4. **读取并协调**
   - 读取请求涉及的产物和 change 的其他现有产物。
   - 应用请求的编辑。然后检查每个其他现有产物 - 任何方向：对后续产物的编辑可能需要修订先前的产物，反之亦然。构建顺序是有用的阅读顺序，而非对可修订产物的约束。
   - 注意所有现在不一致、缺失或矛盾的内容。
   - 仅修订已存在的文件（`existingOutputPaths`）。不要创建尚不存在的产物，不要在 glob 产物下创建新文件 - 记录它们并引导用户到 `/opsx-continue` 创建它们。
   - 如果 change 已经一致，说明情况且不进行编辑。

5. **确认并应用，一次一个产物**
   - 显示每个提议的修订及其原因。用户确认后才写入。
   - 如果用户拒绝修订，不要写入 - 保持该产物不变。
   - 当需要大量重写时，先获取该产物的规则和模板：
     ```bash
     msdd instructions "<artifact-id>" --change "<name>" --json
     ```

6. **指向下一步（仅指导 - 绝不要执行）**
   - 产物仍缺失 → 建议 `/opsx-continue` 创建它们。
   - Change 已实现（任务已勾选 / 已 apply）→ 代码可能不再匹配修订后的计划；建议 `/opsx-apply` 将变更带入代码。
   - 全部完成且已实现 → 建议 `/opsx-archive`。

**输出**

每次调用后显示：
- 修订了哪些产物（哪些提议的修订被拒绝）
- 延迟到 `/opsx-continue` 的内容（尚未创建的产物或文件）
- Change 的当前状态和建议的下一个命令

**护栏**
- 仅规划产物 - 绝不编辑实现代码。如果修订后的计划暗示代码变更，停止并指向 `/opsx-apply`。
- 使用 `msdd status` 报告的产物 ID 和路径；绝不要基于硬编码的产物名称分支。
- 仅编辑 `existingOutputPaths` 中的具体文件；绝不要写入 glob `resolvedOutputPath`。
- 不要推进构建边界：不创建新产物，不创建 glob 产物下的新文件 —— 那是 `/opsx-continue` 的工作。
- 写入前与用户确认每次编辑。
- 如果请求改变的是 change 的*意图*而非精炼它，首先验证可选的 `/opsx-new` 工作流是否可用。如果可用，建议使用 `/opsx-new` 重新开始（"更新还是重新开始"启发式）。如果不可用，请求一个不同的未使用 change 名称，并建议使用 `msdd new change "<new-change-name>"` 替代。
