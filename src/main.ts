import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="topbar"><a class="brand" href="/" aria-label="初见首页"><span class="brand-icon">初</span>初见 <span class="brand-en">FIRST HELLO</span></a><span class="top-note">每一次开始，都值得期待</span></header>
  <main class="layout">
    <section class="intro">
      <span class="eyebrow"><span class="dot"></span> A FRESH START</span>
      <h1>从一句你好，<br>开启新的<span class="accent">可能。</span></h1>
      <p class="intro-copy">创建你的专属账号，记录灵感、探索日常。<br>美好的事情，从这里开始。</p>
      <div class="art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="spark s1">✦</span><span class="spark s2">✦</span><div class="hello-card"><div class="card-top"><span class="mini-dot"></span><span class="mini-dot"></span><span class="mini-dot"></span></div><div class="hello-text">hello<span> .</span></div><div class="card-bottom">NICE TO MEET YOU <span>↗</span></div></div><div class="floating-label"><span>✓</span> 你的下一站，已就绪</div></div>
      <div class="intro-footer"><span class="small-line"></span> 一个账号，一段全新的旅程</div>
    </section>
    <section class="form-panel" aria-labelledby="register-title">
      <div class="form-heading"><span class="step-label">LET’S GET STARTED</span><h2 id="register-title">创建账号</h2><p>很高兴认识你，请填写以下信息。</p></div>
      <div id="form-message" role="alert" aria-live="polite" hidden></div>
      <form id="register-form" novalidate>
        <div class="field"><label for="username">用户名</label><input id="username" name="username" autocomplete="username" maxlength="20" placeholder="给自己起个名字" aria-describedby="username-hint username-error" required><span class="hint" id="username-hint">3–20 位字母、数字或下划线</span><span class="field-error" id="username-error"></span></div>
        <div class="field"><label for="email">邮箱地址</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com" aria-describedby="email-error" required><span class="field-error" id="email-error"></span></div>
        <div class="field"><label for="password">密码</label><div class="password-wrap"><input id="password" name="password" type="password" autocomplete="new-password" maxlength="64" placeholder="设置一个安全的密码" aria-describedby="password-hint password-error" required><button class="visibility" id="toggle-password" type="button" aria-label="显示密码" aria-pressed="false">显示</button></div><span class="hint" id="password-hint">8–64 位，至少包含字母和数字</span><span class="field-error" id="password-error"></span></div>
        <div class="field"><label for="confirm-password">确认密码</label><input id="confirm-password" name="confirmPassword" type="password" autocomplete="new-password" maxlength="64" placeholder="再次输入密码" aria-describedby="confirmPassword-error" required><span class="field-error" id="confirmPassword-error"></span></div>
        <div class="terms-row"><input type="checkbox" id="agree-terms" name="agreeTerms" aria-describedby="agreeTerms-error"><label for="agree-terms">我已阅读并同意 <button type="button" class="text-link" id="show-terms">使用说明</button></label></div><span class="field-error terms-error" id="agreeTerms-error"></span>
        <button type="submit" id="register-button" class="primary">创建我的账号 <span>↗</span></button>
      </form>
      <p class="form-footnote"><span>◇</span> 密码经过加密存储，守护每一次开始</p>
      <section id="register-success" class="success" role="status" tabindex="-1" hidden><span class="success-icon">✓</span><h3>注册成功！</h3><p>欢迎加入初见，<strong id="registered-username"></strong>。</p><dl><div><dt>用户编号</dt><dd id="registered-id"></dd></div><div><dt>邮箱地址</dt><dd id="registered-email"></dd></div></dl><button type="button" id="register-again" class="primary">继续注册新账号 <span>↗</span></button></section>
    </section>
  </main>
  <footer class="page-footer"><span>© ${new Date().getFullYear()} 初见 · FIRST HELLO</span><span id="service-status" role="status">正在连接服务…</span><span>为每一次新的开始而设计</span></footer>
  <dialog id="terms-dialog"><h2>使用说明</h2><p>这是一个用于学习与注册自动化测试的本地演示网站。</p><p>注册信息保存在本机 MySQL 中。请使用测试邮箱和测试密码；本演示不发送验证邮件，也不验证邮箱所有权。</p><p>注册规则：用户名 3–20 位字母、数字或下划线；密码 8–64 位且包含字母和数字；用户名和邮箱均不可重复（忽略大小写）。</p><button type="button" id="close-terms" class="primary">我知道了</button></dialog>
`

const form = document.querySelector<HTMLFormElement>('#register-form')!
const button = document.querySelector<HTMLButtonElement>('#register-button')!
const message = document.querySelector<HTMLDivElement>('#form-message')!
const input = (id: string) => document.getElementById(id) as HTMLInputElement
const fields: Record<string, string> = { username: 'username', email: 'email', password: 'password', confirmPassword: 'confirm-password', agreeTerms: 'agree-terms' }

function showErrors(errors: Record<string, string>) {
  for (const [name, id] of Object.entries(fields)) {
    document.getElementById(`${name}-error`)!.textContent = errors[name] || ''
    input(id).setAttribute('aria-invalid', String(Boolean(errors[name])))
  }
}
for (const [name, id] of Object.entries(fields)) {
  input(id).addEventListener('input', () => {
    document.getElementById(`${name}-error`)!.textContent = ''
    input(id).setAttribute('aria-invalid', 'false')
    message.hidden = true
  })
}
document.getElementById('toggle-password')!.addEventListener('click', (event) => {
  const show = input('password').type === 'password'
  input('password').type = show ? 'text' : 'password'
  const toggle = event.currentTarget as HTMLButtonElement
  toggle.textContent = show ? '隐藏' : '显示'
  toggle.setAttribute('aria-label', show ? '隐藏密码' : '显示密码')
  toggle.setAttribute('aria-pressed', String(show))
})
form.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (button.disabled) return
  message.hidden = true
  const data = { username: input('username').value.trim(), email: input('email').value.trim(), password: input('password').value, confirmPassword: input('confirm-password').value, agreeTerms: input('agree-terms').checked }
  const errors: Record<string, string> = {}
  if (!/^[A-Za-z0-9_]{3,20}$/.test(data.username)) errors.username = '用户名须为 3–20 位字母、数字或下划线'
  if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = '请输入有效的邮箱地址'
  if (data.password.length < 8 || data.password.length > 64 || !/[A-Za-z]/.test(data.password) || !/[0-9]/.test(data.password)) errors.password = '密码须为 8–64 位，且包含字母和数字'
  if (!data.confirmPassword || data.password !== data.confirmPassword) errors.confirmPassword = '两次输入的密码不一致'
  if (!data.agreeTerms) errors.agreeTerms = '请先阅读并同意使用说明'
  showErrors(errors)
  if (Object.keys(errors).length) { input(fields[Object.keys(errors)[0]!]!).focus(); return }
  button.disabled = true
  button.textContent = '正在创建…'
  try {
    const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(15000) })
    const result = await response.json()
    if (!response.ok) {
      showErrors(result.errors || {})
      message.textContent = result.message || '注册失败，请稍后重试'
      message.hidden = false
      const first = Object.keys(result.errors || {})[0]
      if (first && fields[first]) input(fields[first]!).focus()
      return
    }
    form.hidden = true
    document.querySelector<HTMLElement>('.form-footnote')!.hidden = true
    document.getElementById('registered-username')!.textContent = result.user.username
    document.getElementById('registered-email')!.textContent = result.user.email
    document.getElementById('registered-id')!.textContent = String(result.user.id)
    const success = document.getElementById('register-success')!
    success.hidden = false
    success.focus()
  } catch {
    message.textContent = '连接失败或请求超时，请检查服务后重试；如提示已注册，可检查数据库确认结果。'
    message.hidden = false
  } finally {
    button.disabled = false
    button.innerHTML = '创建我的账号 <span>↗</span>'
  }
})
document.getElementById('register-again')!.addEventListener('click', () => {
  form.reset()
  showErrors({})
  document.getElementById('register-success')!.hidden = true
  form.hidden = false
  document.querySelector<HTMLElement>('.form-footnote')!.hidden = false
  input('password').type = 'password'
  const toggle = document.getElementById('toggle-password')!
  toggle.textContent = '显示'
  toggle.setAttribute('aria-label', '显示密码')
  toggle.setAttribute('aria-pressed', 'false')
  input('username').focus()
})
const dialog = document.querySelector<HTMLDialogElement>('#terms-dialog')!
document.getElementById('show-terms')!.addEventListener('click', () => dialog.showModal())
document.getElementById('close-terms')!.addEventListener('click', () => dialog.close())
fetch('/api/health', { signal: AbortSignal.timeout(5000) }).then(async (response) => {
  const result = await response.json()
  const status = document.getElementById('service-status')!
  status.textContent = response.ok && result.database === 'connected' ? '● 注册服务已就绪' : '○ 数据库暂未连接'
  status.className = response.ok ? 'online' : 'offline'
}).catch(() => { document.getElementById('service-status')!.textContent = '○ 注册服务未连接' })
