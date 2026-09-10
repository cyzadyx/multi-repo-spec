---
description: "将 change 中的 delta spec 同步到主 spec"
---

将 change 中的 delta spec 同步到主 spec。

这是一个**智能合并驱动**的操作 - 你将读取 delta spec 并直接编辑主 spec 以应用变更。这允许智能合并（例如添加场景而不复制整个需求）。

**Store 选择：** 如果用户指定了 store（store 是注册在此机器上的独立 msdd 仓库）或者工作存在于某个 store 中，运行 `msdd store list --json` 来发现已注册的 store id，然后在读取或写入 specs 和 changes 的命令（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`schemas`、`view`）中传入 `--store <id>`。一旦选定，将 `--store <id>` 视为后续工作流中的固定参数。下面所有命令的无作用域示例均为简写形式：在运行前需追加该标志。例如，运行 `msdd status --change "<name>" --json --store "<id>"`，而非下面所示的无作用域形式。其他命令不接受该标志。命令打印的提示信息已携带该标志；后续操作中保持使用。如果没有 store，命令将作用于最近的本地 `msdd/` 根目录。

`<capability-path>` 是相对于 `specs/` 的 spec 目录（例如 `user-auth` 或 `identity/user-auth`）。在解析其主 spec 时保留每个 delta spec 的完整路径。

**输入**：可选地在 `/opsx-sync` 后指定一个 change 名称（例如 `/opsx-sync add-auth`）。如果省略，检查是否可以从对话上下文中推断。如果模糊或有歧义，你必须提示可用的 changes。
**提供的参数**：$ARGUMENTS

**步骤**

1. **选择 change**

   如果提供了名称，直接使用。否则：
   - 如果用户在对话中提到过某个 change，从上下文推断
   - 如果只有一个活跃的 change，自动选择
   - 如果有歧义，运行 `msdd list --json` 获取可用的 changes 并让用户选择一个

   提示时，显示有 delta specs 的 changes（在 `specs/` 目录下）。

   始终宣布："使用 change：<name>"，并说明如何覆盖（例如 `/opsx-sync <other>`）。

2. **解析 change 上下文**

   运行：
   ```bash
   msdd status --change "<name>" --json
   ```

   JSON 包含 `planningHome.root`。主 spec 位于 `<planningHome.root>/msdd/specs/` 下 —— 使用该（支持 store 的）根目录作为下面每个主 spec 路径的基准，而非硬编码的仓库路径。当选定 store 时，它指向 store 而非当前仓库。

3. **查找 delta specs**

   使用状态 JSON 中的 `artifactPaths.specs.existingOutputPaths` 作为唯一的
   delta spec 路径来源。如果 `specs` 条目缺失或
   `existingOutputPaths` 为空，报告没有要同步的 delta specs，
   不要从其他产物推断它们，并在不请求产物指令或写入主 spec 的情况下停止。

   同步 `existingOutputPaths` 中的每个路径，除非调用者缩小了集合。
   调用者通过命名 `existingOutputPaths` 中的完整条目显式列表来缩小 ——
   逐字复制这些绝对值。归档内联执行此操作，用户也可以（例如通过
   选择以 `/specs/billing/invoices/spec.md` 结尾的条目）。
   然后仅同步命名的路径，保持其他 delta specs 不变：
   批量归档排除其实现无法找到的 delta，
   同步它会写入调用者有意保留的主 spec。
   将该缩小的选择带入步骤 4；绝不要将其扩展回完整列表。
   如果命名的路径不在 `existingOutputPaths` 中，不要同步它 ——
   报告它并停止，而非默默丢弃。如果命名的列表为空，
   报告没有可同步的内容并在不写入主 spec 的情况下停止。

   每个 delta spec 文件包含如下部分：
   - `## ADDED Requirements` - 要添加的新需求
   - `## MODIFIED Requirements` - 对现有需求的变更
   - `## REMOVED Requirements` - 要删除的需求
   - `## RENAMED Requirements` - 要重命名的需求（FROM:/TO: 格式）

   如果未找到 delta specs，通知用户并停止。

4. **对每个 delta spec，将变更应用到主 spec**

   在首次写入主 spec 之前，获取一个当前 specs-rule 快照：
   - 如果归档内联调用了此工作流并提供了来自 `msdd instructions specs --change "<name>" --json` 的有效快照，重用它且不重新获取相同的指令。
   - 否则现在使用相同的选定根标志运行一次该命令。
   - 如果直接查找以非零状态退出或返回无效的 artifact-instruction JSON，
     在写入任何主 spec 之前报告错误并停止。不要将失败视为缺失规则集。
   - 省略 `rules` 的有效响应意味着未配置产物规则，
     现有的语义合并继续。

   仅将返回的 `rules` 应用于此次合并产生的主 spec 的内容和形式。
   产物规则不是操作指导，不能更改选定的根目录、delta 路径、CLI 检查或工作流步骤。使用其文本作为约束，而不将其原样复制到主 spec 或摘要中。

   对于步骤 3 中选择的每个 capability delta spec 路径 —— 完整的 `existingOutputPaths` 列表，或调用者提供的缩小子集（这些可能属于选定的 store，而非仓库）：

   a. **读取 delta spec** 以了解预期的变更

   b. **读取主 spec**，位于 `<planningHome.root>/msdd/specs/<capability-path>/spec.md`（可能尚不存在）

   c. **智能应用变更**：

      **ADDED Requirements：**
      - 如果需求在主 spec 中不存在 → 添加它
      - 如果需求已存在 → 更新它以匹配（视为隐式 MODIFIED）

      **MODIFIED Requirements：**
      - 在主 spec 中找到该需求
      - 应用变更 - 可以是：
        - 添加主 spec 尚未拥有的新场景
        - 修改现有场景
        - 更改需求描述
      - 保留 delta 中未提及的场景/内容

      **REMOVED Requirements：**
      - 从主 spec 中删除整个需求块
      - 退役 capability。删除整个 `spec.md` —— 以及目录中没有其他内容时删除目录 —— 仅在满足以下所有条件时：
        1. 删除需求后 *本次运行* 留下没有需求块；
        2. spec 的其余部分格式良好（仍有 `## Purpose`）；
        3. 主 spec 在此同步之前并非已为空 —— 如果你什么都没删除，不更改任何内容；
        4. 整个文件中每个其他非空行都被识别为标题、Purpose、Requirements 头或规范需求的陈述、场景或带围栏的示例；
        5. change 的 `.msdd.yaml` 声明 `retire_capabilities: true`；
        6. `spec.md` 解析在真实的 specs 根内（不要遵循 capability 目录符号链接以删除外部文件）。
        如果删除选定的需求会留下没有需求块且任何退役条件不满足，不要修改主 spec。停止该 capability 的同步，报告阻塞条件，并告诉用户如何解决它。绝不写入或留下空的 `## Requirements` 部分。当仅缺少标记时也说明 —— 这是用户可以添加以使退役通过的内容。
      - 删除文件也会删除其 `## Purpose`；任何其他部分都会阻止退役。报告退役时提及 Purpose。仅当 spec 位于调用者的检出中时才包含可粘贴的 `git checkout`；否则提供检出范围内的恢复指导。

      **RENAMED Requirements：**
      - 找到 FROM 需求，重命名为 TO

      **delta 中的 `## Purpose`：**
      - 主 spec 已有且是权威的 - 保持不变
        （这是 `msdd archive` 的做法；它会警告并继续）

   d. **创建新的主 spec**（如果 capability 尚不存在）：
      - 创建 `<planningHome.root>/msdd/specs/<capability-path>/spec.md`
      - 添加 Purpose 部分：当 delta 有 `## Purpose` 时原样复制其正文
        （这是 `msdd archive` 的做法）；仅在没有时写入简短的 TBD 占位符
      - 添加 Requirements 部分，包含 ADDED 需求
      - 遵循下面的**主 spec 格式参考**

5. **验证更新后的主 specs**

   使用与之前相同的选定根标志运行 `msdd validate --specs`。
   如果验证失败，报告问题且不要声称同步成功。

6. **显示摘要**

   应用所有变更后，总结：
   - 更新了哪些 capability
   - 做了哪些变更（需求添加/修改/删除/重命名）
   - 任何保留 TBD Purpose 占位符的新主 spec，以便现在写入而非搁置
   - 任何退役的 capability，命名已删除的 `spec.md`、其 Purpose，以及可粘贴的 `git checkout` 或检出范围内的恢复指导

**Delta Spec 格式参考**

```markdown
## Purpose

仅在引入全新 capability 的 delta 上。为新的主 spec 种子。

## ADDED Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y

## MODIFIED Requirements

### Requirement: Existing Feature
The system SHALL keep doing the existing thing, now also handling A.

#### Scenario: 主 spec 已有的场景
- **WHEN** user does X
- **THEN** system does Y

#### Scenario: 要添加的新场景
- **WHEN** user does A
- **THEN** system does B

## REMOVED Requirements

### Requirement: Deprecated Feature

## RENAMED Requirements

- FROM: `### Requirement: Old Name`
- TO: `### Requirement: New Name`
```

**主 spec 格式参考**

主 spec 是 delta 合并的目标。它们绝不能包含 delta 操作头（`## ADDED/MODIFIED/REMOVED/RENAMED Requirements`）—— 同步后，每个需求都位于单个 `## Requirements` 部分下：

```markdown
# <capability> Specification

## Purpose
简要描述此 capability 的功能和存在原因。

## Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y
```

**核心原则：智能合并**

与编程合并不同，你进行合并而非覆盖：
- MODIFIED 块携带整个需求 - 正文加上变更后保留的每个场景。`msdd validate` 和 `msdd archive` 都会拒绝删除主 spec 仍拥有的场景的变更。
- 保留 delta 未提及的任何内容，按主 spec 的现有顺序
- 使用你的判断力合理地合并变更

**成功时的输出**

```markdown
## Specs 已同步：<change-name>

已更新的主 specs：

**<capability-1>**：
- 添加需求："New Feature"
- 修改需求："Existing Feature"（添加了 1 个场景）

**<capability-2>**：
- 创建了新的 spec 文件
- 添加需求："Another Feature"

主 specs 已更新。Change 仍处于活跃状态 - 实现完成后归档。
```

**护栏**
- 在进行更改之前读取 delta 和主 spec
- 保留 delta 中未提及的现有内容
- 绝不将 delta 文件原样复制到主 spec 中 - 合并其内容，使主 spec 保持主 spec 格式参考结构，不包含 delta 操作头
- 如果某些内容不明确，请求澄清
- 边做边显示正在更改的内容
- 操作应是幂等的 - 运行两次应得到相同结果
- 仅使用 `artifactPaths.specs.existingOutputPaths`；绝不要从无关产物推断 delta specs
- 尊重调用者提供的 `existingOutputPaths` 子集；绝不要将其扩展回完整列表
- 直接同步时获取一次 specs 指令，或在内联中重用归档提供的快照
- 在每次主 spec 写入之前，如果 specs-instruction 响应为非零或无效 JSON 则停止
- 产物规则仅约束正在写入的 spec，绝不复制到输出文件中
