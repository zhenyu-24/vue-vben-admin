import assert from 'node:assert/strict';
import process from 'node:process';

// eslint-disable-next-line n/no-extraneous-import
import { chromium } from 'playwright';

const base = process.env.TEST_BASE_URL || 'http://localhost:5777';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const userId = '9007199254741001';
const errors = [];
let kicked = false;
let lastUserQuery;
const session = (uuid, username, status) => ({
  id: userId, session_uuid: uuid, username, nickname: username, status,
  ip: '127.0.0.1', os: 'Windows', browser: 'Chrome', device: 'Desktop',
  last_login_time: '2026-10-20 12:00:00', expire_time: '2026-10-21 12:00:00',
});
await context.addInitScript(() => {
  localStorage.setItem('vben-web-ele-5.7.0-dev-core-access', JSON.stringify({ accessToken: 'ui-test' }));
});
await context.route('http://localhost:8000/api/**', async (route) => {
  const url = new URL(route.request().url());
  const path = url.pathname.replace('/api', '');
  let data = [];
  if (path === '/v1/sys/users/me') {
    data = { id: '1', username: 'admin', nickname: '管理员', roles: [], is_superuser: true };
  } else if (path === '/v1/sys/menus/sidebar') {
    data = [{ name: 'Admin', path: '/admin', component: 'BasicLayout', meta: { title: '系统管理' }, children: [] }];
  } else if (path === '/v1/sys/users') {
    lastUserQuery = url;
    data = { items: [{
      id: userId, username: 'sort_user', nickname: '排序用户', roles: [], status: 1,
      is_superuser: false, is_staff: true, is_multi_login: false,
      join_time: '2026-10-20 12:00:00', last_login_time: '2026-10-20 12:00:00',
    }], total: 1, page: 1, size: 20, total_pages: 1 };
  } else if (path === '/v1/monitors/sessions') {
    data = (kicked ? [] : [session('active-session', 'a_active', 1)])
      .filter((item) => !url.searchParams.get('username') || item.username === url.searchParams.get('username'));
  } else if (path.startsWith('/v1/monitors/sessions/')) {
    assert.equal(route.request().method(), 'DELETE');
    assert.equal(path, `/v1/monitors/sessions/${userId}`);
    assert.equal(url.searchParams.get('session_uuid'), 'active-session');
    kicked = true;
  } else if (path === '/v1/sys/notices') {
    data = { items: [], total: 0 };
  }
  await route.fulfill({ json: { code: 200, msg: 'success', data } });
});
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
const row = (name) => page.locator('.vxe-table--main-wrapper .vxe-body--row').filter({ hasText: name }).first();
try {
  await page.goto(`${base}/admin/user`);
  await row('sort_user').waitFor();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('sort_by=join_time')),
    page.locator('.vxe-table--main-wrapper .vxe-header--column').filter({ hasText: '注册时间' }).locator('.vxe-sort--asc-btn').click(),
  ]);
  assert.equal(lastUserQuery.searchParams.get('sort_order'), 'asc');
  const input = page.locator('form input').first();
  await input.fill('sort_user');
  await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).searchParams.get('username') === 'sort_user'),
    input.press('Enter'),
  ]);
  await page.goto(`${base}/admin/monitor/online`);
  await row('a_active').waitFor();
  assert.ok((await row('a_active').textContent()).includes('在线'));
  assert.equal(await row('z_idle').count(), 0);
  await page.getByRole('status', { name: '在线会话数：1' }).waitFor();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/monitors/sessions')),
    page.locator('.vxe-table--main-wrapper .vxe-header--column').filter({ hasText: /^用户名$/ }).locator('.vxe-sort--asc-btn').click(),
  ]);
  assert.ok((await page.locator('.vxe-table--main-wrapper .vxe-body--row').first().textContent()).includes('a_active'));
  await row('a_active').getByRole('button', { name: '强制下线', exact: true }).click();
  await page.getByRole('button', { name: '确认', exact: true }).click();
  await row('a_active').waitFor({ state: 'hidden' });
  assert.equal(kicked, true);
  await page.getByRole('status', { name: '在线会话数：0' }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Admin grid Enter, user time sorting, online sorting/status and string-ID force logout passed.');
} finally {
  await browser.close();
}
