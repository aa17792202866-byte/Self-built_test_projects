"""先运行 npm run dev，再执行 python -m unittest discover -s tests -v。

每次生成不同的用户名；成功注册的测试账号保留在数据库，方便练习查库断言。
设置 HEADLESS=1 可无界面运行，BASE_URL 可覆盖默认网站地址。
"""
import os
import json
from pathlib import Path
import sys
import unittest
from urllib.error import URLError
from urllib.request import urlopen
import uuid
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


class TestRegistration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_url = os.getenv('BASE_URL', 'http://127.0.0.1:5174').rstrip('/')
        print(f'\n[准备] Python 解释器：{sys.executable}', flush=True)
        print(f'[准备] 检查网站与数据库：{cls.base_url}', flush=True)
        try:
            with urlopen(f'{cls.base_url}/api/health', timeout=5) as response:
                if json.load(response).get('database') != 'connected':
                    raise RuntimeError('数据库未连接，请检查 MySQL 和项目 .env 配置。')
        except (URLError, TimeoutError, ValueError) as error:
            raise RuntimeError(
                f'网站或数据库尚未就绪：{cls.base_url}。'
                '请先在项目根目录运行 npm run dev，并保持该终端打开。'
            ) from error
        print('[准备] 网站与数据库连接正常。', flush=True)

    def setUp(self):
        print(f'\n[运行] {self._testMethodName}', flush=True)
        options = webdriver.ChromeOptions()
        if os.getenv('HEADLESS') == '1':
            options.add_argument('--headless=new')
        options.add_argument('--window-size=1440,1000')
        project_root = Path(__file__).resolve().parents[1]
        configured_driver = os.getenv('CHROMEDRIVER_PATH')
        local_driver = project_root / 'drivers' / 'chromedriver-win64' / 'chromedriver.exe'
        if configured_driver:
            driver_path = Path(configured_driver).expanduser()
            if not driver_path.is_absolute():
                driver_path = project_root / driver_path
            if not driver_path.is_file():
                raise RuntimeError(f'CHROMEDRIVER_PATH 指向的文件不存在：{driver_path}')
        else:
            driver_path = local_driver if local_driver.is_file() else None
        if driver_path:
            print(f'[浏览器] 使用本地驱动：{driver_path}', flush=True)
            service = Service(executable_path=str(driver_path))
        else:
            os.environ.setdefault('SE_TIMEOUT', '20')
            print('[浏览器] 未找到本地驱动，正在联网获取，网络请求超时为 20 秒…', flush=True)
            service = Service()
        try:
            self.driver = webdriver.Chrome(service=service, options=options)
        except Exception as error:
            raise RuntimeError(
                'Chrome 启动失败。请确认已安装 Chrome，且 ChromeDriver 与浏览器版本匹配。'
                '可将驱动放到项目 drivers/chromedriver-win64/chromedriver.exe，'
                '或用 CHROMEDRIVER_PATH 指定路径。原始错误：' + str(error)
            ) from error
        self.addCleanup(self.driver.quit)
        self.driver.set_page_load_timeout(20)
        print('[浏览器] 已启动，正在打开注册页面。', flush=True)
        self.wait = WebDriverWait(self.driver, 15)
        self.driver.get(self.base_url)
        self.wait.until(EC.visibility_of_element_located((By.ID, 'username')))
        self.username = 'ui_' + uuid.uuid4().hex[:12]

    def fill_form(self, username=None, email=None, password='Test12345', confirm='Test12345', agree=True):
        values = {
            'username': username or self.username,
            'email': email or f'{self.username}@example.com',
            'password': password,
            'confirm-password': confirm,
        }
        for element_id, value in values.items():
            field = self.driver.find_element(By.ID, element_id)
            field.clear()
            field.send_keys(value)
        checkbox = self.driver.find_element(By.ID, 'agree-terms')
        if checkbox.is_selected() != agree:
            checkbox.click()

    def submit(self):
        self.driver.find_element(By.ID, 'register-button').click()

    def assert_error(self, element_id, text):
        self.wait.until(EC.text_to_be_present_in_element((By.ID, element_id), text))
        self.assertIn(text, self.driver.find_element(By.ID, element_id).text)

    def test_success(self):
        self.fill_form()
        self.submit()
        self.wait.until(EC.visibility_of_element_located((By.ID, 'register-success')))
        self.assertEqual(self.driver.find_element(By.ID, 'registered-username').text, self.username)
        self.assertTrue(self.driver.find_element(By.ID, 'registered-id').text.isdigit())

    def test_required_fields(self):
        self.submit()
        self.assert_error('username-error', '用户名须为')
        self.assert_error('email-error', '请输入有效的邮箱地址')

    def test_invalid_email(self):
        self.fill_form(email='invalid-email')
        self.submit()
        self.assert_error('email-error', '请输入有效的邮箱地址')

    def test_weak_password(self):
        self.fill_form(password='abcdefgh', confirm='abcdefgh')
        self.submit()
        self.assert_error('password-error', '包含字母和数字')

    def test_password_mismatch(self):
        self.fill_form(confirm='Different123')
        self.submit()
        self.assert_error('confirmPassword-error', '两次输入的密码不一致')

    def test_terms_required(self):
        self.fill_form(agree=False)
        self.submit()
        self.assert_error('agreeTerms-error', '请先阅读并同意使用说明')

    def test_duplicate_username(self):
        self.fill_form()
        self.submit()
        self.wait.until(EC.visibility_of_element_located((By.ID, 'register-again'))).click()
        self.fill_form(email=f'other_{self.username}@example.com')
        self.submit()
        self.assert_error('username-error', '该用户名已被注册')

    def test_duplicate_email(self):
        self.fill_form()
        self.submit()
        self.wait.until(EC.visibility_of_element_located((By.ID, 'register-again'))).click()
        self.fill_form(username=self.username + '_2')
        self.submit()
        self.assert_error('email-error', '该邮箱已被注册')

    def test_toggle_password_and_terms_dialog(self):
        self.fill_form()
        self.driver.find_element(By.ID, 'toggle-password').click()
        self.assertEqual(self.driver.find_element(By.ID, 'password').get_attribute('type'), 'text')
        self.driver.find_element(By.ID, 'toggle-password').click()
        self.assertEqual(self.driver.find_element(By.ID, 'password').get_attribute('type'), 'password')
        self.driver.find_element(By.ID, 'show-terms').click()
        self.wait.until(EC.visibility_of_element_located((By.ID, 'terms-dialog')))
        self.driver.find_element(By.ID, 'close-terms').click()
        self.wait.until(EC.invisibility_of_element_located((By.ID, 'terms-dialog')))

    def tearDown(self):
        time.sleep(2)

if __name__ == '__main__':
    print('开始运行注册自动化测试；请查看下方进度。', flush=True)
    unittest.main(verbosity=2)
