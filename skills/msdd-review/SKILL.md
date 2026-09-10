---
name: msdd-review
description: 审查主仓库 msdd 产物的一致性、正确性和边界合规性，并编写带日期的报告。当用户要求审查/验证 proposal+specs+design、检查跨文档对齐或生成 msdd 审查报告时调用。
allowed-tools: Bash(msdd:*)
license: MIT
compatibility: Requires msdd CLI.
metadata:
  author: msdd
  version: "1.0"
---

# msdd 审查

审查 msdd 变更的主仓库（multi-repo 模式）产物并生成带日期的审查报告。

本项目主仓 schema 为 multi-repo。本命令审查 requirement-proposal.md / specs/* / requirement-design.md 三份产物的**一致性（跨产物对齐）、正确性（各产物内部与 spec 规范）、边界线（design 禁代码设计、design 接口契约层级、spec 为行为契约、proposal 不越界扩需求）**。
报告输出路径：`msdd/changes/<changeName>/YYYY-MM-DD-msdd-review.md`。
**存储选择：** 如果用户指定了存储，请运行 `msdd store list --json` 并在读取或写入规范和变更的命令上传递 `--store <id>`。如果没有存储，命令将作用于最近的本地 `msdd/` 根目录。

**输入**：主仓变更名称（例如 `/opsx-review add-auth`）。默认从上下文推断；无法推断时使用 `msdd list --json` 列出可用变更让用户选择。
**步骤**

1. **选择变更** - 使用与 /opsx-apply 相同的选择规则；宣布"正在使用变更：<name>"

2. **读取状态和产物**

   ```bash
   msdd status --change "<name>" --json
   ```

   解析 planningHome/changeRoot/artifactPaths。对 proposal、specs、design 三个产物的 resolvedOutputPath 逐个读取（specs 为 glob 时枚举 concrete files）。产物缺失时记录为"未就绪"，不评具体项。
3. **按维度运行审查**

   按下列维度逐项检查，每条发现打严重度：P0(阻塞) / P1(重要) / P2(建议)，并带定位（文件+章节/行号/条目名）。
   ### 3a. 正确性 - proposal 内部
   - [PROP-01] Why / What Changes / Capabilities / Impact 四节完整，无空章节。
   - [PROP-02] Capabilities New/Modified 名称为 kebab-case，无二义性 `<name>` 占位。
   - [PROP-03] Modified Capabilities 条目标注的 capability 名在 `msdd/specs/` 实际存在（若有修改条目的话）。
   - [PROP-04] Impact 列出涉及的子仓（至少列出一个子仓；纯跨仓/纯单仓都应明确）。
   - [PROP-05] What Changes 条目不与 Capabilities 矛盾（What 说改 A，Capability 里只提 B 则告警）。

   ### 3b. 正确性 - specs 内部
   - [SPEC-01] 每个 delta 文件有 **ADDED/MODIFIED/REMOVED/RENAMED** 四级头分组，不混合。
   - [SPEC-02] 每条 requirement 标题 `### Requirement: <name>` 非空且唯一。
   - [SPEC-03] 每条 requirement 至少一个 `#### Scenario: ...`（恰好 4 个 #），使用 WHEN/THEN。
   - [SPEC-04] 规范性表述用 SHALL/MUST（出现 should/may 提示）。
   - [SPEC-05] ADDED 的新 capability 有 `## Purpose` 且 50+ 字符。
   - [SPEC-06] MODIFIED 块复制了原 requirement 完整块再修改（只改片段则 P0）。
   - [SPEC-07] REMOVED 块有 Reason + Migration。
   - [SPEC-08] 行为描述**不写实现细节**（类名、函数签名、文件路径、框架 API 等）——规范边界。
   - [SPEC-09] delta 中的 Requirement 命名语义通顺、不与 capability 已有名称冲突。

   ### 3c. 正确性 - design（requirement-design.md）内部
   - [DES-01] 有「跨仓总览」且与 proposal Impact 一致。
   - [DES-02] 涉及的子仓 story 章节齐全（涉及的仓必须有对应 story 章节，不涉及的仓不得出现空章节占位）。
   - [DES-03] 每个 story 都有目标/范围/依赖与接口/验收要点四小节，子仓 change 小节或空或有说明。
   - [DES-04] 验收要点可验证（不是空话/含糊）。
   ### 3d. 边界线
   - [BD-01] design **禁代码设计**：扫描 requirement-design.md 是否出现函数签名、目录树、框架选型、文件名、import 语句、路由配置、数据库表结构等实现细节。出现则 P0，指出具体位置。
   - [BD-02] design 接口契约**仅契约级**：检查「接口契约」章节是否出现实现细节（如上列），是否只写端点/字段/协议/状态码/事件。出现实现细节则 P1。
   - [BD-03] specs **为行为契约**：SPEC-08 重复项（同上）。
   - [BD-04] proposal **不越界扩需求**：What Changes 与 Capabilities 对照原始需求（若用户原始需求有记录），不得凭空扩大范围。若该 change 附带原始需求背景可对照则做，否则跳过此项。
   ### 3e. 一致性（跨产物对齐）
   - [CONS-01] proposal Capabilities 列出的每个 New 条目在 specs/ 下实际有对应文件夹 & spec.md。
   - [CONS-02] proposal Capabilities 列出的每个 Modified 条目在 specs/ 下实际有对应 delta。
   - [CONS-03] specs/ 中每个 Requirement 都能在 requirement-design.md 的验收要点中找到对应（至少一条验收要点引用该 Requirement 名称或语义）。
   - [CONS-04] requirement-design.md 每个 story 的「验收要点」对应 specs/ 中的 Requirement（反向）。
   - [CONS-05] requirement-design.md 涉及的子仓列表 == proposal Impact 列出的受影响子仓。
   - [CONS-06] requirement-design.md「接口契约」与 specs 中跨仓 Requirement 一致（相互无遗漏/矛盾）。
   - [CONS-07] 对应 capability 名称在 proposal / specs / design 三产物间拼写一致。
4. **可选：调用 validate 进行增量健全性检查**

   若 specs/ 非空，执行 `msdd validate <changeName>`，其输出以「CLI validate」小节原样记录到报告中（不改严重度）。失败时将报错条目记录为 P0。
5. **编写带日期的审查报告**

   文件名：`msdd/changes/<changeName>/YYYY-MM-DD-msdd-review.md`（YYYY-MM-DD 为当天日期）。
   结构：
   ```markdown
   # msdd 审查报告 <changeName>
   - 日期：YYYY-MM-DD
   - 严重度总计：P0=N  P1=N  P2=N  通过=N

   ## 执行摘要
   总体判断：✅ 通过 / 🟡 有重要问题 / 🔴 阻塞性问题；
   必须先处理的 P0：列表...
   ## 各维度结果
   - 正确性：proposal
   - 正确性：specs
   - 正确性：design
   - 边界线
   - 一致性
   ## 发现清单
   每条...
   | ID  | 严重度 | 产物 | 定位 | 描述 | 建议 |
   |-----|--------|------|------|------|------|
   | ... |        |      |      |      |      |

   ## CLI validate（若执行）
   ```

   ID 复用上面 3a-3e 检查编号，发现为"通过"的不列入发现清单，只在「各维度结果」中点名通过；有问题的条目列入发现清单并附建议；额外发现加前缀 XTRA-。
6. **显示摘要**

   输出报告路径、严重度计数、P0 列表。不自动修改产物文件——是否修复留给用户选择。
**防护栏**
- 审查只读不改，报告为唯一输出；不修改任何 requirement-* 或 specs 文件。
- 未就绪产物显式标注"未就绪"，不评具体项，避免假阳性。
- 严重度保守：边界线与一致性越界一律 P0/P1，措辞/格式问题 P2。
- 报告文件写在 change 目录下，便于归档与 review。
- 输出中用 resolvedOutputPath，不要假设路径。