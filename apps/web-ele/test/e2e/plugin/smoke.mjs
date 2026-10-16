import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

// Playwright is provided by the monorepo root for app browser regressions.
// eslint-disable-next-line n/no-extraneous-import
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1665, height: 950 } });
page.setDefaultTimeout(10_000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const description =
  '提供统一文件上传接口，支持 file/avatar/resource/document/image/audio/video 多种上传类型，按类型分类存储';
const initialPlugins = [
  ['code_generator', '代码生成', '生成通用业务代码', '0.1.1'],
  ['notice', '通知公告', '用于发布系统内部通知、公告', '0.0.2'],
  ['config', '参数配置', '通常用于动态配置系统参数和前端工程数据展示', '0.0.2'],
  ['oauth2', 'OAuth 2.0', '支持 GitHub、Google 等社交平台登录', '0.0.11'],
  ['dict', '数据字典', '通常用于约束前端工程数据展示', '0.0.8'],
  ['email', '电子邮件', '提供邮件发送功能，支持验证码、通知等场景', '0.0.3'],
  ['files', '统一文件上传管理', description, '0.0.1'],
].map(([name, summary, detail, version], index) => ({
  name,
  summary,
  description: detail,
  version,
  author: name === 'files' ? 'xiang' : 'wu-clan',
  enable: index === 0 ? true : index === 1 ? '0' : '1',
  icon: name === 'files' ? 'mdi:file-upload-outline' : 'lucide:puzzle',
  tags: [name === 'files' ? 'storage' : name === 'oauth2' ? 'auth' : 'other'],
}));
let plugins = structuredClone(initialPlugins);
let changed = false;
let failList = false;
let failToggle = false;
let failInstall = false;
const writes = [];
const downloads = [];
await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method();
  const pluginPath = '/api/v1/sys/plugins';
  let data = [];
  if (method !== 'GET') {
    writes.push({
      method,
      pathname: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body: request.postData(),
      contentType: request.headers()['content-type'],
    });
  }
  if (url.pathname.endsWith('/sys/users/me')) {
    data = {
      id: 1,
      username: 'admin',
      nickname: '测试管理员',
      roles: ['admin'],
      is_superuser: true,
      homePath: '/admin/plugin',
      avatar: '',
    };
  } else if (url.pathname === `${pluginPath}/changed`) {
    data = changed;
  } else if (url.pathname === pluginPath && method === 'GET') {
    if (failList) {
      await route.fulfill({
        status: 500,
        json: { code: 500, msg: '测试：列表加载失败', data: null },
      });
      return;
    }
    data = plugins.map((plugin) => ({ plugin }));
  } else if (url.pathname === pluginPath && method === 'POST') {
    if (failInstall) {
      await route.fulfill({
        status: 400,
        json: { code: 400, msg: '测试：安装失败', data: null },
      });
      return;
    }
    changed = true;
    data = null;
  } else if (url.pathname.startsWith(`${pluginPath}/`)) {
    const name = decodeURIComponent(
      url.pathname.slice(pluginPath.length + 1).split('/')[0],
    );
    if (method === 'PUT') {
      if (failToggle) {
        await route.fulfill({
          status: 400,
          json: { code: 400, msg: '测试：状态更新失败', data: null },
        });
        return;
      }
      const plugin = plugins.find((item) => item.name === name);
      plugin.enable =
        plugin.enable === true || plugin.enable === '1' ? '0' : '1';
      changed = true;
    } else if (method === 'DELETE') {
      plugins = plugins.filter((item) => item.name !== name);
      changed = true;
    } else if (method === 'GET') {
      downloads.push(name);
      await route.fulfill({
        contentType: 'application/x-zip-compressed',
        headers: { 'Content-Disposition': `attachment; filename=${name}.zip` },
        body: Buffer.from('PK-test-only-plugin-package'),
      });
      return;
    }
    data = null;
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

const card = (name) => page.getByRole('article', { name, exact: true });
const dialog = () =>
  page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').last();
const artifact = (name) => path.join(tmpdir(), `plugins-${name}.png`);
const responseFor = (method, suffix) =>
  page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith(suffix) &&
      response.request().method() === method,
  );
async function refresh() {
  await Promise.all([
    responseFor('GET', '/sys/plugins'),
    page.getByRole('button', { name: '刷新', exact: true }).first().click(),
  ]);
  await page.getByRole('button', { name: '安装插件', exact: true }).waitFor();
}
async function settleDialog() {
  await dialog().waitFor();
  await dialog().evaluate((element) =>
    Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
}
async function checkTooltip(element, text) {
  const size = await element.evaluate((node) => ({
    width: node.clientWidth,
    scrollWidth: node.scrollWidth,
    height: node.clientHeight,
    scrollHeight: node.scrollHeight,
  }));
  assert.ok(
    size.scrollWidth > size.width || size.scrollHeight > size.height,
    `Expected truncated text: ${text}`,
  );
  await element.hover();
  const tooltip = page.locator('[data-slot="tooltip-content"]');
  await tooltip.waitFor();
  assert.equal(
    await tooltip.evaluate((element) => {
      const content = element.cloneNode(true);
      content.querySelector('[role="tooltip"]')?.remove();
      return content.textContent.trim();
    }),
    text.trim(),
  );
  await page.screenshot({ path: artifact('tooltip'), fullPage: true });
  await page.mouse.move(5, 5);
  await tooltip.waitFor({ state: 'hidden' });
}
async function checkNoTooltip(element) {
  await element.hover();
  await page.waitForTimeout(450);
  assert.equal(
    await page.locator('[data-slot="tooltip-content"]').count(),
    0,
    'Untruncated text and plugin title/author must not show a tooltip',
  );
  await page.mouse.move(5, 5);
}
async function checkLayout() {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    'Page must not overflow horizontally',
  );
  const overlaps = await page.getByRole('article').evaluateAll((articles) =>
    articles.some((article) => {
      const bounds = article.getBoundingClientRect();
      return [...article.querySelectorAll('button, [role="switch"]')].some(
        (element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < bounds.left || rect.right > bounds.right;
        },
      );
    }),
  );
  assert.equal(overlaps, false, 'Card controls must fit');
}

async function setTheme(mode) {
  await page.evaluate((value) => {
    localStorage.setItem(
      'vben-web-ele-5.7.0-dev-preferences',
      JSON.stringify({ value: { theme: { mode: value } } }),
    );
    localStorage.setItem(
      'vben-web-ele-5.7.0-dev-preferences-theme',
      JSON.stringify({ value }),
    );
  }, mode);
  await page.reload();
  await card('统一文件上传管理').waitFor();
  await page.locator('#__app-loading__').waitFor({ state: 'hidden' });
}

try {
  await page.goto('http://127.0.0.1:5777/admin/plugin');
  await card('统一文件上传管理').waitFor();
  await page.locator('#__app-loading__').waitFor({ state: 'hidden' });
  assert.equal(await page.getByRole('article').count(), 7);
  assert.ok((await page.getByText('插件管理', { exact: true }).count()) >= 2);
  assert.equal(writes.length, 0, 'Initial load must not mutate plugin state');
  assert.equal(
    await page.getByRole('button', { name: '刷新插件', exact: true }).count(),
    0,
  );
  for (const label of ['卸载', '打包']) {
    const bounds = await card('统一文件上传管理')
      .getByRole('button', { name: label, exact: true })
      .boundingBox();
    assert.ok(bounds.height >= 36 && bounds.width >= 76, label);
  }
  assert.equal(
    await card('统一文件上传管理').getByText('@xiang', { exact: true }).count(),
    1,
  );
  assert.equal(
    await card('代码生成').getByRole('switch').getAttribute('aria-checked'),
    'true',
  );
  assert.equal(
    await card('通知公告').getByRole('switch').getAttribute('aria-checked'),
    'false',
  );
  await checkLayout();
  await page.screenshot({ path: artifact('desktop'), fullPage: true });
  await checkTooltip(
    card('统一文件上传管理').locator('.plugin-text').nth(2),
    description,
  );
  for (const index of [0, 1, 3]) {
    await checkNoTooltip(
      card('统一文件上传管理').locator('.plugin-text').nth(index),
    );
  }
  await checkNoTooltip(card('电子邮件').locator('.plugin-text').nth(2));
  await checkNoTooltip(card('统一文件上传管理').locator('.plugin-tag'));

  await setTheme('dark');
  await page.screenshot({ path: artifact('dark'), fullPage: true });
  await setTheme('light');

  let response = responseFor('PUT', '/code_generator/status');
  await card('代码生成').locator('.admin-status-switch').click();
  await response;
  await page.waitForFunction(
    () =>
      document
        .querySelector('article[aria-label="代码生成"] [role="switch"]')
        ?.getAttribute('aria-checked') === 'false',
  );
  await page
    .getByText('插件配置已变更，请根据插件说明完成配置并重启服务后生效。', {
      exact: true,
    })
    .waitFor();
  failToggle = true;
  response = responseFor('PUT', '/code_generator/status');
  await card('代码生成').locator('.admin-status-switch').click();
  await response;
  await page.getByText('测试：状态更新失败', { exact: true }).waitFor();
  assert.equal(
    await card('代码生成').getByRole('switch').getAttribute('aria-checked'),
    'false',
  );
  failToggle = false;

  await card('统一文件上传管理')
    .getByRole('button', { name: '打包', exact: true })
    .click();
  await settleDialog();
  await page.screenshot({ path: artifact('confirm'), fullPage: true });
  await dialog().getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(downloads.length, 0);
  await card('统一文件上传管理')
    .getByRole('button', { name: '打包', exact: true })
    .click();
  const download = page.waitForEvent('download');
  await dialog().getByRole('button', { name: '打包下载', exact: true }).click();
  assert.equal((await download).suggestedFilename(), 'files.zip');
  assert.deepEqual(downloads, ['files']);

  await card('电子邮件')
    .getByRole('button', { name: '卸载', exact: true })
    .click();
  await dialog().getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(writes.filter((write) => write.method === 'DELETE').length, 0);
  await card('电子邮件')
    .getByRole('button', { name: '卸载', exact: true })
    .click();
  response = responseFor('DELETE', '/plugins/email');
  await dialog().getByRole('button', { name: '卸载', exact: true }).click();
  await response;
  await card('电子邮件').waitFor({ state: 'detached' });

  await page.getByRole('button', { name: '安装插件', exact: true }).click();
  await dialog().getByRole('button', { name: '安装', exact: true }).click();
  await page.getByText('请选择 ZIP 插件包', { exact: true }).waitFor();
  assert.equal(writes.filter((write) => write.method === 'POST').length, 0);
  const fileInput = dialog().locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'wrong.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('invalid'),
  });
  await page.getByText('只能上传 ZIP 插件包', { exact: true }).waitFor();
  await dialog()
    .getByText('wrong.txt', { exact: true })
    .waitFor({ state: 'detached' });
  await fileInput.setInputFiles({
    name: 'first.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from('first'),
  });
  await dialog().getByText('first.zip', { exact: true }).waitFor();
  await fileInput.setInputFiles({
    name: 'replacement.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from('replacement-data'),
  });
  await dialog().getByText('replacement.zip', { exact: true }).waitFor();
  await dialog()
    .getByText('first.zip', { exact: true })
    .waitFor({ state: 'detached' });
  await page.screenshot({ path: artifact('install-zip'), fullPage: true });
  response = responseFor('POST', '/sys/plugins');
  await dialog().getByRole('button', { name: '安装', exact: true }).click();
  await response;
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const zipWrite = writes.find((write) => write.method === 'POST');
  assert.equal(zipWrite.query.type, 'zip');
  assert.match(zipWrite.contentType, /multipart\/form-data; boundary=/);
  assert.match(zipWrite.body, /name="file"; filename="replacement.zip"/);
  assert.match(zipWrite.body, /replacement-data/);

  await page.getByRole('button', { name: '安装插件', exact: true }).click();
  assert.equal(
    await dialog().getByText('replacement.zip', { exact: true }).count(),
    0,
  );
  await dialog().getByText('Git 仓库', { exact: true }).click();
  const repoInput = dialog().getByPlaceholder(
    'https://github.com/org/plugin.git',
  );
  await repoInput.fill('git@github.com:org/plugin.git');
  await dialog().getByRole('button', { name: '安装', exact: true }).click();
  await dialog()
    .getByText('请输入有效的 HTTP 或 HTTPS 仓库地址', { exact: true })
    .waitFor();
  assert.equal(writes.filter((write) => write.method === 'POST').length, 1);
  const repo = 'https://github.com/test/plugin.git';
  await repoInput.fill(repo);
  failInstall = true;
  response = responseFor('POST', '/sys/plugins');
  await dialog().getByRole('button', { name: '安装', exact: true }).click();
  await response;
  await page.getByText('测试：安装失败', { exact: true }).waitFor();
  assert.equal(await repoInput.inputValue(), repo);
  const longPlugin = {
    ...initialPlugins.at(-1),
    summary: '统一文件上传管理及多种资源分类存储和上传配置扩展插件',
    author: 'xiang-and-a-long-team-name-for-plugin-maintenance',
    version: '0.0.1-preview-with-a-long-release-version-number',
    tags: ['a-very-long-storage-category-that-must-fit-inside-the-card'],
    icon: 'https://plugin.test/missing.png',
  };
  await page.route('https://plugin.test/missing.png', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  // Installation refreshes the existing keyed card without remounting it.
  plugins = [longPlugin];
  failInstall = false;
  response = responseFor('POST', '/sys/plugins');
  await dialog().getByRole('button', { name: '安装', exact: true }).click();
  await response;
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.deepEqual(writes.at(-1).query, { type: 'git', repo_url: repo });

  const longCard = card(longPlugin.summary);
  await longCard.waitFor();
  await checkNoTooltip(longCard.locator('.plugin-text').nth(0));
  await checkNoTooltip(longCard.locator('.plugin-text').nth(1));
  await checkTooltip(
    longCard.locator('.plugin-text').nth(3),
    `v${longPlugin.version}`,
  );
  await page.waitForFunction(
    () => document.querySelector('article img') === null,
  );
  await checkLayout();
  await page.setViewportSize({ width: 390, height: 844 });
  await checkLayout();
  await checkTooltip(
    longCard.locator('.plugin-tag .truncate'),
    longPlugin.tags[0],
  );
  await page.screenshot({
    path: artifact('mobile-long-text'),
    fullPage: true,
    animations: 'disabled',
  });
  plugins = structuredClone(initialPlugins);
  changed = false;
  await refresh();
  await card('统一文件上传管理').waitFor();
  await checkNoTooltip(card('电子邮件').locator('.plugin-text').nth(2));
  await page.waitForFunction(
    () => document.querySelectorAll('.el-message').length === 0,
  );
  await page.screenshot({ path: artifact('mobile'), fullPage: true });
  await page.getByRole('button', { name: '安装插件', exact: true }).click();
  await dialog().waitFor();
  await dialog().evaluate((element) =>
    Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
  const bounds = await dialog().boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 844);
  await page.screenshot({ path: artifact('install-mobile'), fullPage: true });
  await dialog().getByRole('button', { name: '取消', exact: true }).click();

  await page.setViewportSize({ width: 1665, height: 950 });
  failList = true;
  await refresh();
  await page.getByText('插件列表加载失败，请重试。', { exact: true }).waitFor();
  failList = false;
  plugins = [];
  response = responseFor('GET', '/sys/plugins');
  await page.getByRole('button', { name: '重新加载', exact: true }).click();
  await response;
  await page.getByText('暂无插件', { exact: true }).waitFor();
  plugins = structuredClone(initialPlugins);
  await refresh();
  await card('统一文件上传管理').waitFor();
  await page.setViewportSize({ width: 2500, height: 950 });
  await checkNoTooltip(card('统一文件上传管理').locator('.plugin-text').nth(2));
  await page.setViewportSize({ width: 1665, height: 950 });
  await checkTooltip(
    card('统一文件上传管理').locator('.plugin-text').nth(2),
    description,
  );
  await card('统一文件上传管理').locator('.plugin-text').nth(2).hover();
  await page.locator('[data-slot="tooltip-content"]').waitFor();
  await page.setViewportSize({ width: 2500, height: 950 });
  await page.locator('[data-slot="tooltip-content"]').waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
  process.stdout.write(
    'PASS: menu, plugin cards, author, truncation tooltips, boolean/string status, failed status rollback, download/uninstall confirmation, ZIP validation/replacement/multipart, Git validation/retry, broken icon fallback, empty/error/retry, desktop/mobile, light/dark; no page errors\n',
  );
} catch (error) {
  console.error('URL:', page.url(), 'Page errors:', errors);
  console.error((await page.locator('body').innerText()).slice(-4000));
  await page.screenshot({ path: artifact('failure'), fullPage: true });
  throw error;
} finally {
  await browser.close();
}
