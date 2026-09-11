---
name: msdd-update-change
description: 通过修订现有的规划产物并保持它们彼此一致来更新 msdd 变更。当用户想要修订变更的计划、将新决策融入其中或在编辑后协调其产物时使用。永远不编辑代码。
allowed-tools: Bash(msdd:*)
license: MIT
compatibility: Requires msdd CLI.
metadata:
  author: msdd
  version: "1.0"
  generatedBy: "1.7.0"
---

修订变更的现有规划产物并保持它们一致。永远不编辑代码。

**存储选择：** 如果用户指定了存储（存储是在此机器上注册的独立 msdd 仓库）或工作在其中一个存储中，请运行 `msdd store list --json` 来发现已注册的存储 ID，然后在读取或写入规范和变更的命令（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）上传递 `--store <id>`。其他命令不接受该标志。命令打印的提示已经包含该标志；在后续操作中保持它。如果没有存储，命令将作用于最近的本地 `msdd/` 根目录。

**输入**：可选指定变更名称。如果省略，检查是否可以从对话上下文中推断。如果模糊或不明确，你必须提示可用的变更。

**步骤**

1. **选择变更**

   如果提供了名称，则使用它。否则：
   - 如果用户提到了变更，从对话上下文中推断
   - 如果只有一个活跃变更存在，则自动选择
   - 如果不明确，运行 `msdd list --json` 获取可用的变更（按最近修改排序）并让用户选择一个

   提示时，将最近修改的 3-4 个变更作为选项呈现，显示：
   - 变更名称
   - 模式（来自 `schema` 字段（如果存在），否则为 "spec-driven"）
   - 状态（例如 "0/5 个任务"、"完成"、"无任务"）
   - 最近修改的时间（来自 `lastModified` 字段）

   将最近修改的变更标记为"（推荐）"，因为它很可能是用户想要更新的。

   始终宣布："正在使用变更：<name>"以及如何覆盖（例如，`/opsx-update <other>`）。

2. **获取变更的产物**
   ```bash
   msdd status --change "<name>" --json
   ```
   解析 JSON 以了解当前状态。响应包括：
   - `schemaName`：正在使用的工作流模式（例如 "spec-driven"）
   - `artifacts`：产物数组及其状态（"done"、"skipped"、"ready"、"blocked"）
   - `isComplete`：布尔值，指示所有产物是否完成
   - `planningHome`、`changeRoot`、`artifactPaths` 和 `actionContext`：路径和范围上下文。使用这些而不是假设仓库本地路径。

   产物 ID 和路径来自活动模式 - 不要假设它们，不要基于硬编码的产物名称进行分支。自定义模式必须保持不变地工作。

   要编辑的文件是 `artifactPaths.<id>.existingOutputPaths` - 磁盘上存在的具体文件，对于 glob 产物已经展开（例如 `specs/**/*.md`）。不要写入 `resolvedOutputPath`：对于 glob 产物，它仍然是 glob 模式，而不是真实文件。

3. **理解请求**
   - 如果用户要求特定的修订（"设计现在使用 X"），那就是开始编辑的内容。
   - 如果他们只是说"更新"或"使其一致"，则将其视为一致性审查：读取现有产物并相互检查是否存在矛盾、差距和重复。

4. **读取和协调**
   - 读取请求涉及的产物和变更的其他现有产物。
   - 应用请求的编辑。然后检查每个其他现有产物是否与之矛盾 - 任何方向：对后期产物的编辑可能需要修订早期产物，而不仅仅是相反。构建顺序是有用的阅读顺序，而不是对哪些产物可以修订的约束。
   - 注意所有现在不一致、缺失或矛盾的内容。
   - 仅修订已存在的文件（`existingOutputPaths`）。不要创建尚不存在的产物，不要在 glob 产物下发明新文件 - 记录它们并引导用户到 `/opsx-continue` 来创建它们。
   - 如果变更已经一致，请说明并不要进行任何编辑。

5. **确认并应用，一次一个产物**
   - 显示每个建议的修订及其原因。仅在用户确认后写入。
   - 如果用户拒绝修订，请不要写入 - 让该产物保持不变。
   - 当需要大量重写时，首先获取该产物的规则和模板：
     ```bash
     msdd instructions <artifact-id> --change "<name>" --json
     ```

6. **指向下一步（仅指导 - 永远不要基于它操作）**
   - 产物仍然缺失 -> 建议 `/opsx-continue` 来创建它们。
   - 变更已实现（任务已勾选/已应用）-> 代码可能不再与修订后的计划匹配；建议 `/opsx-apply` 将差异带入代码。
   - 所有操作完成并已实现 -> 建议 `/opsx-archive`。

**输出**

每次调用后，显示：
- 哪些产物被修订了（以及哪些建议的修订被拒绝了）
- 任何推迟到 `/opsx-continue` 的内容（尚未创建的产物或文件）
- 变更的当前状态以及建议的下一个命令

**防护栏**
- 仅限规划产物 - 永远不要编辑实现代码。如果修订后的计划意味着代码更改，请停止并指向 `/opsx-apply`。
- 使用 `msdd status` 报告的产物 ID 和路径；永远不要基于硬编码的产物名称进行分支。
- 仅编辑 `existingOutputPaths` 中的具体文件；永远不要写入 glob `resolvedOutputPath`。
- 不要推进构建边界：没有新产物，没有 glob 产物下的新文件 - 那是 `/opsx-continue` 的工作。
- 在写入之前与用户确认每个编辑。
- 如果请求改变变更的*意图*而不是细化它，建议使用 `/opsx-new` 重新开始（"更新 vs. 重新开始"启发式）。
- `/opsx-continue` 和 `/opsx-new` 可能未安装（核心配置文件）。当建议一个不可用的选项时，指向 CLI：`msdd status --change "<name>" --json` 显示下一个产物，`msdd instructions <artifact-id> --change "<name>" --json` 解释如何创建它。