/**
 * MSDD Review 命令
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { readEnv } from '../utils.js';
import type { CommandOptions, SchemaConfig } from '../types.js';

const EXPECTED_FILES: Record<string, SchemaConfig> = {
  'multi-repo': {
    name: 'multi-repo',
    description: '多仓工作流',
    required: ['requirement-proposal.md', 'requirement-design.md'],
    optional: ['requirement-test-design.md'],
    specsDir: 'specs'
  },
  'story-driven': {
    name: 'story-driven',
    description: '子仓工作流',
    required: ['story-design.md', 'story-task.md'],
    optional: ['story-test.md'],
    specsDir: null
  },
  'single-repo': {
    name: 'single-repo',
    description: '单仓工作流',
    required: ['proposal.md', 'design.md', 'tasks.md'],
    optional: ['test-design.md'],
    specsDir: 'specs'
  }
};

export async function review(options: CommandOptions): Promise<void> {
  console.log('🔍 MSDD 设计完整性检查\n');

  const targetDir = path.resolve(options.target || '.');
  const msddDir = path.join(targetDir, 'msdd');
  const envPath = path.join(msddDir, '.env');

  if (!fs.existsSync(envPath)) {
    console.error('❌ 未找到 msdd/.env 文件');
    console.error('💡 请在项目根目录运行此命令，或使用 --target 指定目录');
    process.exit(1);
  }

  const env = readEnv(envPath);
  const schema = env.MSDD_SCHEMA || 'multi-repo';

  console.log(`项目目录: ${targetDir}`);
  console.log(`MSDD 目录: ${msddDir}`);
  console.log(`当前 schema: ${schema}`);

  const schemaConfig = EXPECTED_FILES[schema];
  if (!schemaConfig) {
    console.error(`❌ 未知的 schema: ${schema}`);
    console.error(`💡 支持的 schema: ${Object.keys(EXPECTED_FILES).join(', ')}`);
    process.exit(1);
  }

  console.log('\n📋 检查必需文件...');
  const missingRequired: string[] = [];
  for (const file of schemaConfig.required) {
    const filePath = path.join(targetDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✓ ${file}`);
    } else {
      console.log(`  ✗ ${file} (缺失)`);
      missingRequired.push(file);
    }
  }

  console.log('\n📋 检查可选文件...');
  for (const file of schemaConfig.optional) {
    const filePath = path.join(targetDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✓ ${file}`);
    } else {
      console.log(`  ○ ${file} (未创建)`);
    }
  }

  if (schemaConfig.specsDir) {
    console.log('\n📁 检查 specs 目录...');
    const specsDir = path.join(targetDir, schemaConfig.specsDir);
    if (fs.existsSync(specsDir)) {
      const specFiles = fs.readdirSync(specsDir).filter((f) => f.endsWith('.md'));
      if (specFiles.length > 0) {
        console.log(`  ✓ ${schemaConfig.specsDir}/ (${specFiles.length} 个 spec 文件)`);
        for (const spec of specFiles) {
          console.log(`    - ${spec}`);
        }
      } else {
        console.log(`  ○ ${schemaConfig.specsDir}/ (空目录)`);
      }
    } else {
      console.log(`  ○ ${schemaConfig.specsDir}/ (未创建)`);
    }
  }

  console.log('\n📁 检查 changes 目录...');
  const changesDir = path.join(msddDir, 'changes');
  if (fs.existsSync(changesDir)) {
    const changes = fs.readdirSync(changesDir).filter((f) => {
      const stat = fs.statSync(path.join(changesDir, f));
      return stat.isDirectory();
    });
    if (changes.length > 0) {
      console.log(`  ✓ changes/ (${changes.length} 个 change)`);
      for (const change of changes) {
        console.log(`    - ${change}`);
      }
    } else {
      console.log(`  ○ changes/ (空目录)`);
    }
  } else {
    console.log(`  ○ changes/ (未创建)`);
  }

  console.log('\n🤖 检查 AI 工具配置...');
  if (env.MSDD_AI_TOOL_DIR) {
    console.log(`  ✓ AI 工具目录: ${env.MSDD_AI_TOOL_DIR}`);
    if (env.MSDD_SKILLS_DIR) {
      console.log(`  ✓ Skills 目录: ${env.MSDD_SKILLS_DIR}`);
    }
    if (env.MSDD_COMMANDS_DIR) {
      console.log(`  ✓ Commands 目录: ${env.MSDD_COMMANDS_DIR}`);
    }
  } else {
    console.log('  ○ 未配置 AI 工具');
  }

  console.log('\n📊 检查总结...');
  if (missingRequired.length > 0) {
    console.log(`❌ 缺失 ${missingRequired.length} 个必需文件`);
    console.log('💡 请创建以下文件:');
    for (const file of missingRequired) {
      console.log(`   - ${file}`);
    }
    process.exit(1);
  } else {
    console.log('✅ 所有必需文件已就绪');
  }
}
