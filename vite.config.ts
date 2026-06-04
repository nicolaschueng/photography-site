import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 部署到 GitHub Pages 项目站点：https://<user>.github.io/<repo>/
// 通过环境变量 VITE_BASE 控制；本地 dev / 其它部署留空即根路径
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
})
