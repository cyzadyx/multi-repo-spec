---
name: msdd-sync-specs
description: 将增量规范从变更同步到主规范。当用户想要用增量规范中的更改更新主规范而不归档变更时使用。
allowed-tools: Bash(msdd:*)
license: MIT
compatibility: Requires msdd CLI.
metadata:
  author: msdd
  version: "1.0"
  generatedBy: "1.7.0"
---

将增量规范从变更同步到主规范。

这是一个**代理驱动**的操作 - 你将读取增量规范并直接编辑主规范以应用更改。这允许智能合并（例如，添加场景而无需复制整个需求）。

**存储选择：** 如果用户指定了存储（存储是在此机器上注册的独立 msdd 仓库）或工作在其中一个存储中，请运行 `msdd store list --json` 来发现已注册的存储 ID，然后在读取或写入规范和变更的命令（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）上传递 `--store <id>`。其他命令不接受该标志。命令打印的提示已经包含该标志；在后续操作中保持它。如果没有存储，命令将作用于最近的本地 `msdd/` 根目录。

**输入**：可选指定变更名称。如果省略，检查是否可以从对话上下文中推断。如果模糊或不明确，你必须提示可用的变更。

**步骤**

1. **选择变更**

   如果提供了名称，则使用它。否则：
   - 如果用户提到了变更，从对话上下文中推断
   - 如果只有一个活跃变更存在，则自动选择
   - 如果不明确，运行 `msdd list --json` 获取可用的变更并让用户选择一个

   提示时，显示具有增量规范（在 `specs/` 目录下）的变更。

   始终宣布："正在使用变更：<name>"以及如何覆盖（例如，`/opsx-sync <other>`）。

2. **解析变更上下文**

   运行：
   ```bash
   msdd status --change "<name>" --json
   ```

   JSON 包含 `planningHome.root`。主规范位于 `<planningHome.root>/msdd/specs/` 下 - 对于下面的每个主规范路径，使用该（存储感知的）根目录，而不是硬编码的仓库路径。当选择存储时，它指向存储，而不是当前仓库。

3. **查找增量规范**

   使用状态 JSON 中的 `artifactPaths.specs.existingOutputPaths` 作为增量规范路径的唯一来源。如果 `specs` 条目缺失或 `existingOutputPaths` 为空，请报告没有要同步的增量规范，不要从其他产物推断它们，并在不请求产物指令或写入主规范的情况下停止。

   同步 `existingOutputPaths` 中的每个路径，除非调用者缩小了集合。
   调用者通过命名显式增量规范路径列表来缩小它 - 归档会内联执行此操作，用户也可以（"仅同步计费增量"）。
   然后仅同步命名的路径，让其余增量规范保持不变：
   批量归档排除其无法找到实现的增量，同步它会写入调用者故意保留的主规范。
   将该缩小的选择贯穿步骤 4；永远不要将其扩展回完整列表。如果命名的路径不在 `existingOutputPaths` 中，请不要同步它 - 报告它并停止，而不是静默丢弃。如果命名的列表为空，请报告没有可同步的内容并在不写入主规范的情况下停止。

   每个增量规范文件包含以下部分：
   - `## ADDED Requirements` - 要添加的新需求
   - `## MODIFIED Requirements` - 对现有需求的更改
   - `## REMOVED Requirements` - 要移除的需求
   - `## RENAMED Requirements` - 要重命名的需求（FROM:/TO: 格式）

   如果未找到增量规范，通知用户并停止。

4. **对于每个增量规范，将更改应用到主规范**

   在第一次主规范写入之前，获取一个当前规范规则快照：
   - 如果归档内联调用此工作流并从 `msdd instructions specs --change "<name>" --json` 提供了有效快照，请重用它，不要再次获取相同的指令。
   - 否则使用相同的选定根目录标志现在运行一次该命令。
   - 如果直接查找以非零状态退出或返回无效的产物指令 JSON，请在写入任何主规范之前报告错误并停止。不要将失败视为缺失规则集。
   - 省略 `rules` 的有效响应意味着未配置产物规则，现有的语义合并继续。

   仅将返回的 `rules` 应用于由此合并产生的主规范的内容和形式。产物规则不是操作指导，不能更改选定的根目录、增量路径、CLI 检查或工作流步骤。使用它们的文本作为约束，而不要将其逐字复制到主规范或摘要中。

   对于步骤 3 中选择的每个功能增量规范路径 - 完整的 `existingOutputPaths` 列表，或者调用者提供的缩小子集（这些可能属于选定的存储，而不是仓库）：

   a. **读取增量规范** 以了解预期的更改

   b. **读取主规范** 在 `<planningHome.root>/msdd/specs/<capability>/spec.md`（可能尚不存在）

   c. **智能应用更改**：

      **ADDED Requirements：**
      - 如果需求在主规范中不存在 → 添加它
      - 如果需求已存在 → 更新它以匹配（视为隐式 MODIFIED）

      **MODIFIED Requirements：**
      - 在主规范中找到需求
      - 应用更改 - 这可以是：
        - 添加新场景（不需要复制现有场景）
        - 修改现有场景
        - 更改需求描述
      - 保留增量中未提及的场景/内容

      **REMOVED Requirements：**
      - 从主规范中移除整个需求块

      **RENAMED Requirements：**
      - 找到 FROM 需求，重命名为 TO

      **增量中的 `## Purpose`：**
      - 主规范已有一个且它是权威的 - 让它保持原样（这就是 `msdd archive` 所做的；它警告并继续）

   d. **如果功能尚不存在则创建新的主规范**：
      - 创建 `<planningHome.root>/msdd/specs/<capability>/spec.md`
      - 添加 Purpose 部分：当增量有 `## Purpose` 时逐字复制其正文（这就是 `msdd archive` 所做的）；仅在没有时写入简短的 TBD 占位符
      - 添加包含 ADDED 需求的 Requirements 部分
      - 遵循下面的**主规范格式参考**

5. **显示摘要**

   应用所有更改后，总结：
   - 哪些功能被更新了
   - 做了哪些更改（需求添加/修改/删除/重命名）
   - 任何带有 TBD Purpose 占位符的新主规范，以便现在编写它而不是让它持续存在

**增量规范格式参考**

```markdown
## Purpose

仅在引入全新功能的增量上。为新主规范播种。

## ADDED Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y

## MODIFIED Requirements

### Requirement: Existing Feature
#### Scenario: New scenario to add
- **WHEN** user does A
- **THEN** system does B

## REMOVED Requirements

### Requirement: Deprecated Feature

## RENAMED Requirements

- FROM: `### Requirement: Old Name`
- TO: `### Requirement: New Name`
```

**主规范格式参考**

主规范是增量合并到的目标。它们绝不能包含增量操作头（`## ADDED/MODIFIED/REMOVED/RENAMED Requirements`）- 同步后，每个需求都位于单个 `## Requirements` 部分下：

```markdown
# <capability> Specification

## Purpose
此功能的作用及其存在的原因的简短描述。

## Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y
```

**关键原则：智能合并**

与程序化合并不同，你可以应用**部分更新**：
- 要添加场景，只需在 MODIFIED 下包含该场景 - 不要复制现有场景
- 增量代表*意图*，而不是整体替换
- 使用你的判断力来合理合并更改

**成功时的输出**

```markdown
## 规范已同步：<change-name>

已更新主规范：

**<capability-1>**：
- 添加需求："New Feature"
- 修改需求："Existing Feature"（添加了 1 个场景）

**<capability-2>**：
- 创建了新的规范文件
- 添加需求："Another Feature"

主规范现已更新。变更保持活跃 - 实现完成后归档。
```

**防护栏**
- 在进行更改之前读取增量规范和主规范
- 保留增量中未提及的现有内容
- 永远不要将增量文件逐字复制到主规范中 - 合并其内容，使主规范保持主规范格式参考结构，没有增量操作头
- 如果某些内容不清楚，请请求澄清
- 边做边显示你正在更改的内容
- 操作应该是幂等的 - 运行两次应该给出相同的结果
- 仅使用 `artifactPaths.specs.existingOutputPaths`；永远不要从不相关的产物推断增量规范
- 尊重调用者提供的 `existingOutputPaths` 子集；永远不要将其扩展回完整列表
- 对于直接同步获取一次规范指令，或内联重用归档提供的快照
- 在每次主规范写入之前，如果规范指令响应为非零或无效 JSON 则停止
- 产物规则仅约束正在编写的规范，绝不会复制到输出文件中