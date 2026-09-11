/**
 * MSDD 构建脚本
 */

import { execSync } from 'node:child_process';
import { rmSync, mkdirSync, copyFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

console.log('🔨 构建 MSDD...\n');

// 清理 dist 目录
console.log('清理 dist 目录...');
if (existsSync(DIST)) {
  rmSync(DIST, { recursive: true, force: true });
}
mkdirSync(DIST, { recursive: true });

// 编译 TypeScript
console.log('编译 TypeScript...');
try {
  execSync('tsc', { stdio: 'inherit', cwd: ROOT });
  console.log('  ✓ TypeScript 编译完成');
} catch (err) {
  console.error('  ✗ TypeScript 编译失败');
  process.exit(1);
}

// 复制模板文件
console.log('\n复制模板文件...');
copyDir(join(ROOT, 'templates'), join(DIST, 'templates'));

// 复制 static 目录
console.log('复制 static 目录...');
copyDir(join(ROOT, 'static'), join(DIST, 'static'));

// 复制 package.json
console.log('复制 package.json...');
copyFileSync(join(ROOT, 'package.json'), join(DIST, 'package.json'));

console.log('\n✅ 构建完成！');

/**
 * 递归复制目录
 */
function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}
