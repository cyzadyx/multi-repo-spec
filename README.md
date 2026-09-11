# MSDD - Multi-Spec Driven Development

> 多仓/单仓规范驱动开发工具

[![npm version](https://img.shields.io/npm/v/msdd)](https://www.npmjs.com/package/msdd)
[![License: MIT](https://img.shields.io/npm/l/msdd)](https://opensource.org/licenses/MIT)

MSDD 是一个基于规范驱动开发（SDD）的工具，帮助你在编写代码之前先定义需求。与 OpenSpec 类似，MSDD 使用 `proposal → specs → design → tasks` 的工作流，但额外支持**多仓开发模式**。

## 特性

- 🔄 **三种工作流模式**：多仓（multi-repo）、子仓（story-driven）、单仓（single-repo）
- 🤖 **30+ AI 工具支持**：Claude Code、Cursor、Windsurf、Copilot、CodeArts、Fornecode、Hermes 等
- 📝 **规范驱动**：先定义需求，再编写代码
- 🔧 **灵活可扩展**：自定义 schemas、skills、commands

## 安装

```bash
npm install -g msdd
```

## 使用方法

### 初始化项目

```bash
# 在当前目录初始化
msdd init

# 指定目标目录
msdd init --target ./my-project

# 指定 schema 类型
msdd init --target ./my-project --schema single-repo

# 指定 AI 工具目录
msdd init --target ./my-project --ai-cursor ~/.cursor/
```

### 检查设计完整性

```bash
msdd review --target ./my-project
```

### 更新包和 AI 工具配置

```bash
msdd update --target ./my-project
```

## 工作流

### 命令一览

| 命令 | 说明 |
|------|------|
| `msdd init` | 初始化 MSDD 项目，复制 schemas/skills/commands 到目标目录 |
| `msdd update` | 更新 MSDD 包，同步 skills/commands 到 AI 工具目录 |
| `msdd review` | 检查当前设计生成的完整性 |

### Schema 类型

| Schema | 说明 | 产物 |
|--------|------|------|
| `multi-repo` | 多仓模式（默认） | requirement-proposal.md, specs/, requirement-design.md |
| `story-driven` | 子仓模式 | story-design.md, story-task.md |
| `single-repo` | 单仓模式 | proposal.md, design.md, tasks.md |

## 项目结构

初始化后，项目目录结构如下：

```
my-project/
├── msdd/
│   ├── .env
│   ├── config.yaml
│   ├── schemas/
│   │   ├── multi-repo/
│   │   ├── story-driven/
│   │   └── single-repo/
│   ├── changes/
│   └── specs/
└── proposal.md (或 requirement-proposal.md)
```

## 与 OpenSpec 对比

| 特性 | OpenSpec | MSDD |
|------|----------|------|
| **定位** | 单仓 SDD | 多仓/单仓 MSDD |
| **目录** | `openspec/` | `msdd/` |
| **Schemas** | `spec-driven` | `multi-repo`, `story-driven`, `single-repo` |
| **多仓支持** | ❌ | ✅ |
| **AI 工具** | 30+ | 30+ |
| **自定义 Schema** | ✅ | ✅ |

## 快速开始

```bash
# 1. 安装
npm install -g msdd

# 2. 初始化
msdd init --target ./my-project --schema single-repo

# 3. 编写 proposal.md
vim my-project/proposal.md

# 4. 检查完整性
msdd review --target ./my-project

# 5. 开始开发
cd my-project
```

## 许可证

MIT
