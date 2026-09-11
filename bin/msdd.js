#!/usr/bin/env node

/**
 * MSDD CLI 入口
 */

import { Command } from 'commander';
import { init } from '../dist/commands/init.js';
import { update } from '../dist/commands/update.js';
import { review } from '../dist/commands/review.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const program = new Command();

program
  .name('msdd')
  .description('MSDD - Multi-Spec Driven Development: 多仓/单仓规范驱动开发工具')
  .version(pkg.version);

program
  .command('init')
  .description('初始化 MSDD 项目')
  .option('-t, --target <path>', '目标目录', '.')
  .option('-s, --schema <schema>', 'Schema 类型 (multi-repo, story-driven, single-repo)', 'multi-repo')
  .option('--ai <path>', 'AI 工具目录')
  .option('--ai-cursor <path>', 'Cursor AI 工具目录')
  .action(async (options) => {
    try {
      await init(options);
    } catch (err) {
      console.error('错误:', err);
      process.exit(1);
    }
  });

program
  .command('update')
  .description('更新 MSDD 包及 AI 工具配置')
  .option('-t, --target <path>', '目标目录', '.')
  .action(async (options) => {
    try {
      await update(options);
    } catch (err) {
      console.error('错误:', err);
      process.exit(1);
    }
  });

program
  .command('review')
  .description('检查当前设计生成的完整性')
  .option('-t, --target <path>', '目标目录', '.')
  .action(async (options) => {
    try {
      await review(options);
    } catch (err) {
      console.error('错误:', err);
      process.exit(1);
    }
  });

program.parse();
