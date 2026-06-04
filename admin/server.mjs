// 本地后台 API 服务器
// 启动: npm run admin (在 http://localhost:5174 打开)
// 仅监听 127.0.0.1,只供本机使用

import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  readdirSync,
  renameSync,
} from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_FILE = resolve(ROOT, 'data/collections.json');
const PHOTOS_DIR = resolve(ROOT, 'public/photos');

// ===== 工具 =====
function readData() {
  return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
}
function writeData(d) {
  writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf8');
}
function slugify(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-') || 'untitled';
}
function nextPhotoIndex(slug) {
  const dir = resolve(PHOTOS_DIR, slug);
  if (!existsSync(dir)) return 1;
  const nums = readdirSync(dir)
    .map((f) => parseInt(f.match(/^(\d+)\.webp$/)?.[1] ?? '0', 10))
    .filter((n) => n > 0);
  return nums.length ? Math.max(...nums) + 1 : 1;
}
function pad2(n) {
  return String(n).padStart(2, '0');
}
function findCollection(d, slug) {
  return d.collections.find((c) => c.slug === slug);
}

// ===== app =====
const app = express();
app.use(express.json({ limit: '20mb' }));
app.use('/photos', express.static(PHOTOS_DIR));
app.use('/avatar', express.static(resolve(ROOT, 'public/avatar')));

// 根路径返回后台 UI
app.use('/', express.static(resolve(__dirname, 'ui')));

// 列出所有集合
app.get('/api/collections', (_req, res) => {
  res.json(readData());
});

// 新建集合
app.post('/api/collections', (req, res) => {
  const d = readData();
  const { title, subtitle = '', description = '', category = '人文', year = String(new Date().getFullYear()) } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });
  let slug = slugify(req.body.slug || title);
  // 防重
  while (d.collections.some((c) => c.slug === slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
  const col = { slug, title, subtitle, description, cover: '', category, year, photos: [] };
  d.collections.unshift(col);
  writeData(d);
  mkdirSync(resolve(PHOTOS_DIR, slug), { recursive: true });
  res.json(col);
});

// 更新集合元数据
app.patch('/api/collections/:slug', (req, res) => {
  const d = readData();
  const c = findCollection(d, req.params.slug);
  if (!c) return res.status(404).json({ error: 'not found' });
  const allowed = ['title', 'subtitle', 'description', 'category', 'year', 'cover'];
  for (const k of allowed) if (k in req.body) c[k] = req.body[k];
  writeData(d);
  res.json(c);
});

// 删除集合 (含其图片目录)
app.delete('/api/collections/:slug', (req, res) => {
  const d = readData();
  const i = d.collections.findIndex((c) => c.slug === req.params.slug);
  if (i < 0) return res.status(404).json({ error: 'not found' });
  d.collections.splice(i, 1);
  writeData(d);
  const dir = resolve(PHOTOS_DIR, req.params.slug);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  res.json({ ok: true });
});

// 重新排序集合
app.post('/api/collections/reorder', (req, res) => {
  const d = readData();
  const order = req.body?.slugs || [];
  d.collections.sort((a, b) => {
    const ia = order.indexOf(a.slug);
    const ib = order.indexOf(b.slug);
    if (ia < 0 && ib < 0) return 0;
    if (ia < 0) return 1;
    if (ib < 0) return -1;
    return ia - ib;
  });
  writeData(d);
  res.json({ ok: true });
});

// ====== 照片操作 ======
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// 上传照片 (可批量,一次多个 file 字段)
app.post('/api/collections/:slug/photos', upload.array('files', 30), async (req, res) => {
  const d = readData();
  const c = findCollection(d, req.params.slug);
  if (!c) return res.status(404).json({ error: 'collection not found' });
  const dir = resolve(PHOTOS_DIR, c.slug);
  mkdirSync(dir, { recursive: true });
  let idx = nextPhotoIndex(c.slug);
  const added = [];
  for (const f of req.files || []) {
    const name = `${pad2(idx)}.webp`;
    await sharp(f.buffer)
      .rotate()
      .resize({ width: 2400, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(resolve(dir, name));
    const photo = {
      src: `/photos/${c.slug}/${name}`,
      caption: '',
      location: c.photos[0]?.location || '',
      year: c.year || '',
    };
    c.photos.push(photo);
    added.push(photo);
    idx++;
  }
  if (!c.cover && c.photos.length) c.cover = c.photos[0].src;
  writeData(d);
  res.json({ added, collection: c });
});

// 更新照片元数据 (caption / story / location / year)
app.patch('/api/collections/:slug/photos/:index', (req, res) => {
  const d = readData();
  const c = findCollection(d, req.params.slug);
  if (!c) return res.status(404).json({ error: 'not found' });
  const i = parseInt(req.params.index, 10);
  if (!c.photos[i]) return res.status(404).json({ error: 'photo not found' });
  const allowed = ['caption', 'story', 'location', 'year'];
  for (const k of allowed) if (k in req.body) c.photos[i][k] = req.body[k];
  writeData(d);
  res.json(c.photos[i]);
});

// 删除照片
app.delete('/api/collections/:slug/photos/:index', (req, res) => {
  const d = readData();
  const c = findCollection(d, req.params.slug);
  if (!c) return res.status(404).json({ error: 'not found' });
  const i = parseInt(req.params.index, 10);
  const ph = c.photos[i];
  if (!ph) return res.status(404).json({ error: 'photo not found' });
  c.photos.splice(i, 1);
  // 删除磁盘文件
  const file = resolve(ROOT, 'public' + ph.src);
  if (existsSync(file)) rmSync(file);
  // 如果删的是封面,自动改为第一张
  if (c.cover === ph.src) c.cover = c.photos[0]?.src || '';
  writeData(d);
  res.json({ ok: true, collection: c });
});

// 重新排序照片 (按 src 数组顺序);文件不重命名,数据顺序即展示顺序
app.post('/api/collections/:slug/photos/reorder', (req, res) => {
  const d = readData();
  const c = findCollection(d, req.params.slug);
  if (!c) return res.status(404).json({ error: 'not found' });
  const order = req.body?.srcs || [];
  c.photos.sort((a, b) => {
    const ia = order.indexOf(a.src);
    const ib = order.indexOf(b.src);
    if (ia < 0 && ib < 0) return 0;
    if (ia < 0) return 1;
    if (ib < 0) return -1;
    return ia - ib;
  });
  writeData(d);
  res.json(c);
});

// 设置封面
app.post('/api/collections/:slug/cover', (req, res) => {
  const d = readData();
  const c = findCollection(d, req.params.slug);
  if (!c) return res.status(404).json({ error: 'not found' });
  c.cover = req.body?.src || c.cover;
  writeData(d);
  res.json(c);
});

// ====== 发布 (git commit + push) ======
app.post('/api/publish', async (req, res) => {
  const msg = req.body?.message || `update via admin @ ${new Date().toISOString()}`;
  try {
    await exec('git', ['add', '-A'], { cwd: ROOT });
    // 检测有无变更
    const { stdout } = await exec('git', ['status', '--porcelain'], { cwd: ROOT });
    if (!stdout.trim()) return res.json({ ok: true, skipped: true, message: '没有需要发布的改动' });
    await exec('git', ['-c', 'commit.gpgsign=false', 'commit', '-m', msg], { cwd: ROOT });
    const { stdout: pushOut, stderr: pushErr } = await exec('git', ['push'], { cwd: ROOT });
    res.json({ ok: true, log: (pushOut + pushErr).trim() });
  } catch (e) {
    res.status(500).json({ error: e.message, stderr: e.stderr, stdout: e.stdout });
  }
});

// git 状态
app.get('/api/status', async (_req, res) => {
  try {
    const { stdout } = await exec('git', ['status', '--porcelain'], { cwd: ROOT });
    const changes = stdout.trim().split('\n').filter(Boolean);
    res.json({ pendingChanges: changes.length, files: changes.slice(0, 50) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = 5174;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  🛠  Admin running at http://localhost:${PORT}\n`);
});
