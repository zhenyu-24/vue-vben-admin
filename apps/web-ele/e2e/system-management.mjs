import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

// eslint-disable-next-line n/no-extraneous-import
import { chromium } from 'playwright';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5777';
const output = join(tmpdir(), 'web-ele-system-e2e');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  channel: process.env.E2E_BROWSER_CHANNEL,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const timestamp = '2026-10-16 12:00:00';
const requests = [];
const failures = new Set();
const failNext = (method, path) => failures.add(`${method} ${path}`);
const lastRequest = (path, method) =>
  requests.findLast((item) => item.path === path && item.method === method);
const pagination = (items) => ({
  items,
  total: items.length,
  page: 1,
  size: 20,
  total_pages: 1,
});
const user = {
  id: 99,
  username: 'e2e',
  nickname: 'Test user',
  avatar: '',
  roles: [{ id: 1, name: 'admin' }],
  is_superuser: true,
  homePath: '/admin/log/login',
};
const loginLogs = [
  {
    id: '2069061886627938311',
    username: 'login-one',
    status: 1,
    ip: '127.0.0.1',
    msg: 'Login successful',
    login_time: timestamp,
    created_time: timestamp,
  },
  {
    id: 2,
    username: 'login-two',
    status: 0,
    ip: '127.0.0.2',
    msg: 'Login failed',
    login_time: timestamp,
    created_time: timestamp,
  },
];
const operaLogs = [
  {
    id: '2069061886627938312',
    username: 'opera-one',
    trace_id: 'trace-one',
    title: 'Update config',
    path: '/v1/sys/configs',
    method: 'PUT',
    ip: '127.0.0.1',
    status: 1,
    code: '200',
    msg: 'Updated',
    args: { setting: true },
    cost_time: 12,
    opera_time: timestamp,
    user_agent: 'Test browser',
  },
];
const notices = [
  {
    id: 7,
    title: 'Existing notice',
    type: 0,
    status: 1,
    content: '## Existing content',
    created_time: timestamp,
  },
];
const sessions = [
  {
    id: '2069061886627938313',
    session_uuid: 'session-one',
    username: 'online-one',
    nickname: 'Online one',
    ip: '127.0.0.1',
    os: 'Windows',
    browser: 'Edge',
    device: 'Desktop',
    status: 1,
    last_login_time: timestamp,
    expire_time: '2026-10-17 12:00:00',
  },
];
const configValues = {
  USER_SECURITY: {
    USER_SECURITY_CONFIG_STATUS: '1',
    USER_LOCK_THRESHOLD: '5',
    USER_LOCK_SECONDS: '300',
  },
  LOGIN: { LOGIN_CONFIG_STATUS: '1', LOGIN_CAPTCHA_ENABLED: 'false' },
  EMAIL: {
    EMAIL_CONFIG_STATUS: '1',
    EMAIL_HOST: 'smtp.example.com',
    EMAIL_PORT: '465',
    EMAIL_SSL: 'true',
    EMAIL_USERNAME: 'test@example.com',
    EMAIL_PASSWORD: 'secret',
  },
};
const configs = Object.entries(configValues).flatMap(([type, values], group) =>
  Object.entries(values).map(([key, value], index) => ({
    id: group * 100 + index,
    name: key,
    type,
    key,
    value,
    is_frontend: false,
    created_time: timestamp,
  })),
);
const server = {
  cpu: {
    usage: 35,
    current_freq: 3200,
    logical_num: 8,
    physical_num: 4,
    min_freq: 1000,
    max_freq: 4000,
  },
  mem: { total: 16, used: 4, free: 12, usage: 25 },
  sys: { name: 'System-E2E', os: 'Windows 11', ip: '127.0.0.1', arch: 'AMD64' },
  service: {
    name: 'FastAPI-E2E',
    version: '3.12',
    home: 'D:/service',
    startup: timestamp,
    elapsed: '1 day 2 hours',
    cpu_usage: '2%',
    mem_vms: '1GB',
    mem_rss: '500MB',
    mem_free: '12GB',
  },
  disk: [
    {
      dir: 'D:/',
      device: 'Disk0',
      type: 'NTFS',
      total: '100GB',
      used: '25GB',
      free: '75GB',
      usage: '25%',
    },
  ],
};
const redis = {
  info: {
    redis_version: '7.4.0',
    redis_mode: 'standalone',
    role: 'master',
    tcp_port: '6379',
    uptime: '1 day',
    connected_clients: '5',
    blocked_clients: '0',
    used_memory_human: '12M',
    used_memory_rss_human: '16M',
    maxmemory_human: '128M',
    mem_fragmentation_ratio: '1.33',
    instantaneous_ops_per_sec: '5',
    total_commands_processed: '100',
    rejected_connections: '0',
    keys_num: '12',
  },
  stats: [
    { name: 'get', value: '70' },
    { name: 'set', value: '30' },
  ],
};

// Route all application API traffic to in-memory fixtures, including writes.
await context.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace(/^\/api/, '');
  const method = request.method();
  const payload = request.postDataJSON();
  requests.push({
    path,
    method,
    payload,
    query: Object.fromEntries(url.searchParams),
  });
  const respond = (data, status = 200, msg = 'OK') =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ code: status, msg, data }),
    });
  if (failures.delete(`${method} ${path}`))
    return respond(null, 409, `E2E failure: ${path}`);
  if (method === 'OPTIONS') return respond(null);
  if (path === '/v1/auth/captcha')
    return respond({
      is_enabled: false,
      uuid: '',
      image: '',
      expire_seconds: 0,
    });
  if (path === '/v1/auth/login')
    return respond({ access_token: 'isolated-system-token', user });
  if (path === '/v1/sys/users/me') return respond(user);
  if (path === '/v1/auth/codes' || path === '/v1/sys/notices/user/status')
    return respond([]);
  if (path === '/v1/logs/login' || path === '/v1/logs/opera') {
    const rows = path.endsWith('/login') ? loginLogs : operaLogs;
    if (method === 'DELETE') {
      for (let index = rows.length - 1; index >= 0; index--) {
        if (payload.pks.includes(rows[index].id)) rows.splice(index, 1);
      }
      return respond(null);
    }
    const username = url.searchParams.get('username');
    return respond(
      pagination(
        rows.filter((item) => !username || item.username.includes(username)),
      ),
    );
  }
  if (path === '/v1/sys/notices') {
    if (method === 'POST') {
      notices.push({ id: 8, created_time: timestamp, ...payload });
      return respond(null);
    }
    if (method === 'DELETE') {
      for (let index = notices.length - 1; index >= 0; index--) {
        if (payload.pks.includes(notices[index].id)) notices.splice(index, 1);
      }
      return respond(null);
    }
    return respond(pagination(notices));
  }
  const noticeMatch = path.match(/^\/v1\/sys\/notices\/(\d+)$/);
  if (noticeMatch && method === 'PUT') {
    Object.assign(
      notices.find((item) => item.id === Number(noticeMatch[1])),
      payload,
    );
    return respond(null);
  }
  if (path === '/v1/monitors/sessions') {
    const username = url.searchParams.get('username');
    return respond(
      sessions.filter((item) => !username || item.username.includes(username)),
    );
  }
  if (path.startsWith('/v1/monitors/sessions/') && method === 'DELETE') {
    const index = sessions.findIndex(
      (item) => item.session_uuid === url.searchParams.get('session_uuid'),
    );
    if (index >= 0) sessions.splice(index, 1);
    return respond(null);
  }
  if (path === '/v1/monitors/server') return respond(server);
  if (path === '/v1/monitors/redis') return respond(redis);
  if (path === '/v1/sys/configs/all')
    return respond(
      configs.filter((item) => item.type === url.searchParams.get('type')),
    );
  if (path === '/v1/sys/configs' && method === 'PUT') {
    for (const update of payload)
      Object.assign(
        configs.find((item) => item.id === update.id),
        update,
      );
    return respond(null);
  }
  return respond([]);
});

const buttonName = (name) => new RegExp(`^${[...name].join('\\s*')}$`);
const button = (name) => page.getByRole('button', { name: buttonName(name) });
const dialog = () =>
  page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').last();
const modalButton = (name) =>
  dialog().getByRole('button', { name: buttonName(name) });
const row = (name) =>
  page
    .locator('.vxe-table--body-wrapper .vxe-body--row')
    .filter({ has: page.getByText(name, { exact: true }) })
    .filter({ visible: true })
    .first();
async function action(name, label) {
  const id = await row(name).getAttribute('rowid');
  assert.ok(id, `Missing row ${name}`);
  await page
    .locator(`.vxe-body--row[rowid="${id}"]`)
    .getByRole('button', { name: label, exact: true })
    .filter({ visible: true })
    .click();
}
async function confirmPopover() {
  await page
    .locator('.el-popconfirm:visible')
    .getByRole('button')
    .last()
    .click();
}
async function submitModal() {
  await modalButton('确认').click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}
async function screenshot(name) {
  await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    `${name} overflows`,
  );
}
async function chooseLog(name) {
  await row(name).locator('.vxe-cell--checkbox').click();
}
async function waitForRequest(path, method, act) {
  const response = page.waitForResponse(
    (res) =>
      new URL(res.url()).pathname === `/api${path}` &&
      res.request().method() === method,
  );
  await act();
  await response;
}

try {
  await page.goto(`${baseURL}/auth/login`);
  await page.getByRole('textbox', { name: '用户名' }).fill('e2e');
  await page
    .getByRole('textbox', { name: '密码', exact: true })
    .fill('test-password');
  await page.getByRole('button', { name: 'login', exact: true }).click();
  await row('login-one').waitFor();
  assert.equal(await button('删除日志').isDisabled(), true);
  await chooseLog('login-one');
  assert.equal(await button('删除日志').isEnabled(), true);
  await button('删除日志').click();
  await modalButton('取消').click();
  assert.equal(lastRequest('/v1/logs/login', 'DELETE'), undefined);
  await page
    .getByRole('textbox', { name: '用户名', exact: true })
    .fill('login-one');
  await button('查询').click();
  await row('login-two').waitFor({ state: 'hidden' });
  assert.equal(await button('删除日志').isDisabled(), true);
  await chooseLog('login-one');
  failNext('DELETE', '/v1/logs/login');
  await button('删除日志').click();
  await modalButton('确认').click();
  await page
    .getByText('E2E failure: /v1/logs/login', { exact: true })
    .waitFor();
  assert.equal(await button('删除日志').isEnabled(), true);
  await button('删除日志').click();
  await modalButton('确认').click();
  await row('login-one').waitFor({ state: 'hidden' });
  assert.deepEqual(lastRequest('/v1/logs/login', 'DELETE').payload, {
    pks: ['2069061886627938311'],
  });
  await screenshot('login-desktop');
  console.log(
    'Passed: login log selection, query reset, cancellation, failed deletion retry and string IDs.',
  );

  await page.goto(`${baseURL}/admin/log/opera`);
  await row('opera-one').waitFor();
  await action('opera-one', '详情');
  await page.getByText('trace-one', { exact: true }).waitFor();
  await page
    .getByText('setting', { exact: false })
    .filter({ visible: true })
    .first()
    .waitFor();
  await screenshot('opera-details-desktop');
  await dialog().locator('[data-slot="sheet-close"]').click();
  await page.locator('[role="dialog"]').waitFor({ state: 'hidden' });
  await chooseLog('opera-one');
  await button('删除日志').click();
  await modalButton('确认').click();
  await row('opera-one').waitFor({ state: 'hidden' });
  console.log('Passed: operation log detail drawer and batch deletion.');

  await page.goto(`${baseURL}/admin/notice`);
  await row('Existing notice').waitFor();
  await action('Existing notice', '修改');
  await dialog().locator('[name="title"]').fill('Edited notice');
  await submitModal();
  assert.ok(lastRequest('/v1/sys/notices/7', 'PUT'));
  await button('新增通知公告').click();
  assert.equal(await dialog().locator('[name="title"]').inputValue(), '');
  assert.equal(await dialog().locator('[name="content"]').inputValue(), '');
  await dialog().locator('[name="title"]').fill('New notice');
  await dialog()
    .locator('[name="content"]')
    .fill('## New content\n\n**Markdown**');
  failNext('POST', '/v1/sys/notices');
  await modalButton('确认').click();
  await page
    .getByText('E2E failure: /v1/sys/notices', { exact: true })
    .waitFor();
  assert.equal(
    await dialog().locator('[name="title"]').inputValue(),
    'New notice',
  );
  await submitModal();
  assert.deepEqual(lastRequest('/v1/sys/notices', 'POST').payload, {
    title: 'New notice',
    content: '## New content\n\n**Markdown**',
    type: 0,
    status: 1,
  });
  await action('New notice', '预览');
  await dialog()
    .getByRole('heading', { name: 'New content', exact: true })
    .waitFor();
  await screenshot('notice-preview-desktop');
  await dialog().locator('[data-slot="dialog-close"]').click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await action('New notice', '删除');
  await confirmPopover();
  await row('New notice').waitFor({ state: 'hidden' });
  console.log(
    'Passed: notice edit-to-create reset, POST/PUT isolation, retry, Markdown preview and deletion.',
  );

  await page.goto(`${baseURL}/admin/monitor/online`);
  await row('online-one').waitFor();
  await page
    .getByRole('textbox', { name: '用户名', exact: true })
    .fill('online-one');
  await waitForRequest('/v1/monitors/sessions', 'GET', () =>
    button('查询').click(),
  );
  assert.equal(
    lastRequest('/v1/monitors/sessions', 'GET').query.username,
    'online-one',
  );
  await action('online-one', '强制下线');
  await confirmPopover();
  await row('online-one').waitFor({ state: 'hidden' });
  assert.equal(
    lastRequest('/v1/monitors/sessions/2069061886627938313', 'DELETE').query
      .session_uuid,
    'session-one',
  );
  console.log('Passed: online user query and kick by session UUID.');

  for (const [type, text] of [
    ['redis', '7.4.0'],
    ['server', 'FastAPI-E2E'],
  ]) {
    failNext('GET', `/v1/monitors/${type}`);
    await page.goto(`${baseURL}/admin/monitor/${type}`);
    await button('重新加载').click();
    await page.getByText(text, { exact: true }).waitFor();
    if (type === 'redis') {
      await page.locator('canvas').first().waitFor();
      await page.waitForTimeout(1200);
      const pixels = await page.locator('canvas').evaluateAll((canvases) =>
        canvases.map((canvas) => {
          const data = canvas
            .getContext('2d')
            .getImageData(0, 0, canvas.width, canvas.height).data;
          let count = 0;
          for (let index = 3; index < data.length; index += 4)
            if (data[index]) count++;
          return count;
        }),
      );
      assert.ok(
        pixels.length >= 2 && pixels.every((count) => count > 100),
        'Redis charts are blank',
      );
    }
    await screenshot(`${type}-desktop`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    if (type === 'redis') {
      assert.equal(
        await page.locator('canvas').evaluateAll((canvases) =>
          canvases.every((canvas) => {
            const bounds = canvas.getBoundingClientRect();
            return bounds.left >= 0 && bounds.right <= innerWidth;
          }),
        ),
        true,
        'Redis charts extend beyond the mobile viewport',
      );
    }
    await screenshot(`${type}-mobile`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForTimeout(800);
  }
  console.log(
    'Passed: Redis/server failure recovery, chart pixels and desktop/mobile layouts.',
  );

  await page.goto(`${baseURL}/admin/config`);
  const security = page.locator('section[aria-label="安全配置"]');
  await security.getByRole('button', { name: '修改配置' }).click();
  const threshold = security.getByRole('spinbutton', {
    name: '密码错误锁定阈值',
  });
  await threshold.fill('7');
  await security.getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(await threshold.inputValue(), '5');
  await security.getByRole('button', { name: '修改配置' }).click();
  await threshold.fill('8');
  failNext('PUT', '/v1/sys/configs');
  await security.getByRole('button', { name: '保存修改' }).click();
  await page
    .getByText('E2E failure: /v1/sys/configs', { exact: true })
    .waitFor();
  assert.equal(await threshold.inputValue(), '8');
  await security.getByRole('button', { name: '保存修改' }).click();
  await security.getByRole('button', { name: '修改配置' }).waitFor();
  assert.equal(lastRequest('/v1/sys/configs', 'PUT').payload.length, 1);
  assert.equal(lastRequest('/v1/sys/configs', 'PUT').payload[0].value, '8');
  await page.getByRole('tab', { name: '登录配置' }).click();
  const login = page.locator('section[aria-label="登录配置"]');
  await login.getByRole('button', { name: '修改配置' }).click();
  await login
    .getByRole('switch', { name: '图形验证码', exact: true })
    .locator('..')
    .locator('.el-switch__core')
    .click();
  // Use SPA navigation so the route-leave guard actually runs.
  await page
    .getByText('通知公告', { exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page
    .getByText('尚有未保存的配置，离开将丢失修改。', { exact: true })
    .waitFor();
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  assert.ok(page.url().endsWith('/admin/config'));
  await login.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('tab', { name: '邮件配置' }).click();
  await page
    .getByRole('textbox', { name: '服务器地址', exact: true })
    .waitFor();
  await screenshot('config-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot('config-mobile');
  assert.deepEqual(errors, []);
  console.log(
    'Passed: configuration tabs, cancel, diff-only save, failed retry, dirty navigation and responsive layout.',
  );
  console.log(`Screenshots: ${output}`);
} catch (error) {
  console.error((await page.locator('body').innerText()).slice(-12_000));
  await page
    .screenshot({ path: join(output, 'failure.png'), fullPage: true })
    .catch(() => {});
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await context.close();
  await browser.close();
}
