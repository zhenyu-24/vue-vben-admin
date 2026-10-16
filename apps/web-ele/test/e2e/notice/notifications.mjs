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
page.on('pageerror', (error) => errors.push(error.message));

const notices = [
  {
    id: '9007199254740993',
    title: 'Markdown notification',
    content: `# Heading\n\n**Formatted body**\n\n${'Long content. '.repeat(30)}\n\nEnd of full content.`,
  },
  {
    id: 2,
    title: 'Read notification',
    content: '<p>First paragraph</p><p><s>Second paragraph</s></p>',
  },
  {
    id: 3,
    title: 'Deleted notification',
    content: '<p>Hidden content</p>',
  },
  {
    id: 4,
    title: 'HTML notification',
    content:
      '<h2>HTML heading</h2><p><strong><em>Rich text body</em></strong></p><script>window.unsafeNotice = true</script>',
  },
].map((notice) => ({
  ...notice,
  type: 1,
  status: 1,
  created_time: '2026-10-17 12:00:00',
}));
const statuses = new Map([
  ['2', { notice_id: '2', is_read: true, deleted: 0 }],
  ['3', { notice_id: '3', is_read: false, deleted: 1 }],
]);
const readIds = [];
let failRead = false;

await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  let data = [];
  const readId = url.pathname.match(
    /\/sys\/notices\/user\/read\/([^/]+)$/,
  )?.[1];
  if (readId && request.method() === 'POST') {
    readIds.push(readId);
    if (failRead) {
      await route.fulfill({
        status: 500,
        json: { code: 500, msg: 'Read status failed', data: null },
      });
      return;
    }
    statuses.set(readId, { notice_id: readId, is_read: true, deleted: 0 });
  } else if (url.pathname.endsWith('/sys/users/me')) {
    data = {
      id: 1,
      username: 'tester',
      realName: 'Notification tester',
      roles: ['admin'],
      is_superuser: true,
      homePath: '/admin/notice',
      avatar: '',
    };
  } else if (url.pathname.endsWith('/sys/notices/user/status')) {
    data = [...statuses.values()];
  } else if (url.pathname.endsWith('/sys/notices')) {
    data = { items: notices, total: notices.length };
  }
  await route.fulfill({ json: { code: 200, msg: 'OK', data } });
});

await page.addInitScript(() => {
  localStorage.setItem(
    'vben-web-ele-5.7.0-dev-core-access',
    JSON.stringify({ accessToken: 'test-only-token', accessCodes: [] }),
  );
  localStorage.setItem(
    'vben-web-ele-5.7.0-dev-preferences',
    JSON.stringify({
      value: {
        theme: { mode: 'light' },
        shortcutKeys: { enable: true, globalEscape: true },
      },
    }),
  );
  localStorage.setItem(
    'vben-web-ele-5.7.0-dev-preferences-theme',
    JSON.stringify({ value: 'light' }),
  );
});

const dialogs = page.locator('[role="dialog"]:visible');
const popup = page.locator('[data-slot="popover-content"]:visible');
const title = (text) =>
  dialogs.locator('.text-center').getByText(text, { exact: true });

async function settleDialog(expectedTitle) {
  await title(expectedTitle).waitFor();
  await dialogs.evaluate((node) =>
    Promise.all(
      node
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
  assert.equal(
    await dialogs.count(),
    1,
    'Only one notification dialog should be visible',
  );
}

async function openNotifications() {
  await page.locator('.bell-button').click();
  await popup.waitFor();
}

async function closeDialog() {
  await dialogs.locator('[data-slot="dialog-close"]').click();
}

try {
  await page.goto(
    process.env.NOTICE_TEST_URL || 'http://127.0.0.1:5777/admin/notice',
  );
  await page
    .getByRole('button', { name: '新增通知公告', exact: true })
    .waitFor();
  await openNotifications();
  assert.equal(await popup.locator('li').count(), 3);
  assert.equal(
    await popup.getByText(notices[2].title, { exact: true }).count(),
    0,
  );

  // A single click shows the entire body and does not enqueue other messages.
  await popup.getByText(notices[0].title, { exact: true }).click();
  await settleDialog(notices[0].title);
  await popup.waitFor({ state: 'hidden' });
  assert.equal(await dialogs.locator('h1').innerText(), 'Heading');
  assert.equal(await dialogs.locator('strong').innerText(), 'Formatted body');
  assert.match(await dialogs.innerText(), /End of full content\./);
  assert.equal(Math.round((await dialogs.boundingBox()).width), 1080);
  await closeDialog();
  await dialogs.waitFor({ state: 'hidden' });
  assert.deepEqual(readIds, [notices[0].id]);

  await openNotifications();
  const firstItem = popup.locator('li').filter({ hasText: notices[0].title });
  assert.equal(await firstItem.locator('.bg-primary').count(), 0);
  await popup
    .getByRole('button', { name: '查看所有消息', exact: true })
    .click();
  await settleDialog(notices[0].title);
  await popup.waitFor({ state: 'hidden' });
  assert.deepEqual(
    readIds,
    [notices[0].id],
    'Queued notices must not be marked read prematurely',
  );
  await closeDialog();
  await settleDialog(notices[1].title);
  assert.equal(await dialogs.locator('s').innerText(), 'Second paragraph');
  assert.deepEqual(
    readIds,
    [notices[0].id],
    'Already read messages do not need another write',
  );
  await page.keyboard.press('Escape');
  await settleDialog(notices[3].title);
  assert.equal(
    await dialogs.locator('.vben-tiptap-content h2').innerText(),
    'HTML heading',
  );
  assert.equal(
    await dialogs.locator('strong em').innerText(),
    'Rich text body',
  );
  assert.equal(await page.evaluate(() => window.unsafeNotice), undefined);
  await page.waitForFunction(
    () => !document.querySelector('.bell-button .bg-primary'),
  );
  assert.deepEqual(readIds, [notices[0].id, '4']);
  await page.screenshot({
    path: path.join(tmpdir(), 'notice-notifications-desktop.png'),
    fullPage: true,
  });
  await closeDialog();
  await dialogs.waitFor({ state: 'hidden' });

  // The queue can be restarted, with viewport constraints on mobile.
  await page.setViewportSize({ width: 390, height: 844 });
  await openNotifications();
  await popup
    .getByRole('button', { name: '查看所有消息', exact: true })
    .click();
  for (const notice of [notices[0], notices[1], notices[3]]) {
    await settleDialog(notice.title);
    const bounds = await dialogs.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    const overflow = await dialogs.evaluate(
      (node) => node.scrollWidth - node.clientWidth,
    );
    assert.ok(overflow <= 1, `Dialog content overflows by ${overflow}px`);
    await closeDialog();
  }
  await dialogs.waitFor({ state: 'hidden' });
  assert.deepEqual(readIds, [notices[0].id, '4']);

  // A failed read update must preserve the unread state and allow a retry.
  statuses.delete('4');
  failRead = true;
  await page.reload();
  await page.locator('.bell-button').waitFor();
  await openNotifications();
  await popup.getByText(notices[3].title, { exact: true }).click();
  await settleDialog(notices[3].title);
  await page.getByText('Read status failed', { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(tmpdir(), 'notice-notifications-mobile.png'),
    fullPage: true,
  });
  await closeDialog();
  await dialogs.waitFor({ state: 'hidden' });
  await openNotifications();
  assert.equal(
    await popup
      .locator('li')
      .filter({ hasText: notices[3].title })
      .locator('.bg-primary')
      .count(),
    1,
  );
  failRead = false;
  await popup.getByText(notices[3].title, { exact: true }).click();
  await settleDialog(notices[3].title);
  await page.waitForFunction(
    () => !document.querySelector('.bell-button .bg-primary'),
  );
  await closeDialog();
  await dialogs.waitFor({ state: 'hidden' });

  // An empty list must leave no blank preview or stale queue behind.
  notices.splice(0);
  await page.reload();
  await page.locator('.bell-button').waitFor();
  await openNotifications();
  await popup
    .getByRole('button', { name: '查看所有消息', exact: true })
    .click();
  await popup.waitFor({ state: 'hidden' });
  assert.equal(await dialogs.count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: single preview, full Markdown/HTML content, read status, sequential close/Escape/restart, deleted exclusion, mobile width, failed read retry, empty list; no page errors',
  );
} catch (error) {
  console.error('URL:', page.url(), 'Errors:', errors);
  console.error((await page.locator('body').innerText()).slice(-2500));
  await page.screenshot({
    path: path.join(tmpdir(), 'notice-notifications-failure.png'),
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
}
