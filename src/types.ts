/**
 * MSDD 类型定义
 */

// Schema 类型
export type SchemaType = 'multi-repo' | 'story-driven' | 'single-repo';

// 命令选项
export interface CommandOptions {
  target?: string;
  schema?: SchemaType;
  ai?: string;
  'ai-cursor'?: string;
  help?: boolean;
  version?: boolean;
}

// 环境变量
export interface EnvConfig {
  MSDD_ROOT?: string;
  MSDD_SCHEMA?: SchemaType;
  MSDD_AI_TOOL_DIR?: string;
  MSDD_SKILLS_DIR?: string;
  MSDD_COMMANDS_DIR?: string;
}

// Schema 配置
export interface SchemaConfig {
  name: SchemaType;
  description: string;
  required: string[];
  optional: string[];
  specsDir: string | null;
}

// 项目配置
export interface ProjectConfig {
  schema: SchemaType;
  context?: string;
  [key: string]: unknown;
}

// 命令接口
export interface Command {
  name: string;
  description: string;
  handler: (options: CommandOptions) => Promise<void>;
}

// 复制选项
export interface CopyOptions {
  overwrite?: boolean;
  exclude?: string[];
}

// 模板文件
export interface TemplateFile {
  path: string;
  content: string;
}

// 检查结果
export interface ReviewResult {
  missingRequired: string[];
  missingOptional: string[];
  specs: string[];
  changes: string[];
  aiToolConfig: {
    configured: boolean;
    dir?: string;
    skillsDir?: string;
    commandsDir?: string;
  };
}
