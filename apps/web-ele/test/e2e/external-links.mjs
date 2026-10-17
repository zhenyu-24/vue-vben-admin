import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

// Browser tooling is supplied by the monorepo root devDependencies.
// eslint-disable-next-line n/no-extraneous-import
import { chromium } from 'playwright';

const base = process.env.TEST_BASE_URL || 'http://localhost:5777';
const output = join(tmpdir(), 'external-links-regression');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.TEST_BROWSER_CHANNEL
    ? { channel: process.env.TEST_BROWSER_CHANNEL }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const errors = [];
const unexpected = [];
let sequence = 9007199254741000n;
const record = (title, kind, parent_id = null, extra = {}) => ({
  id: String(sequence++),
  title,
  kind,
  parent_id,
  url: '',
  open_mode: 'iframe',
  display_mode: 'menu',
  icon: '',
  description: '',
  sort: 0,
  enabled: true,
  ...extra,
});
const group = record('Dify', 'group');
const nested = record('应用分组', 'group', group.id);
const embedded = record('Dify-1', 'link', nested.id, {
  url: 'https://example.com/embedded',
});
const tools = record('工具箱', 'group', null, { display_mode: 'buttons' });
const toolGroup = record('开发工具', 'group', tools.id);
const imagePath = '/static/upload/image/2026/10/17/icon_1792239952000.png';
const image = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jh6kAAAAASUVORK5CYII=',
  'base64',
);
const tool = record('在线工具', 'link', toolGroup.id, {
  url: 'https://example.com/tool',
  icon: imagePath,
});
const external = record('外部文档', 'link', tools.id, {
  url: 'https://example.com/docs',
  open_mode: 'external',
});
let records = [group, nested, embedded, tools, toolGroup, tool, external];
let superuser = true;
let unavailable = false;
let uploadCount = 0;
const published = () =>
  records.filter((item) => {
    let node = item;
    while (node) {
      if (!node.enabled) return false;
      node = records.find((row) => row.id === node.parent_id);
    }
    return true;
  });
await context.addInitScript(() => {
  localStorage.setItem(
    'vben-web-ele-5.7.0-dev-core-access',
    JSON.stringify({ accessToken: 'ui-test' }),
  );
});
await context.route('https://example.com/**', (route) =>
  route.fulfill({
    contentType: 'text/html',
    body: '<html><body><h1>Embedded test page</h1><button>Test action</button></body></html>',
  }),
);
await context.route('http://localhost:8000/static/upload/**', (route) =>
  route.fulfill({ contentType: 'image/png', body: image }),
);
await context.route('http://localhost:8000/api/**', async (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname.replace('/api', '');
  let data;
  let status = 200;
  if (path === '/v1/file/upload') {
    assert.equal(
      new URL(request.url()).searchParams.get('upload_type'),
      'image',
    );
    assert.match(request.headers()['content-type'], /multipart\/form-data/);
    assert(
      request.postDataBuffer().includes(Buffer.from('filename="icon.png"')),
    );
    uploadCount++;
    data = { url: `http://localhost:8000${imagePath}` };
  } else if (path.startsWith('/v1/sys/external-links')) {
    if (unavailable) status = 404;
    else if (request.method() === 'GET') {
      data = path.endsWith('/manage') ? records : published();
    } else if (request.method() === 'POST') {
      data = { ...request.postDataJSON(), id: String(sequence++) };
      records.push(data);
    } else {
      const id = path.split('/').at(-1);
      if (request.method() === 'DELETE')
        records = records.filter((row) => row.id !== id);
      else {
        data = { ...request.postDataJSON(), id };
        records = records.map((row) => (row.id === id ? data : row));
      }
    }
  } else if (path === '/v1/sys/users/me') {
    data = {
      id: '1',
      username: 'admin',
      nickname: '测试管理员',
      roles: [],
      is_superuser: superuser,
      homePath: '/external-pages/overview',
    };
  } else if (path === '/v1/auth/codes' || path.includes('/status')) data = [];
  else if (path === '/v1/sys/notices') data = { items: [], total: 0 };
  else if (path === '/v1/sys/menus/sidebar') {
    data = [
      {
        name: 'Admin',
        path: '/admin',
        component: 'BasicLayout',
        meta: { title: '系统管理' },
        children: [
          {
            name: 'AdminConfig',
            path: '/admin/config',
            component: '/admin/config/index',
            meta: { title: '参数配置', order: 20 },
          },
          {
            name: 'AdminPlugin',
            path: '/admin/plugin',
            component: '/admin/plugin/index',
            meta: { title: '插件管理', order: 10 },
          },
          {
            name: 'AdminScheduler',
            path: '/admin/scheduler',
            component: '/admin/scheduler/manage/index',
            meta: { title: '任务调度', order: 5 },
          },
        ],
      },
    ];
  } else {
    unexpected.push(path);
    data = [];
  }
  await route.fulfill({
    status,
    json: {
      code: status,
      msg: status === 200 ? 'success' : 'unavailable',
      data,
    },
  });
});
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
const go = async (path) => {
  await page.goto(`${base}${path}`);
  await page.locator('#__app-loading__').waitFor({ state: 'hidden' });
  await page
    .locator('.vben-loading')
    .waitFor({ state: 'hidden' })
    .catch(() => {});
};
const row = (title) =>
  page.locator('.el-table__body tr').filter({ hasText: title }).first();
try {
  await go('/admin/external-links');
  await row('Dify-1').waitFor();
  assert.equal(await page.locator('.el-table__body tr').count(), 7);
  assert.equal(
    await row('Dify').locator('.admin-status-switch').innerText(),
    '启用',
  );
  await page.locator('aside').getByText('系统管理', { exact: true }).click();
  let menuNames = await page
    .locator('aside [role="menuitem"]')
    .allTextContents();
  let managerIndex = menuNames.findIndex((name) => name.trim() === '外部链接');
  assert.equal(menuNames[managerIndex + 1]?.trim(), '插件管理');
  assert.equal(
    await page.locator('aside [data-icon="lucide:folder"]').count(),
    0,
  );
  await page.getByRole('textbox', { name: '搜索名称或地址' }).fill('Dify-1');
  await row('Dify-1').waitFor();
  assert.equal(
    await row('Dify')
      .getByRole('button', { name: '删除', exact: true })
      .isDisabled(),
    true,
  );
  await page.getByRole('textbox', { name: '搜索名称或地址' }).clear();
  await page.getByRole('button', { name: '新增', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('textbox', { name: '名称', exact: true })
    .fill('临时分类');
  await dialog.getByRole('button', { name: '选择图标', exact: true }).click();
  const iconOptions = page.getByRole('group', {
    name: '内置图标',
    exact: true,
  });
  await page.waitForFunction(
    () => document.querySelectorAll('.icon-option svg').length === 24,
  );
  await page.screenshot({
    path: join(output, 'icon-picker-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await iconOptions
    .getByRole('button', { name: '智能助手', exact: true })
    .click();
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await row('临时分类').waitFor();
  assert(records.some((item) => item.title === '临时分类'));
  assert.equal(
    records.find((item) => item.title === '临时分类').icon,
    'lucide:bot',
  );
  await page.locator('aside').getByText('外部页面', { exact: true }).click();
  await page.locator('aside').getByText('临时分类', { exact: true }).waitFor();
  await row('临时分类')
    .getByRole('button', { name: '编辑', exact: true })
    .click();
  await dialog
    .getByRole('textbox', { name: '名称', exact: true })
    .fill('更新分类');
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'wrong.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('invalid'),
  });
  await page
    .getByText('请选择 PNG、JPG、GIF、WebP 或 SVG 图片', { exact: true })
    .waitFor();
  assert.equal(uploadCount, 0);
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'too-large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await page.getByText('图标图片不能超过 5MB', { exact: true }).waitFor();
  assert.equal(uploadCount, 0);
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'my-logo.png',
    mimeType: 'image/png',
    buffer: image,
  });
  await page.getByText('图标已上传', { exact: true }).waitFor();
  assert.equal(uploadCount, 1);
  await dialog.locator('img.icon-preview').waitFor();
  await page.screenshot({
    path: join(output, 'icon-upload-desktop.png'),
    fullPage: true,
  });
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await row('更新分类').waitFor();
  assert.equal(
    records.find((item) => item.title === '更新分类').icon,
    imagePath,
  );
  await page.waitForFunction(() => {
    const img = [...document.querySelectorAll('aside img')].find((item) =>
      item.src.includes('icon_1792239952000'),
    );
    return img?.complete && img.naturalWidth > 0;
  });
  await row('更新分类')
    .getByRole('button', { name: '编辑', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: '恢复默认图标', exact: true })
    .click();
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(records.find((item) => item.title === '更新分类').icon, '');
  await row('更新分类')
    .getByRole('button', { name: '删除', exact: true })
    .click();
  await page.getByRole('button', { name: '确定', exact: true }).click();
  await row('更新分类').waitFor({ state: 'hidden' });
  assert.equal(
    await page.locator('aside').getByText('更新分类', { exact: true }).count(),
    0,
  );
  await page.screenshot({
    path: join(output, 'manager-desktop.png'),
    fullPage: true,
  });

  await go(`/external-pages/group/${group.id}`);
  await page
    .frameLocator('iframe[title="Dify-1"]')
    .getByRole('heading', { name: 'Embedded test page' })
    .waitFor();
  assert.equal(
    new URL(page.url()).pathname,
    `/external-pages/page/${embedded.id}`,
  );
  await page.locator('aside').getByText('应用分组', { exact: true }).waitFor();
  await page.locator('aside').getByText('Dify-1', { exact: true }).waitFor();
  await page.screenshot({
    path: join(output, 'nested-menu-desktop.png'),
    fullPage: true,
  });

  await go(`/external-pages/group/${tools.id}`);
  await page.getByRole('button', { name: '在线工具' }).waitFor();
  await page.getByRole('heading', { name: '开发工具' }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: '刷新外部页面' }).count(),
    0,
  );
  await page.waitForFunction(() => {
    const img = document.querySelector('.link-button img');
    return img?.complete && img.naturalWidth > 0;
  });
  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: '外部文档' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  assert.equal(popup.url(), external.url);
  await popup.close();
  await page.screenshot({
    path: join(output, 'directory-desktop.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: '在线工具' }).click();
  await page
    .frameLocator('iframe[title="在线工具"]')
    .getByRole('heading', { name: 'Embedded test page' })
    .waitFor();
  assert.equal(new URL(page.url()).pathname, `/external-pages/page/${tool.id}`);
  assert.equal(
    await page
      .getByRole('button', { name: '重新加载页面', exact: true })
      .count(),
    0,
  );
  await page.screenshot({
    path: join(output, 'iframe-desktop.png'),
    fullPage: true,
  });

  await go('/admin/external-links');
  await row('Dify').locator('.el-switch').click();
  await page.waitForFunction(() => {
    const control = [...document.querySelectorAll('.el-table__body tr')]
      .find(
        (item) =>
          item.querySelector('.name-cell')?.textContent.trim() === 'Dify',
      )
      ?.querySelector('.admin-status-switch');
    return (
      control?.innerText?.trim() === '禁用' &&
      !control.classList.contains('is-loading')
    );
  });
  await page
    .getByText('配置已保存', { exact: true })
    .waitFor({ state: 'hidden' })
    .catch(() => {});
  assert.equal(records.find((item) => item.id === group.id).enabled, false);
  assert.equal(
    await row('Dify').locator('.admin-status-switch').innerText(),
    '禁用',
  );
  await go('/external-pages/overview');
  await page.getByRole('button', { name: '在线工具' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Dify-1' }).count(), 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await go('/admin/external-links');
  await row('Dify-1').waitFor();
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page.screenshot({
    path: join(output, 'manager-mobile.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: '新增', exact: true }).click();
  await dialog.waitFor();
  await dialog.getByRole('textbox', { name: '名称', exact: true }).waitFor();
  await dialog.getByRole('button', { name: '选择图标', exact: true }).click();
  await iconOptions.waitFor();
  const pickerBounds = await iconOptions.boundingBox();
  assert(pickerBounds.x >= 0 && pickerBounds.x + pickerBounds.width <= 391);
  await page.screenshot({
    path: join(output, 'icon-picker-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await iconOptions.getByRole('button', { name: '工具', exact: true }).click();
  const bounds = await dialog.boundingBox();
  assert(bounds.x >= 0 && bounds.x + bounds.width <= 391);
  await page.screenshot({
    path: join(output, 'dialog-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await go(`/external-pages/group/${tools.id}`);
  await page.getByRole('button', { name: '在线工具' }).waitFor();
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page.screenshot({
    path: join(output, 'directory-mobile.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    const key = 'vben-web-ele-5.7.0-dev-preferences';
    const settings = JSON.parse(localStorage.getItem(key));
    settings.value.app.accessMode = 'backend';
    settings.value.sidebar.collapsed = false;
    settings.value.theme.mode = 'light';
    localStorage.setItem(key, JSON.stringify(settings));
    localStorage.setItem(`${key}-theme`, JSON.stringify({ value: 'light' }));
  });
  await go('/admin/external-links');
  await row('Dify-1').waitFor();
  await page.locator('aside').getByText('系统管理', { exact: true }).waitFor();
  await page.locator('aside').getByText('系统管理', { exact: true }).click();
  await page.locator('aside').getByText('插件管理', { exact: true }).waitFor();
  menuNames = await page.locator('aside [role="menuitem"]').allTextContents();
  managerIndex = menuNames.findIndex((name) => name.trim() === '外部链接');
  assert.equal(menuNames[managerIndex + 1]?.trim(), '插件管理');
  await page.screenshot({
    path: join(output, 'manager-backend-light.png'),
    fullPage: true,
  });

  await page.evaluate(() => {
    const key = 'vben-web-ele-5.7.0-dev-preferences';
    const settings = JSON.parse(localStorage.getItem(key));
    settings.value.app.accessMode = 'frontend';
    localStorage.setItem(key, JSON.stringify(settings));
  });
  superuser = false;
  await go('/admin/external-links');
  await page.waitForURL('**/403');
  unavailable = true;
  await go('/external-pages/overview');
  await page.getByText('外部页面插件未启用', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  console.log(
    JSON.stringify(
      {
        result: 'passed',
        screenshots: output,
        checks: [
          'CRUD and live menu refresh',
          'nested sidebar menu and redirect',
          'backend menu mode and light theme',
          'nested button categories',
          'iframe without refresh buttons',
          'shared enabled/disabled status switch',
          'menu position in frontend and backend modes',
          'built-in icon selection and reset',
          'image upload validation, persistence and menu/category rendering',
          'external window',
          'parent disable',
          'snowflake IDs',
          'mobile layout',
          'admin authorization',
          'plugin unavailable',
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({ path: join(output, 'failure.png'), fullPage: true });
  console.error({
    url: page.url(),
    errors,
    unexpected,
    body: (await page.locator('body').innerText()).slice(-4000),
  });
  throw error;
} finally {
  await browser.close();
}
