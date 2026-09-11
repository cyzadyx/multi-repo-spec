/**
 * MSDD Init 命令
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import {
  copyDirSync,
  readEnv,
  writeEnv,
  getTemplatesDir,
  getSkillsDir,
  getCommandsDir,
  ensureDir
} from '../utils.js';
import type { CommandOptions, EnvConfig } from '../types.js';

const DEFAULT_CONFIG = {
  schema: 'multi-repo' as const
};

export async function init(options: CommandOptions): Promise<void> {
  console.log('🚀 MSDD 初始化\n');

  const targetDir = path.resolve(options.target || '.');
  const msddDir = path.join(targetDir, 'msdd');
  
  console.log(`目标目录: ${targetDir}`);
  console.log(`MSDD 目录: ${msddDir}`);

  ensureDir(targetDir);
  ensureDir(msddDir);

  console.log(`\n📁 复制 multiSpec 内容到: ${msddDir}`);

  const templatesDir = getTemplatesDir();
  copyDirSync(templatesDir, msddDir, {
    exclude: ['node_modules', '.git']
  });
  console.log('  ✓ schemas 已复制');

  const envPath = path.join(msddDir, '.env');
  if (!fs.existsSync(envPath)) {
    const env: EnvConfig = {
      MSDD_ROOT: msddDir,
      MSDD_SCHEMA: options.schema || DEFAULT_CONFIG.schema
    };
    writeEnv(envPath, env);
    console.log('  ✓ .env 已创建');
  } else {
    console.log('  ✓ .env 已存在，跳过');
  }

  const aiToolDir = options['ai-cursor'] || options.ai || null;

  if (aiToolDir) {
    await copyAITools(msddDir, aiToolDir);
  } else {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query: string): Promise<string> =>
      new Promise((resolve) => {
        rl.question(query, resolve);
      });

    try {
      const aiDir = await question(
        '\n📂 请输入 AI 工具的 skills 和 commands 目址（如 ~/.cursor/, 回车跳过）: '
      );
      rl.close();

      if (aiDir && aiDir.trim()) {
        await copyAITools(msddDir, aiDir.trim());
      } else {
        console.log('\n⏭️  跳过 AI 工具配置');
        console.log('💡 提示: 后续可运行 msdd update 来配置 AI 工具');
      }
    } catch (err) {
      rl.close();
      throw err;
    }
  }

  console.log('\n✅ MSDD 初始化完成！');
  console.log('\n📋 下一步:');
  console.log(`  1. 进入项目目录: cd ${targetDir}`);
  console.log('  2. 编辑 msdd/config.yaml 配置项目');
  console.log('  3. 运行 msdd review 检查设计完整性');
}

async function copyAITools(
  msddDir: string,
  aiToolDir: string
): Promise<void> {
  const resolvedAiDir = path.resolve(aiToolDir);
  console.log(`\n🤖 配置 AI 工具: ${resolvedAiDir}`);

  const skillsDir = getSkillsDir();
  const targetSkillsDir = path.join(resolvedAiDir, 'skills');
  ensureDir(targetSkillsDir);
  copyDirSync(skillsDir, targetSkillsDir, {
    exclude: ['node_modules', '.git']
  });
  console.log('  ✓ skills 已复制');

  const commandsDir = getCommandsDir();
  const targetCommandsDir = path.join(resolvedAiDir, 'commands');
  ensureDir(targetCommandsDir);
  copyDirSync(commandsDir, targetCommandsDir, {
    exclude: ['node_modules', '.git']
  });
  console.log('  ✓ commands 已复制');

  const envPath = path.join(msddDir, '.env');
  const env = readEnv(envPath);
  env.MSDD_SKILLS_DIR = targetSkillsDir;
  env.MSDD_COMMANDS_DIR = targetCommandsDir;
  env.MSDD_AI_TOOL_DIR = resolvedAiDir;
  writeEnv(envPath, env);
  console.log('  ✓ .env 已更新');
}
