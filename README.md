# 初见 · 注册自动化测试练习网站

基于现有 Vite + TypeScript 项目，后端为 Node.js + Express，使用本机 MySQL 真正保存注册数据。

## 启动

需要 Node.js 22.12+（本机验证版本为 24）和运行中的 MySQL 5.7+/8.x。

在项目根目录打开终端：

```powershell
npm install
npm run dev
```

浏览器打开 http://127.0.0.1:5174 。前后端由同一个服务提供，一条命令即可启动。默认使用 5174，避开电脑上原有 Vite 服务的 5173 端口。

`.env` 已按你提供的本地 MySQL 账号配置。默认连接 `127.0.0.1:3306`，数据库为 `registration_lab`，用户表为 `users`。启动时自动创建库和表，不会清空已有数据。若修改连接信息，请重启服务。`.env` 已被 Git 忽略，请不要将它提交到仓库。

`npm run build` 检查 TypeScript 并构建页面。构建后可运行 `npm start`，由后端提供 dist 中的页面。`npm run preview` 只预览前端产物，不提供注册接口，因此练习时请使用 `npm run dev` 或 `npm start`。

若端口被占用，请停止旧服务，或修改 `.env` 中的 `PORT`。若提示数据库连接失败，请检查 MySQL 是否运行、端口是否正确、账号是否有建库和建表权限。

## 注册规则与可测试场景

| 字段/场景 | 规则/结果 |
| --- | --- |
| 用户名 | 3–20 位字母、数字或下划线，去除首尾空白 |
| 邮箱 | 必填、合法邮箱格式，去除首尾空白并转小写 |
| 密码 | 8–64 位，至少包含一个英文字母和一个数字 |
| 确认密码 | 与密码完全一致 |
| 使用说明 | 必须勾选同意 |
| 正常注册 | 展示成功提示、用户名、邮箱和用户编号 |
| 重复用户名/邮箱 | 前后端展示对应错误，忽略大小写 |
| 并发重复提交 | 数据库唯一索引防止重复用户 |
| 密码显示/隐藏 | 点击按钮切换可见性 |

本项目只实现注册，没有登录、邮件验证和找回密码。请使用测试邮箱和密码。服务默认只监听本机，不作为公网生产服务。

## unittest + Selenium 示例

先保持网站运行，再打开另一个终端，使用 PyCharm 项目的 Python 解释器：

```powershell
.\.venv\Scripts\python.exe -m pip install -r tests/requirements.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_register_ui.py" -v
```

也可在 PyCharm 中直接运行 `tests/test_register_ui.py`。需要安装 Chrome，首次运行 Selenium 可能联网获取匹配的驱动。无界面运行可先设置 `$env:HEADLESS="1"`。修改网站端口后设置 `$env:BASE_URL="http://127.0.0.1:新端口"`。

### 运行后一直没有打开浏览器

本机已复现：Selenium Manager 获取 ChromeDriver 时网络超时。已在项目 `drivers/chromedriver-win64/chromedriver.exe` 中准备与本机 Chrome 155.0.8059.84 匹配的官方驱动，测试现在优先直接使用它，不再等待联网下载。浏览器自动升级后如出现版本不匹配，需要更新该驱动；也可设置 `CHROMEDRIVER_PATH` 指定其他驱动文件。

测试会先检查网站与数据库，再输出当前用例、驱动路径和浏览器启动进度。请在 PyCharm 的 Run/运行窗口查看输出，使用项目 `.venv` 中的解释器。如果上一次运行仍卡住，先点击停止，再重新运行当前文件。测试完成后浏览器会自动关闭，最终应显示 `Ran 9 tests` 和 `OK`。

测试包含成功注册、必填校验、非法邮箱、弱密码、两次密码不一致、未同意说明、重复用户名、重复邮箱、密码显示及说明弹窗。每次生成唯一用户名。**UI 测试创建的 `ui_` 开头账号保留在数据库中，便于练习查库。**

| 页面元素 | 固定 ID |
| --- | --- |
| 用户名 / 邮箱 | `username` / `email` |
| 密码 / 确认密码 | `password` / `confirm-password` |
| 同意说明 / 注册按钮 | `agree-terms` / `register-button` |
| 成功区域 / 再次注册 | `register-success` / `register-again` |
| 用户名 / 邮箱错误 | `username-error` / `email-error` |
| 密码 / 确认密码错误 | `password-error` / `confirmPassword-error` |
| 协议错误 / 全局错误 | `agreeTerms-error` / `form-message` |

## 后端接口

- `GET /api/health`：检查后端与数据库连接，正常返回 200，异常返回 503。
- `POST /api/register`：注册。成功 201；参数错误 400；重复注册 409；服务异常 503。

请求示例：

```json
{
  "username": "test_user",
  "email": "test_user@example.com",
  "password": "Test12345",
  "confirmPassword": "Test12345",
  "agreeTerms": true
}
```

成功响应：

```json
{
  "message": "注册成功",
  "user": { "id": 1, "username": "test_user", "email": "test_user@example.com" }
}
```

密码使用 Node.js scrypt 和随机盐生成哈希，仅保存 `password_hash`，接口不返回密码。数据库查询采用参数绑定。

## 验证入库

在 MySQL 客户端执行：

```sql
USE registration_lab;
SELECT id, username, email, created_at FROM users ORDER BY id DESC;
```

`npm test` 运行真实 MySQL 接口测试，自动使用独立的 `registration_lab_test` 数据库，清理本轮测试创建的账号，不修改手动注册数据。
