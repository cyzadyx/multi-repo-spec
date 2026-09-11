/**
 * MSDD Update 命令
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  copyDirSync,
  readEnv,
  updateEnv,
  getTemplatesDir,
  getSkillsDir,
  getCommandsDir,
  ensureDir
} from '../utils.js';
import type { CommandOptions } from '../types.js';

export async function update(options: CommandOptions): Promise<void> {
  console.log('🔄 MSDD 更新\n');

  const targetDir = path.resolve(options.target || '.');
  const msddDir = path.join(targetDir, 'msdd');
  const envPath = path.join(msddDir, '.env');

  if (!fs.existsSync(envPath)) {
    console.error('❌ 未找到 msdd/.env 文件');
    console.error('💡 请在项目根目录运行此命令，或使用 --target 指定目录');
    process.exit(1);
  }

  const env = readEnv(envPath);

  console.log(`目标目录: ${targetDir}`);
  console.log(`MSDD 目录: ${msddDir}`);

  console.log('\n📁 更新 multiSpec 内容...');
  const templatesDir = getTemplatesDir();
  copyDirSync(templatesDir, msddDir, {
    exclude: ['node_modules', '.git']
  });
  console.log('  ✓ schemas 已更新');

  const aiToolDir = env.MSDD_AI_TOOL_DIR;
  if (aiToolDir && fs.existsSync(aiToolDir)) {
    console.log(`\n🤖 更新 AI 工具: ${aiToolDir}`);

    const skillsDir = getSkillsDir();
    const targetSkillsDir = path.join(aiToolDir, 'skills');
    ensureDir(targetSkillsDir);
    copyDirSync(skillsDir, targetSkillsDir, {
      exclude: ['node_modules', '.git']
    });
    console.log('  ✓ skills 已更新');

    const commandsDir = getCommandsDir();
    const targetCommandsDir = path.join(aiToolDir, 'commands');
    ensureDir(targetCommandsDir);
    copyDirSync(commandsDir, targetCommandsDir, {
      exclude: ['node_modules', '.git']
    });
    console.log('  ✓ commands 已更新');

    updateEnv(envPath, {
      MSDD_SKILLS_DIR: targetSkillsDir,
      MSDD_COMMANDS_DIR: targetCommandsDir
    });
    console.log('  ✓ .env 已更新');
  } else {
    console.log('\n⚠️  未配置 AI 工具目录，跳过 skills/commands 更新');
    console.log('💡 提示: 运行 msdd init --ai-cursor <dir> 来配置 AI 工具');
  }

  const pkg = JSON.parse(
    fs.readFileSync(
      path.join(getPackageRoot(), 'package.json'),
      'utf-8'
    )
  );
  console.log(`\n✅ MSDD 更新完成！ (v${pkg.version})`);
}

function getPackageRoot(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
}
