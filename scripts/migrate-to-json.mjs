#!/usr/bin/env node
// 一次性迁移脚本: 把 src/data/collections.ts 里的硬编码数组导出成 data/collections.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// 直接动态 import TS 不方便,这里用 tsx 的方式: 通过 vite 的 esbuild 转译
// 简化: 直接 import 编译后的 JS,我们用 esbuild 命令行转一次

import { build } from 'esbuild';

const out = await build({
  entryPoints: [resolve(root, 'src/data/collections.ts')],
  bundle: false,
  format: 'esm',
  platform: 'node',
  write: false,
  target: 'es2022',
});
const code = out.outputFiles[0].text;
// 写到一个临时 mjs 然后 import
const tmp = resolve(root, '.collections.tmp.mjs');
writeFileSync(tmp, code);
const mod = await import('file://' + tmp);
const { collections } = mod;

mkdirSync(resolve(root, 'data'), { recursive: true });
writeFileSync(
  resolve(root, 'data/collections.json'),
  JSON.stringify({ collections }, null, 2),
  'utf8',
);
console.log(`✓ Wrote data/collections.json (${collections.length} collections)`);

// 清理临时
import { unlinkSync } from 'node:fs';
unlinkSync(tmp);
