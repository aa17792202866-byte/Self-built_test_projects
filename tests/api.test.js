import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID, scryptSync } from 'node:crypto';

// 与手动注册数据隔离，不清空数据库；只清理本轮测试创建的用户。
process.env.DB_NAME = 'registration_lab_test';
const { initializeDatabase, pool } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');

test('注册接口与真实 MySQL 集成测试', async (t) => {
  await initializeDatabase();
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const prefix = `api_${randomUUID().replaceAll('-', '').slice(0, 8)}`;
  const usernames = [];
  const payload = (suffix = '') => {
    const username = prefix + suffix;
    usernames.push(username);
    return { username, email: `${username}@example.com`, password: 'Test12345', confirmPassword: 'Test12345', agreeTerms: true };
  };
  const post = async (body) => {
    const response = await fetch(`${base}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  t.after(async () => {
    try {
      if (usernames.length) await pool.execute(`DELETE FROM users WHERE username IN (${usernames.map(() => '?').join(',')})`, usernames);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
    }
  });
  await t.test('健康检查确认数据库可用', async () => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).database, 'connected');
  });
  const valid = payload();
  await t.test('注册成功、真实入库、密码加盐哈希且不返回密码', async () => {
    const result = await post({ ...valid, username: ` ${valid.username} `, email: valid.email.toUpperCase() });
    assert.equal(result.status, 201);
    assert.equal(result.body.user.username, valid.username);
    assert.equal(result.body.user.email, valid.email);
    assert.deepEqual(Object.keys(result.body.user).sort(), ['email', 'id', 'username']);
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [result.body.user.id]);
    assert.equal(rows.length, 1);
    const [algorithm, salt, hash] = rows[0].password_hash.split('$');
    assert.equal(algorithm, 'scrypt');
    assert.equal(scryptSync(valid.password, salt, 64).toString('hex'), hash);
    assert.ok(rows[0].terms_accepted_at);
  });
  await t.test('重复用户名忽略大小写', async () => {
    const result = await post({ ...payload('u'), username: valid.username.toUpperCase() });
    assert.equal(result.status, 409);
    assert.ok(result.body.errors.username);
  });
  await t.test('重复邮箱忽略大小写', async () => {
    const result = await post({ ...payload('e'), email: valid.email.toUpperCase() });
    assert.equal(result.status, 409);
    assert.ok(result.body.errors.email);
  });
  await t.test('空字段、非法类型、错误邮箱、弱密码、确认密码和协议均由后端拦截', async () => {
    const cases = [
      [{}, 'username'], [null, 'username'],
      [{ ...payload('1'), username: { value: 'abc' } }, 'username'],
      [{ ...payload('2'), username: "a' OR 1=1--" }, 'username'],
      [{ ...payload('3'), email: 'bad-email' }, 'email'],
      [{ ...payload('4'), password: 'abcdefgh', confirmPassword: 'abcdefgh' }, 'password'],
      [{ ...payload('5'), password: 'Ab12345', confirmPassword: 'Ab12345' }, 'password'],
      [{ ...payload('6'), password: 'a1'.repeat(33), confirmPassword: 'a1'.repeat(33) }, 'password'],
      [{ ...payload('7'), confirmPassword: 'Different1' }, 'confirmPassword'],
      [{ ...payload('8'), agreeTerms: false }, 'agreeTerms'],
      [{ ...payload('9'), agreeTerms: 'true' }, 'agreeTerms'],
    ];
    for (const [body, field] of cases) {
      const result = await post(body);
      assert.equal(result.status, 400);
      assert.ok(result.body.errors[field]);
    }
  });
  await t.test('8 位与 64 位密码边界可注册', async () => {
    for (const [suffix, password] of [['min', 'Abc12345'], ['max', 'a1'.repeat(32)]]) {
      assert.equal((await post({ ...payload(suffix), password, confirmPassword: password })).status, 201);
    }
  });
  await t.test('并发重复注册只会创建一条用户记录', async () => {
    const data = payload('race');
    const results = await Promise.all([post(data), post(data)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM users WHERE username = ?', [data.username]);
    assert.equal(rows[0].total, 1);
  });
  await t.test('JSON 格式错误返回 400', async () => {
    const response = await fetch(`${base}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
    assert.equal(response.status, 400);
    assert.ok((await response.json()).message);
  });
  await t.test('超大请求返回 413', async () => {
    const result = await post({ value: 'x'.repeat(9000) });
    assert.equal(result.status, 413);
  });
  await t.test('未知接口返回 JSON 404', async () => {
    const response = await fetch(`${base}/api/missing`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).message, '接口不存在');
  });
});
