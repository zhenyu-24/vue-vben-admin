import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15_000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const notices = [
  {
    id: '9007199254740993',
    title: '旧版 Markdown 公告',
    content: '# 标题\n\n**正文**\n\n第二段',
    type: 1,
    status: 1,
    created_time: '2026-10-16 12:00:00',
  },
  {
    id: 2,
    title: '已读公告',
    content: '<p>第一段</p><p>第二段</p>',
    type: 0,
    status: 1,
    created_time: '2026-10-16 12:00:00',
  },
  {
    id: 3,
    title: '已移除公告',
    content: '<p>已删除</p>',
    type: 0,
    status: 1,
    created_time: '2026-10-16 12:00:00',
  },
];
const writes = [];
await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  let data = [];
  if (request.method() !== 'GET') {
    const body = request.postDataJSON();
    writes.push({ url: url.pathname, method: request.method(), body });
    if (url.pathname.endsWith('/sys/notices') && request.method() === 'POST') {
      notices.push({
        ...body,
        id: '9007199254740994',
        created_time: '2026-10-16 12:00:00',
      });
    } else if (request.method() === 'PUT') {
      Object.assign(notices.find((item) => url.pathname.endsWith(`/${item.id}`)), body);
    }
  } else if (url.pathname.endsWith('/sys/users/me')) {
    data = {
      id: 1,
      username: 'tester',
      realName: '测试管理员',
      roles: ['admin'],
      is_superuser: true,
      homePath: '/admin/notice',
      avatar: '',
    };
  } else if (url.pathname.endsWith('/sys/notices/user/status')) {
    data = [
      { notice_id: '2', is_read: true, deleted: 0 },
      { notice_id: '3', is_read: false, deleted: 1 },
    ];
  } else if (url.pathname.endsWith('/sys/notices')) {
    data = { items: notices, total: notices.length };
  } else if (url.pathname.endsWith('/sys/roles')) {
    data = {
      items: [{
        id: 1, name: '测试角色', status: 1, is_filter_scopes: false,
        created_time: '2026-10-16 12:00:00',
      }],
      total: 1,
    };
  } else if (url.pathname.endsWith('/logs/opera')) {
    data = {
      items: [{
        id: 1, title: '测试操作', username: 'tester', path: '/api/test',
        method: 'GET', status: 1, code: '200', msg: '成功', cost_time: 10,
        opera_time: '2026-10-16 12:00:00',
      }],
      total: 1,
    };
  }
  await route.fulfill({ json: { code: 200, msg: '成功', data } });
});
await page.addInitScript(() => {
  localStorage.setItem(
    'vben-web-ele-5.7.0-dev-core-access',
    JSON.stringify({ accessToken: 'test-only-token', accessCodes: [] }),
  );
  localStorage.setItem(
    'vben-web-ele-5.7.0-dev-preferences',
    JSON.stringify({ value: { theme: { mode: 'light' } } }),
  );
  localStorage.setItem(
    'vben-web-ele-5.7.0-dev-preferences-theme',
    JSON.stringify({ value: 'light' }),
  );
});
const dialog = () => page.locator('[role="dialog"]:visible').last();
async function settleDialog() {
  await dialog().waitFor();
  await dialog().evaluate((node) => Promise.all(
    node.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {})),
  ));
}
async function assertCentered(button) {
  const layout = await button.evaluate((node) => {
    const group = node.parentElement;
    const cell = group.closest('.vxe-cell');
    const buttons = [...group.querySelectorAll('button')];
    const left = buttons[0].getBoundingClientRect().left;
    const right = buttons.at(-1).getBoundingClientRect().right;
    const rect = cell.getBoundingClientRect();
    return {
      justify: getComputedStyle(group).justifyContent,
      offset: Math.abs((left + right) / 2 - (rect.left + rect.right) / 2),
    };
  });
  assert.equal(layout.justify, 'center');
  assert.ok(layout.offset < 2, JSON.stringify(layout));
}
try {
  await page.goto('http://127.0.0.1:5777/admin/notice');
  await page.getByRole('button', { name: '新增通知公告', exact: true }).waitFor();
  await page.getByText(notices[0].title, { exact: true }).first().waitFor();
  const contentResult = await page.evaluate(async () => {
    const { noticeContentHtml, noticeContentText, hasNoticeContent } =
      await import('/src/utils/notice-content.ts');
    const html = '<p>**保留原文**</p><p style="text-align: center">正文</p>';
    return {
      markdown: noticeContentHtml('# 标题\n\n**正文**'),
      html: noticeContentHtml(html),
      unsafe: noticeContentHtml('<p>公告</p><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">链接</a>'),
      unsafeMarkdown: noticeContentHtml('[链接](javascript:alert%281%29)'),
      summary: noticeContentText('<p>第一段</p><p>第二段<br>第三行</p>'),
      empty: ['', '<p><br></p>', '<p>&nbsp; \u200B</p>', '<script>alert(1)</script>'].map(hasNoticeContent),
      image: hasNoticeContent('<img src="https://example.com/notice.png">'),
    };
  });
  assert.match(contentResult.markdown, /<h1>标题<\/h1>/);
  assert.equal(contentResult.html, '<p>**保留原文**</p><p style="text-align: center">正文</p>');
  assert.doesNotMatch(contentResult.unsafe, /<script|onerror|javascript:/);
  assert.doesNotMatch(contentResult.unsafeMarkdown, /javascript:/);
  assert.equal(contentResult.summary, '第一段 第二段 第三行');
  assert.deepEqual(contentResult.empty, [false, false, false, false]);
  assert.equal(contentResult.image, true);

  await page.locator('.bell-button').click();
  const notification = page.locator('[data-slot="popover-content"]:visible');
  await notification.getByText('已读公告', { exact: true }).waitFor();
  assert.equal(await notification.getByText('已移除公告', { exact: true }).count(), 0);
  const readItem = notification.locator('li').filter({ hasText: '已读公告' });
  assert.equal(await readItem.locator('.bg-primary').count(), 0, 'String and numeric IDs must match');
  assert.match(await readItem.innerText(), /第一段 第二段/);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '预览', exact: true }).first().click();
  await settleDialog();
  assert.equal(Math.round((await dialog().boundingBox()).width), 1080);
  assert.equal(await dialog().locator('h1').innerText(), '标题');
  await page.keyboard.press('Escape');
  await dialog().waitFor({ state: 'hidden' });

  await page.getByRole('button', { name: '修改', exact: true }).first().click();
  await dialog().locator('.tiptap').waitFor();
  await settleDialog();
  const editor = dialog().locator('.tiptap');
  assert.match(await editor.innerText(), /标题/);
  assert.equal(await editor.locator('strong').innerText(), '正文');
  assert.equal(Math.round((await dialog().boundingBox()).width), 1080);
  assert.ok((await editor.boundingBox()).height >= 400);
  await page.screenshot({ path: path.join(tmpdir(), 'notice-tiptap-desktop.png'), fullPage: true, animations: 'disabled' });
  await dialog().getByRole('button', { name: '确认', exact: true }).click();
  await page.locator('[role="dialog"]:visible').waitFor({ state: 'hidden' });
  const update = writes.find((write) => write.method === 'PUT');
  assert.equal(update.url, `/api/v1/sys/notices/${notices[0].id}`);
  assert.match(update.body.content, /<h1>标题<\/h1>/);
  assert.match(update.body.content, /<strong>正文<\/strong>/);

  await page.getByRole('button', { name: '新增通知公告', exact: true }).click();
  await dialog().locator('.tiptap').waitFor();
  await settleDialog();
  assert.equal(await dialog().locator('input.el-input__inner').first().inputValue(), '');
  assert.equal((await dialog().locator('.tiptap').innerText()).trim(), '');
  await dialog().locator('input.el-input__inner').first().fill('新富文本公告');
  await dialog().getByRole('button', { name: '确认', exact: true }).click();
  await page.getByText('请输入内容', { exact: true }).waitFor();
  assert.equal(writes.filter((write) => write.method === 'POST').length, 0);
  await dialog().locator('.tiptap').fill('富文本正文');
  await dialog().getByRole('button', { name: '确认', exact: true }).click();
  await page.locator('[role="dialog"]:visible').waitFor({ state: 'hidden' });
  const created = writes.find((write) => write.method === 'POST');
  assert.equal(created.body.title, '新富文本公告');
  assert.match(created.body.content, /<p>富文本正文<\/p>/);
  await page.getByRole('button', { name: '修改', exact: true }).last().click();
  await dialog().locator('.tiptap').waitFor();
  assert.equal((await dialog().locator('.tiptap').innerText()).trim(), '富文本正文');
  await page.setViewportSize({ width: 390, height: 844 });
  await settleDialog();
  const bounds = await dialog().boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  const editorBounds = await dialog().locator('.vben-tiptap').boundingBox();
  assert.ok(editorBounds.x >= bounds.x && editorBounds.x + editorBounds.width <= bounds.x + bounds.width);
  await page.screenshot({ path: path.join(tmpdir(), 'notice-tiptap-mobile.png'), fullPage: true, animations: 'disabled' });
  await dialog().getByRole('button', { name: '取消', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto('http://127.0.0.1:5777/admin/role');
  await page.getByText('测试角色', { exact: true }).first().waitFor();
  await assertCentered(page.getByRole('button', { name: '修改', exact: true }).first());
  await page.screenshot({ path: path.join(tmpdir(), 'role-centered-actions.png'), fullPage: true, animations: 'disabled' });
  await page.goto('http://127.0.0.1:5777/admin/log/opera');
  await page.getByText('测试操作', { exact: true }).first().waitFor();
  await assertCentered(page.getByRole('button', { name: '详情', exact: true }).first());
  assert.deepEqual(errors, []);
  console.log('PASS: HTML cleanup, Markdown compatibility, notice preview/edit/save/create/reset/validation, string IDs, notification state/summary, desktop/mobile, role and operation actions centered; no page errors');
} catch (error) {
  console.error('URL:', page.url(), 'Errors:', errors);
  console.error((await page.locator('body').innerText()).slice(-2500));
  await page.screenshot({ path: path.join(tmpdir(), 'notice-failure.png'), fullPage: true });
  throw error;
} finally {
  await browser.close();
}
