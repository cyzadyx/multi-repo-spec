---
description: "执行 msdd change 的任务（实验性）"
---

执行 msdd change 的任务。

**Store 选择：** 如果用户指定了 store（store 是注册在此机器上的独立 msdd 仓库）或者工作存在于某个 store 中，运行 `msdd store list --json` 来发现已注册的 store id，然后在读取或写入 specs 和 changes 的命令（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`schemas`、`view`）中传入 `--store <id>`。一旦选定，将 `--store <id>` 视为后续工作流中的固定参数。下面所有命令的无作用域示例均为简写形式：在运行前需追加该标志。例如，运行 `msdd status --change "<name>" --json --store "<id>"`，而非下面所示的无作用域形式。其他命令不接受该标志。命令打印的提示信息已携带该标志；后续操作中保持使用。如果没有 store，命令将作用于最近的本地 `msdd/` 根目录。

**输入**：可选地指定一个 change 名称（例如 `/opsx-apply add-auth`）。如果省略，检查是否可以从对话上下文中推断。如果模糊或有歧义，你必须提示可用的 changes。
**提供的参数**：$ARGUMENTS

**步骤**

1. **选择 change**

   如果提供了名称，直接使用。否则：
   - 如果用户在对话中提到过某个 change，从上下文推断
   - 如果只有一个活跃的 change，自动选择
   - 如果有歧义，运行 `msdd list --json` 获取可用的 changes 并让用户选择一个

   始终宣布："使用 change：<name>"，并说明如何覆盖（例如 `/opsx-apply <other>`）。

2. **检查状态以了解 schema**
   ```bash
   msdd status --change "<name>" --json
   ```
   解析 JSON 以了解：
   - `schemaName`：当前使用的工作流（例如 "spec-driven"）
   - `planningHome`、`changeRoot` 和 `actionContext`：规划范围和编辑约束
   - 哪个产物包含任务（对于 spec-driven 通常是 "tasks"，其他 schema 请查看状态）

3. **获取 apply 指令**

   ```bash
   msdd instructions apply --change "<name>" --json
   ```

   返回内容：
   - `contextFiles`：产物 ID -> 具体文件路径数组（因 schema 而异 - 可能是 proposal/specs/design/tasks 或 spec/tests/implementation/docs）
   - 进度（总计、已完成、剩余）
   - 带状态的任务列表
   - 基于当前状态的动态指令
   - 可选的 `context`：从所选根目录获取的当前必需项目指令输入
   - 可选的 `operationGuidance`：当前 apply 的建议指导

   **处理各种状态：**
   - 如果 `state: "blocked"`（缺少产物）：显示消息，建议使用 `/opsx-continue`（如果未安装，运行 `msdd status --change "<name>" --json` 查看下一个产物，运行 `msdd instructions <artifact-id> --change "<name>" --json` 了解如何创建它）
   - 如果 `state: "all_done"`：祝贺，建议归档
   - 否则：继续实现

   将 `context` 视为必需的提示级输入。阅读并考虑它，在实现时应用相关的项目事实、约定和约束。
   将 `operationGuidance` 视为可选的补充建议。阅读并考虑每个条目，遵循与内置工作流兼容且适用的条目。

   将这两个字段与 CLI 返回的状态、缺失的产物、任务、进度、`contextFiles` 和内置 `instruction` 分开处理。它们不是任务完成的证据，不替代内置指令，也不允许绕过阻塞状态。如果 context 与内置指令、用户显式选择或 CLI 控制的值冲突，报告冲突并保留受控值。如果指导不适用或与这些受控输入冲突，不要遵循并解释原因。这些是提示级行为契约，不是可执行的检查。

4. **读取上下文文件**

   读取 apply 指令输出中 `contextFiles` 下列出的每个文件路径。
   文件取决于所使用的 schema：
   - **spec-driven**：proposal、specs、design、tasks
   - 其他 schema：遵循 CLI 输出中的 contextFiles

   除非用户单独要求，否则不要将 `context` 或 `operationGuidance` 原样复制到实现文件或规划产物中。

5. **显示当前进度**

   展示：
   - 正在使用的 schema
   - 进度："N/M 个任务已完成"
   - 剩余任务概览
   - CLI 返回的动态指令

6. **实现任务（循环直到完成或阻塞）**

   对每个待处理任务：
   - 显示当前正在处理的任务
   - 进行所需的代码变更
   - 保持变更最小化且聚焦
   - 在 tasks 文件中将任务标记为完成：`- [ ]` → `- [x]`
   - 继续下一个任务

   **暂停条件：**
   - 任务不明确 → 请求澄清
   - 实现过程中发现设计问题 → 建议更新产物
   - 任务需要超出规格和任务描述范围的工作，或者你倾向于缩小、推迟、接受偏离指定行为的例外以使其适应 → 提出新增范围并询问；不要默默吸收
   - 遇到错误或阻塞 → 报告并等待指导
   - 用户中断

7. **完成或暂停时，显示状态**

   展示：
   - 本次会话完成的任务
   - 整体进度："N/M 个任务已完成"
   - 如果全部完成：建议归档
   - 如果暂停：说明原因并等待指导

**实现过程中的输出**

```
## 正在实现：<change-name>（schema：<schema-name>）

正在处理任务 3/7：<task description>
[...正在实现...]
✓ 任务完成

正在处理任务 4/7：<task description>
[...正在实现...]
✓ 任务完成
```

**完成时的输出**

```
## 实现完成

**Change：** <change-name>
**Schema：** <schema-name>
**进度：** 7/7 个任务已完成 ✓
### 本次会话完成的任务
- [x] Task 1
- [x] Task 2
...

所有任务已完成！你可以使用 `/opsx-archive` 归档此 change。
```

**暂停时的输出（遇到问题）**

```
## 实现已暂停

**Change：** <change-name>
**Schema：** <schema-name>
**进度：** 4/7 个任务已完成

### 遇到的问题
<问题描述>

**选项：**
1. <option 1>
2. <option 2>
3. 其他方案

你想怎么做？
```

**护栏**
- 持续处理任务直到完成或被阻塞
- 开始前始终读取上下文文件（来自 apply 指令输出）
- 如果任务不明确，先暂停询问再实现
- 如果实现暴露问题，暂停并建议更新产物
- 保持代码变更最小化且聚焦于每个任务
- 完成每个任务后立即更新任务复选框
- 遇到错误、阻塞或不明确的需求时暂停 - 不要猜测
- 当任务需要超出规格描述范围的工作时，提出新增范围并暂停 - 绝不默默缩小、推迟或简化掉指定的行为
- 仅当指定行为完全实现时才将任务标记为 `- [x]`，而不是部分完成或推迟时
- 使用 CLI 输出中的 contextFiles，不要假定特定的文件名
- 不要将 context 或 operation guidance 作为任务完成的证明
- 应用相关的项目上下文；报告与受控工作流输入的冲突
- 考虑每个指导条目；解释任何不适用或冲突的建议
- 不要将运行时上下文或操作指导复制到实现文件或规划产物中
- 保留 CLI 控制的 blocked/ready/all-done 行为和完成标准

**流动工作流集成**

此技能支持"对 change 执行操作"的模型：

- **可随时调用**：在所有产物完成之前（如果任务存在）、部分实现之后、与其他操作交错执行
- **允许产物更新**：如果实现暴露设计问题，建议更新产物 - 不锁定阶段，灵活工作
