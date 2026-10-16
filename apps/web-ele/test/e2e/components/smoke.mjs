import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

// eslint-disable-next-line n/no-extraneous-import -- Playwright is provided by the workspace root.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15_000);
const errors = [];
const writes = [];
page.on('pageerror', (error) => errors.push(error.message));
const record = {
  id: 1,
  task_id: 'component-test-task',
  name: 'tasks.demo',
  status: 'SUCCESS',
  result: false,
  args: [0],
  kwargs: {},
  retries: 0,
  worker: 'worker@test',
  queue: 'celery',
  date_done: '2026-10-17 12:00:00',
  traceback: null,
};

await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  let data = [];
  if (request.method() !== 'GET') {
    writes.push(url.pathname);
  } else if (url.pathname.endsWith('/sys/users/me')) {
    data = {
      id: 99,
      username: 'admin',
      realName: 'Component tester',
      roles: ['admin'],
      is_superuser: true,
      homePath: '/admin/user',
      avatar: '',
    };
  } else if (url.pathname.endsWith('/sys/users')) {
    data = {
      items: [
        {
          id: 1,
          username: 'tester',
          nickname: 'Test user',
          avatar: '',
          roles: [],
          dept: null,
          status: 1,
          is_superuser: false,
          is_staff: true,
          is_multi_login: false,
        },
      ],
      total: 1,
    };
  } else if (url.pathname.endsWith('/sys/notices')) {
    data = { items: [], total: 0 };
  } else if (url.pathname.endsWith('/task-results/1')) {
    data = record;
  } else if (url.pathname.endsWith('/task-results')) {
    data = { items: [record], total: 1 };
  } else if (
    /\/(?:sys\/roles|schedulers|logs\/(?:login|opera))$/.test(url.pathname)
  ) {
    data = { items: [], total: 0 };
  } else if (url.pathname.endsWith('/sys/plugins/changed')) {
    data = false;
  }
  await route.fulfill({ json: { code: 200, msg: 'OK', data } });
});
await page.addInitScript(() => {
  localStorage.setItem(
    'vben-web-ele-5.7.0-dev-core-access',
    JSON.stringify({ accessToken: 'test-only-token', accessCodes: [] }),
  );
  if (!localStorage.getItem('vben-web-ele-5.7.0-dev-preferences')) {
    localStorage.setItem(
      'vben-web-ele-5.7.0-dev-preferences',
      JSON.stringify({ value: { theme: { mode: 'light' } } }),
    );
    localStorage.setItem(
      'vben-web-ele-5.7.0-dev-preferences-theme',
      JSON.stringify({ value: 'light' }),
    );
  }
});
const baseUrl = process.env.COMPONENT_TEST_URL || 'http://127.0.0.1:5777';
const createPages = [
  ['/admin/user', '添加用户'],
  ['/admin/dept', '新增部门'],
  ['/admin/role', '新增角色'],
  ['/admin/notice', '新增通知公告'],
  ['/admin/scheduler/manage', '新增任务'],
  ['/admin/plugin', '安装插件'],
];
async function visit(url) {
  await page.goto(`${baseUrl}${url}`);
  await page.locator('#__app-loading__').waitFor({ state: 'hidden' });
}
async function iconMetrics(button, name) {
  await button.waitFor();
  const svg = button.locator(`svg.lucide-${name}`);
  await svg.waitFor();
  return svg.evaluate((node) => {
    const style = getComputedStyle(node);
    const buttonStyle = getComputedStyle(node.parentElement);
    const rect = node.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      strokeWidth: style.strokeWidth,
      gap: buttonStyle.gap,
      heightButton: node.parentElement.getBoundingClientRect().height,
      inside: rect.left >= 0 && rect.right <= innerWidth,
      hiddenFromAT: node.getAttribute('aria-hidden'),
    };
  });
}
async function screenshot(name) {
  await page.screenshot({
    path: path.join(tmpdir(), `vben-components-${name}.png`),
    animations: 'disabled',
    fullPage: true,
  });
}
try {
  let expected;
  for (const [url, label] of createPages) {
    await visit(url);
    const button = page.getByRole('button', { name: label, exact: true });
    const metrics = await iconMetrics(button, 'plus');
    assert.equal(metrics.width, 16);
    assert.equal(metrics.height, 16);
    assert.equal(metrics.gap, '8px');
    assert.equal(metrics.hiddenFromAT, 'true');
    assert.equal(metrics.inside, true);
    expected ??= metrics;
    assert.deepEqual(metrics, expected, `Consistent create button: ${url}`);
    if (url === '/admin/user') {
      await page.getByText('Test user', { exact: true }).first().waitFor();
      assert.equal(await page.locator('.el-avatar').count(), 0);
      await screenshot('user-desktop');
      await button.screenshot({
        path: path.join(tmpdir(), 'vben-create-button.png'),
      });
    }
    if (url === '/admin/notice') {
      assert.equal(await page.locator('.vxe-icon-print').count(), 0);
      await screenshot('notice-desktop');
    }
    await button.click();
    const dialog = page.locator('[role="dialog"]:visible').last();
    await dialog.waitFor();
    await dialog.locator('[data-slot="dialog-close"]').click();
    await dialog.waitFor({ state: 'hidden' });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.deepEqual(await iconMetrics(button, 'plus'), expected);
    if (url === '/admin/notice') await screenshot('notice-mobile');
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  for (const url of [
    '/admin/log/login',
    '/admin/log/opera',
    '/admin/scheduler/record',
  ]) {
    await visit(url);
    const button = page.getByRole('button', {
      name: /删除(日志|记录)/,
      exact: true,
    });
    assert.deepEqual(await iconMetrics(button, 'trash-2'), expected);
    assert.equal(await button.isDisabled(), true);
  }
  await page.getByRole('button', { name: '详情', exact: true }).click();
  const drawer = page.locator('[role="dialog"]:visible').last();
  await drawer.getByText('worker@test', { exact: true }).waitFor();
  assert.equal(
    await drawer
      .locator('pre')
      .filter({ hasText: /^false$/ })
      .count(),
    1,
  );
  assert.equal(
    await drawer
      .locator('tr')
      .filter({ hasText: '重试次数' })
      .locator('td')
      .innerText(),
    '0',
  );
  assert.equal(await drawer.locator('.el-descriptions').count(), 0);
  await screenshot('record-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot('record-mobile');
  assert.ok(
    await drawer.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  );
  await page.evaluate(() => {
    localStorage.setItem(
      'vben-web-ele-5.7.0-dev-preferences',
      JSON.stringify({ value: { theme: { mode: 'dark' } } }),
    );
    localStorage.setItem(
      'vben-web-ele-5.7.0-dev-preferences-theme',
      JSON.stringify({ value: 'dark' }),
    );
  });
  await visit('/admin/user');
  assert.deepEqual(
    await iconMetrics(
      page.getByRole('button', { name: '添加用户', exact: true }),
      'plus',
    ),
    expected,
  );
  await screenshot('user-dark-mobile');
  assert.deepEqual(writes, [], 'Opening and canceling must not save data');
  assert.deepEqual(errors, []);
  console.log(
    'PASS: six consistent create/install buttons and dialogs, three delete buttons, no notice print, Vben avatar/descriptions, false/zero values, desktop/mobile/dark; no writes or page errors',
  );
} catch (error) {
  console.error('URL:', page.url(), 'Page errors:', errors);
  console.error((await page.locator('body').innerText()).slice(-2500));
  await screenshot('failure');
  throw error;
} finally {
  await browser.close();
}
