import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createHttpServer } from 'node:http';
import { createApp } from './app.js';
import { initializeDatabase, pool } from './db.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = createApp();
const server = createHttpServer(app);
const port = Number(process.env.PORT || 5174);
let vite;
try {
  await initializeDatabase();
  console.log('MySQL 已连接，注册数据库和用户表已就绪。');
} catch (error) {
  console.error('MySQL 初始化失败，请检查服务及 .env 配置。错误类型:', error.code || error.name);
  await pool.end();
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')));
} else {
  const { createServer } = await import('vite');
  vite = await createServer({ root, server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
  app.use(vite.middlewares);
}
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
server.on('error', async (error) => {
  console.error('服务启动失败:', error.code);
  await vite?.close();
  await pool.end();
  process.exit(1);
});
async function shutdown() {
  server.close();
  await vite?.close();
  await pool.end();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
