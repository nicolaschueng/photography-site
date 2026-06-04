// 把数据里写死的绝对路径(/photos/... 或 /avatar/...)按当前部署的 BASE_URL 重写
// 本地开发 BASE_URL = "/"，GitHub Pages 子路径下 BASE_URL = "/photography-site/"
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function asset(path: string): string {
  if (!path) return path;
  // 已经是完整 URL 不动
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  // 已经包含 BASE 前缀就不重复加
  if (BASE && path.startsWith(BASE + '/')) return path;
  // 以 / 开头的绝对路径,前面拼 BASE
  if (path.startsWith('/')) return BASE + path;
  return path;
}
