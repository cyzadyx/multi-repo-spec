---
name: msdd-story
description: 从主仓库的需求设计驱动子仓库的故事设计和任务分解。当用户希望基于主仓库的 requirement-design.md 为子仓库生成 story-design.md 和 story-task.md 时使用。
allowed-tools: Bash(msdd:*)
license: MIT
compatibility: Requires msdd CLI.
metadata:
  author: msdd
  version: "1.0"
---

# msdd Story

从主仓库的需求设计驱动子仓库的故事设计和任务分解。

本流程从主仓 requirement-design.md 的 story 章节出发，自动识别涉及的子仓，在每个子仓中生成完整的 story-design.md 和 story-task.md。

**仓库选择：** 如果用户指定了仓库，运行 `msdd store list --json` 并在读写 specs 和 changes 的命令上使用 `--store <id>`。没有仓库时，命令作用于最近的本地 `msdd/` 根目录。

**输入**：主仓 change 名。缺省时从上下文推断；无法推断时，用 `msdd list --json` 列出可选 change 让用户选择。

**步骤**

1. **选择变更**

   询问用户（如果未提供）：
   > "您要处理哪个主仓库变更？"

   推导主仓库变更名称（kebab-case格式）。

   提示："正在使用变更：<main-change>"

2. **读取主仓库工件**

   ```bash
   msdd status --change "<main-change>" --json
   ```

   解析 JSON 获取 `planningHome`、`changeRoot` 和 `artifactPaths`。读取以下工件：

   - **requirement-proposal.md**: 为什么/什么变更/能力/影响
   - **specs/**: 全局/跨仓行为契约（delta 文件）
   - **requirement-design.md**: story-design 拆分

   从 `## 跨仓总览` 部分提取子仓库列表。每个子仓库表示为一个 story 章节：`## Story: <sub-repo-name>`。

   如果没有 story 章节，通知用户并停止。

3. **对每个子仓库执行步骤 4-8**

4. **初始化子仓库 msdd（如果需要）**

   检查 `<sub-repo-path>/msdd/` 是否存在。如果不存在：

   ```bash
   cd <sub-repo-path>
   msdd init
   ```

   将 story-driven schema 复制到子仓库：

   ```bash
   mkdir -p <sub-repo-path>/msdd/schemas/story-driven
   cp -r <main-repo>/msdd/schemas/story-driven/* <sub-repo-path>/msdd/schemas/story-driven/
   ```

   在 `<sub-repo-path>/msdd/config.yaml` 中设置子仓库 schema 为 story-driven。

5. **创建子仓库变更**

   ```bash
   cd <sub-repo-path>
   msdd new change "<main-change>-<sub-repo>" --schema story-driven
   ```

   示例：主变更 `add-user-auth`，子仓库 `my-app` → 变更名称 `add-user-auth-my-app`

6. **设置 skip_specs: true**

   编辑 `<sub-repo-path>/msdd/changes/<change-name>/.msdd.yaml` 并添加：

   ```yaml
   skip_specs: true
   ```

   子仓不做 delta specs（行为契约统一维护在主仓 specs/）。

7. **生成 story-design.md**

   获取指令：

   ```bash
   msdd instructions design --change "<change-name>" --json
   ```

   读取指令并基于以下内容创建 `story-design.md`：

   - **需求输入**：引用主仓文档作为需求来源
     - proposal: 为什么/什么变更/能力
     - specs/: 行为契约（关键 Requirement 和 Scenario）
     - requirement-design.md: 本仓 story（目标/范围/验收要点）
     - **ux-code.md**: UCD结构化描述文档（前端设计参考）
   - **上下文**: 当前状态和约束
   - **目标 / 非目标**: 此设计要实现什么
   - **决策**: 关键技术选择及理由
   - **风险 / 权衡**: 已知限制
   - **迁移计划**: 部署步骤（如适用）
   - **待解决问题**: 可延迟的未知项

   **前端页面设计规则**：
   - 如果涉及前端页面实现，必须引用 `ux-code.md` 作为设计依据
   - 从 `ux-code.md` 提取页面结构、组件、交互规范
   - 页面样式实现时，可通过 MCP 获取 UCD 结构进行页面绘制

   写入指令中的 `resolvedOutputPath`。

8. **生成 story-task.md**

   获取指令：

   ```bash
   msdd instructions tasks --change "<change-name>" --json
   ```

   读取指令并基于以下内容创建 `story-task.md`：

   - 将相关任务分组到 ## 编号标题下
   - 每个任务必须是复选框：`- [ ] X.Y 任务描述`
   - 按依赖关系排序任务
   - 包含「测试执行」任务组
   - **前端任务**：如果涉及前端页面，任务应包含引用 `ux-code.md` 中的UCD结构

   **前端任务示例**：
   ```markdown
   ## 1. 页面结构实现
   - [ ] 1.1 引用 ux-code.md 的 UCD-01 页面布局
   - [ ] 1.2 实现搜索筛选区组件
   - [ ] 1.3 实现数据表格列定义
   - [ ] 1.4 实现行操作菜单
   
   ## 2. 交互实现
   - [ ] 2.1 实现搜索交互
   - [ ] 2.2 实现表格交互
   ```

   写入指令中的 `resolvedOutputPath`。

9. **验证工件**

   ```bash
   msdd status --change "<change-name>"
   ```

   确认 `story-design.md` 和 `story-task.md` 都已创建。

10. **显示摘要**

    输出：
    - 主变更名称
    - 已处理的子仓库及其变更名称
    - 每个子仓库创建的工件：story-design.md、story-task.md
    - 下一步："在每个子仓库中运行 `/opsx-apply` 开始实现。"

**安全准则**
- 在创建 story-design 前读取所有主仓库工件（proposal、specs、requirement-design）——始终从磁盘重新读取
- story-design.md 必须引用主仓库工件中的需求输入，而不是重复陈述
- story-task.md 任务必须可验证且足够小，能在一次会话中完成
- 不要修改主仓库工件——此技能仅创建子仓库工件
- 如果子仓库已有此主变更的变更，询问用户是要继续还是创建新变更
