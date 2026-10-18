import express from 'express';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db.js';
const scrypt = promisify(scryptCallback);

export function validateRegistration(body) {
  const errors = {};
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) errors.username = '用户名须为 3–20 位字母、数字或下划线';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = '请输入有效的邮箱地址';
  if (password.length < 8 || password.length > 64 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) errors.password = '密码须为 8–64 位，且包含字母和数字';
  if (!body?.confirmPassword || body.confirmPassword !== password) errors.confirmPassword = '两次输入的密码不一致';
  if (body?.agreeTerms !== true) errors.agreeTerms = '请先阅读并同意使用说明';
  return { errors, username, email, password };
}
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', express.json({ limit: '8kb', strict: false }));
  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1 FROM users LIMIT 1');
      res.json({ status: 'ok', database: 'connected' });
    } catch {
      res.status(503).json({ status: 'error', database: 'disconnected', message: '数据库连接失败，请检查 MySQL 和 .env 配置' });
    }
  });
  app.post('/api/register', async (req, res, next) => {
    try {
      const { errors, username, email, password } = validateRegistration(req.body);
      if (Object.keys(errors).length) return res.status(400).json({ message: '请检查注册信息', errors });
      const [existing] = await pool.execute('SELECT username, email FROM users WHERE username = ? OR email = ?', [username, email]);
      const conflicts = {};
      for (const user of existing) {
        if (user.username.toLowerCase() === username.toLowerCase()) conflicts.username = '该用户名已被注册';
        if (user.email.toLowerCase() === email) conflicts.email = '该邮箱已被注册';
      }
      if (Object.keys(conflicts).length) return res.status(409).json({ message: '用户名或邮箱已被注册', errors: conflicts });
      const salt = randomBytes(16).toString('hex');
      const derivedKey = await scrypt(password, salt, 64);
      const passwordHash = `scrypt$${salt}$${derivedKey.toString('hex')}`;
      const [result] = await pool.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, passwordHash]);
      return res.status(201).json({ message: '注册成功', user: { id: result.insertId, username, email } });
    } catch (error) {
      // 唯一索引处理并发注册，防止两个请求同时通过前面的重复检查。
      if (error.code === 'ER_DUP_ENTRY') {
        const field = error.message.includes('uq_email') ? 'email' : 'username';
        return res.status(409).json({ message: '用户名或邮箱已被注册', errors: { [field]: field === 'email' ? '该邮箱已被注册' : '该用户名已被注册' } });
      }
      return next(error);
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ message: '接口不存在' }));
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ message: '请求内容不是有效的 JSON' });
    if (error.type === 'entity.too.large') return res.status(413).json({ message: '请求内容过大' });
    console.error('注册服务错误:', error.code || error.name);
    return res.status(503).json({ message: '服务暂不可用，请检查数据库连接后重试' });
  });
  return app;
}
