/**
 * MSDD - Multi-Spec Driven Development
 * 多仓/单仓规范驱动开发工具
 */

export * from './types.js';
export * from './utils.js';

// 命令
export { init } from './commands/init.js';
export { update } from './commands/update.js';
export { review } from './commands/review.js';

// 常量
export const SCHEMAS = ['multi-repo', 'story-driven', 'single-repo'] as const;
export const VERSION = '1.0.0';
