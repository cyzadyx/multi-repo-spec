/**
 * MSDD 工具函数
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EnvConfig, CopyOptions } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 递归复制目录
 */
export function copyDirSync(
  src: string,
  dest: string,
  options: CopyOptions = {}
): void {
  const { overwrite = true, exclude = [] } = options;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (exclude.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, options);
    } else if (overwrite || !fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 读取 .env 文件
 */
export function readEnv(envPath: string): EnvConfig {
  const env: EnvConfig = {};
  if (!fs.existsSync(envPath)) {
    return env;
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      (env as Record<string, string>)[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return env;
}

/**
 * 写入 .env 文件
 */
export function writeEnv(envPath: string, env: EnvConfig): void {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) continue;
    if (value.includes(' ')) {
      lines.push(`${key}="${value}"`);
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf-8');
}

/**
 * 更新 .env 文件
 */
export function updateEnv(envPath: string, updates: Partial<EnvConfig>): void {
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const line = value.includes(' ') ? `${key}="${value}"` : `${key}=${value}`;

    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += `\n${line}`;
    }
  }

  fs.writeFileSync(envPath, content.trim() + '\n', 'utf-8');
}

/**
 * 确保目录存在
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 获取包根目录
 */
export function getPackageRoot(): string {
  return path.join(__dirname, '..');
}

/**
 * 获取模板目录
 */
export function getTemplatesDir(): string {
  return path.join(getPackageRoot(), 'templates');
}

/**
 * 获取 skills 目录
 */
export function getSkillsDir(): string {
  return path.join(getPackageRoot(), 'static', 'skills');
}

/**
 * 获取 commands 目录
 */
export function getCommandsDir(): string {
  return path.join(getPackageRoot(), 'static', 'commands');
}
