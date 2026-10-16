import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

// eslint-disable-next-line n/no-extraneous-import
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1665, height: 950 } });
page.setDefaultTimeout(10_000);
const errors = [];
const writes = [];
page.on('pageerror', (error) => errors.push(error.message));
const email = 'department-with-a-very-long-name-for-testing@example.test';
const dept = {
  id: '11',
  name: '测试部门',
  parent_id: null,
  leader: '小李',
  phone: '13800000000',
  email,
  sort: 0,
  status: 1,
  created_time: '2026-10-16 12:00:00',
  children: [],
};
const roleNames = ['管理员', '负责跨部门协作和资源管理的业务审核员', '访客'];
const users = [1, 2].map((id) => ({
  id,
  username: `tester${id}`,
  nickname: `测试用户${id}`,
  roles: (id === 1 ? roleNames.slice(0, 1) : roleNames).map((name, index) => ({
    id: index + 1,
    name,
  })),
  dept: null,
  status: 1,
  is_superuser: false,
  is_staff: true,
  is_multi_login: false,
}));
await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  let data = [];
  if (request.method() !== 'GET') {
    writes.push({ method: request.method(), path: url.pathname });
    data = null;
  } else if (url.pathname.endsWith('/sys/users/me')) {
    data = {
      id: 99,
      username: 'admin',
      nickname: '测试管理员',
      roles: ['admin'],
      is_superuser: true,
      homePath: '/admin/dept',
      avatar: '',
    };
  } else if (url.pathname.endsWith('/sys/depts')) {
    data = [dept];
  } else if (url.pathname.endsWith('/sys/users')) {
    data = { items: users, total: users.length };
  } else if (url.pathname.endsWith('/sys/configs/all')) {
    data = [
      ['USER_SECURITY_CONFIG_STATUS', '1'],
      ['USER_LOCK_THRESHOLD', '5'],
    ].map(([key, value], id) => ({
      id: id + 1,
      name: key,
      key,
      value,
      type: 'USER_SECURITY',
      is_frontend: false,
      created_time: '2026-10-16 12:00:00',
    }));
  }
  await route.fulfill({ json: { code: 200, msg: '成功', data } });
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
const tooltip = () => page.locator('[data-slot="tooltip-content"]');
const tableTooltip = () =>
  page.locator('.vxe-tooltip--wrapper.is--visible .vxe-tooltip--content');
const dialog = () => page.locator('[role="alertdialog"]:visible').last();
async function dismissTooltip() {
  await page.mouse.move(5, 5);
  await tooltip().waitFor({ state: 'hidden' });
  await tableTooltip().waitFor({ state: 'hidden' });
}
async function styleOf(element) {
  return element.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      color: style.color,
      background: style.backgroundColor,
      radius: style.borderRadius,
      font: style.fontSize,
      lineHeight: style.lineHeight,
      padding: style.padding,
    };
  });
}
async function screenshot(name) {
  await page.screenshot({
    path: path.join(tmpdir(), `feedback-${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}
async function settleDialog() {
  await dialog().waitFor();
  await dialog().evaluate((node) =>
    Promise.all(
      node
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
}

try {
  await page.goto('http://127.0.0.1:5777/admin/dept');
  await page.getByText(dept.name, { exact: true }).first().waitFor();
  await page.locator('#__app-loading__').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '展开全部', exact: true }).hover();
  await tooltip().waitFor();
  const sharedStyle = await styleOf(tooltip());
  assert.equal(sharedStyle.radius, '6px');
  assert.equal(sharedStyle.font, '14px');
  assert.equal(sharedStyle.lineHeight, '20px');
  await screenshot('vben-tooltip');
  await dismissTooltip();
  await page.getByText(dept.leader, { exact: true }).hover();
  await page.waitForTimeout(450);
  assert.equal(await tableTooltip().count(), 0, 'Short cells need no tooltip');
  const longCell = page.getByText(email, { exact: true });
  await longCell.hover();
  await tableTooltip().waitFor();
  assert.equal(await tableTooltip().textContent(), email);
  const bodyStyle = await styleOf(
    page.locator('.vxe-tooltip--wrapper.is--visible .vxe-tooltip--body'),
  );
  const textStyle = await styleOf(tableTooltip());
  for (const key of ['color', 'background', 'radius']) {
    assert.equal(bodyStyle[key], sharedStyle[key], `Table tooltip ${key}`);
  }
  for (const key of ['font', 'lineHeight', 'padding']) {
    assert.equal(textStyle[key], sharedStyle[key], `Table tooltip ${key}`);
  }
  const tooltipWidth = await tableTooltip().evaluate((node) => ({
    width: node.getBoundingClientRect().width,
    maxWidth: getComputedStyle(node).maxWidth,
    whiteSpace: getComputedStyle(node).whiteSpace,
    overflow: node.scrollWidth > node.clientWidth,
  }));
  assert.ok(tooltipWidth.width <= 360, JSON.stringify(tooltipWidth));
  assert.equal(tooltipWidth.overflow, false);
  await screenshot('table-tooltip');
  await dismissTooltip();
  await page.getByRole('button', { name: '删除', exact: true }).first().click();
  await settleDialog();
  await screenshot('delete-confirm');
  await dialog().getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(writes.length, 0, 'Cancel must not delete');
  await page.getByRole('button', { name: '删除', exact: true }).first().click();
  await dialog().getByRole('button', { name: '确认', exact: true }).click();
  await page.waitForResponse((response) =>
    response.request().method() === 'GET' &&
    new URL(response.url()).pathname.endsWith('/sys/depts'),
  );
  assert.deepEqual(writes, [{ method: 'DELETE', path: '/api/v1/sys/depts/11' }]);

  await page.goto('http://127.0.0.1:5777/admin/user');
  const shortRole = page.locator('.vxe-body--row').filter({ hasText: 'tester1' })
    .locator('.el-tag').filter({ hasText: '管理员' }).first();
  await shortRole.hover();
  await page.waitForTimeout(450);
  assert.equal(await tooltip().count(), 0, 'One short role needs no tooltip');
  const longRoles = page.locator('.vxe-body--row').filter({ hasText: 'tester2' })
    .locator('.truncate').filter({ hasText: '管理员' }).first();
  await longRoles.hover();
  await tooltip().waitFor();
  assert.equal(await styleOf(tooltip()).then((style) => style.radius), sharedStyle.radius);
  for (const name of roleNames) {
    assert.ok((await tooltip().textContent()).includes(name));
  }
  await screenshot('roles-tooltip');
  await dismissTooltip();

  await page.goto('http://127.0.0.1:5777/admin/config');
  await page.getByRole('button', { name: '修改配置', exact: true }).click();
  await page.getByRole('spinbutton', { name: '密码错误锁定阈值', exact: true }).fill('7');
  await page.getByText('有未保存的修改', { exact: true }).waitFor();
  const leave = () => page.getByText('部门管理', { exact: true }).last().click();
  await leave();
  await settleDialog();
  await screenshot('leave-confirm');
  await dialog().getByRole('button', { name: '继续编辑', exact: true }).click();
  assert.ok(page.url().endsWith('/admin/config'));
  assert.equal(
    await page.getByRole('spinbutton', { name: '密码错误锁定阈值', exact: true }).inputValue(),
    '7',
  );
  await leave();
  await dialog().getByRole('button', { name: '离开', exact: true }).click();
  await page.waitForURL('**/admin/dept');
  assert.equal(writes.length, 1, 'Leaving must not save config');
  await page.evaluate(() => {
    for (const [key, value] of [
      ['vben-web-ele-5.7.0-dev-preferences', { value: { theme: { mode: 'dark' } } }],
      ['vben-web-ele-5.7.0-dev-preferences-theme', { value: 'dark' }],
    ]) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  });
  await page.reload();
  await page.getByRole('button', { name: '展开全部', exact: true }).hover();
  await tooltip().waitFor();
  assert.notEqual((await styleOf(tooltip())).background, sharedStyle.background);
  await screenshot('dark-tooltip');
  await dismissTooltip();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '删除', exact: true }).last().click();
  await settleDialog();
  const bounds = await dialog().boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 844);
  await screenshot('mobile-confirm');
  await dialog().getByRole('button', { name: '取消', exact: true }).click();
  assert.deepEqual(errors, []);
  process.stdout.write(
    'PASS: shared/table tooltip styles, short text without tooltip, role overflow, delete cancel/confirm, unsaved navigation cancel/leave, dark/mobile dialogs; no page errors\n',
  );
} catch (error) {
  console.error('URL:', page.url(), 'Page errors:', errors);
  console.error((await page.locator('body').innerText()).slice(-4000));
  await screenshot('failure');
  throw error;
} finally {
  await browser.close();
}
