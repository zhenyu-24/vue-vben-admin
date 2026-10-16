import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
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
const registrations = [];
const uploads = [];
let failUpload = false;
const currentUser = {
  id: '9007199254740993',
  username: 'profile-tester',
  nickname: 'Profile tester',
  avatar: null,
  email: null,
  phone: null,
  roles: ['admin'],
  is_superuser: true,
};
page.on('pageerror', (error) => errors.push(error.message));
await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const pathname = new URL(request.url()).pathname;
  let data = [];
  if (pathname.endsWith('/sys/users/me')) {
    assert.equal(request.method(), 'GET');
    data = currentUser;
  } else if (pathname.endsWith('/auth/codes')) {
    data = ['profile:read'];
  } else if (pathname.endsWith('/auth/login')) {
    data = { access_token: 'mock-login-token' };
  } else if (pathname.endsWith('/auth/register')) {
    registrations.push(request.postDataJSON());
    data = null;
  } else if (pathname.endsWith('/user/me/avatar')) {
    uploads.push(request.postDataBuffer());
    if (failUpload) {
      await route.fulfill({
        status: 500,
        json: { code: 500, msg: 'Mock upload failed', data: null },
      });
      return;
    }
    data = { url: '/logo-light.webp' };
  }
  await route.fulfill({ json: { code: 200, msg: 'OK', data } });
});
await page.addInitScript(() => {
  localStorage.setItem(
    'vben-web-ele-5.7.0-dev-core-access',
    JSON.stringify({ accessToken: 'mock-initial-token', accessCodes: [] }),
  );
});

try {
  const baseUrl = process.env.PROFILE_TEST_URL || 'http://127.0.0.1:5777';
  await page.goto(`${baseUrl}/profile`);
  await page.getByText('Profile tester', { exact: true }).waitFor();
  const fields = page.locator('input:not([type="file"])');
  await assert.doesNotReject(() => fields.nth(0).waitFor({ state: 'visible' }));
  assert.equal(await fields.nth(0).inputValue(), currentUser.nickname);
  assert.equal(await fields.nth(1).inputValue(), '');
  assert.equal(await fields.nth(2).inputValue(), '');

  const initialUser = await page.evaluate(async () => {
    const { useAuthStore } = await import('/src/store/auth.ts');
    return useAuthStore().fetchUserInfo();
  });
  assert.equal(initialUser.userId, currentUser.id);
  assert.equal(initialUser.username, currentUser.username);
  assert.equal(initialUser.realName, currentUser.nickname);
  assert.equal(initialUser.avatar, '');
  assert.equal(initialUser.token, 'mock-initial-token');
  assert.equal(typeof initialUser.homePath, 'string');
  assert.ok(initialUser.homePath.length > 0);
  assert.deepEqual(initialUser.roles, ['admin']);
  assert.equal(initialUser.is_superuser, true);

  const loggedInUser = await page.evaluate(async () => {
    const { useAuthStore } = await import('/src/store/auth.ts');
    return useAuthStore().authLogin(
      { username: 'profile-tester', password: 'test-only-password' },
      () => {},
    );
  });
  assert.equal(loggedInUser.userInfo.token, 'mock-login-token');
  assert.equal(loggedInUser.userInfo.realName, currentUser.nickname);

  await page.evaluate(async () => {
    const { useAuthStore } = await import('/src/store/auth.ts');
    await useAuthStore().register({
      username: 'test-minimal',
      password: 'test-only-password',
      email: '',
      phone: '',
      nickname: '',
      confirmPassword: 'test-only-password',
      agreePolicy: true,
    });
    await useAuthStore().register({
      username: 'test-full',
      password: 'test-only-password',
      email: 'test@example.com',
      phone: '13800138000',
      nickname: 'Test nickname',
    });
  });
  assert.deepEqual(registrations, [
    { username: 'test-minimal', password: 'test-only-password' },
    {
      username: 'test-full',
      password: 'test-only-password',
      email: 'test@example.com',
      phone: '13800138000',
      nickname: 'Test nickname',
    },
  ]);

  const fileInput = page.locator('input[type="file"]');
  const dialog = page.getByRole('dialog', { name: '裁剪头像' });
  for (const mimeType of [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
  ]) {
    const extension =
      mimeType === 'image/svg+xml' ? 'svg' : mimeType.split('/')[1];
    const buffer =
      mimeType === 'image/svg+xml'
        ? Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="red"/></svg>',
          )
        : Buffer.from(
            await page.evaluate((type) => {
              const canvas = document.createElement('canvas');
              canvas.width = 160;
              canvas.height = 160;
              const context = canvas.getContext('2d');
              context.fillStyle = 'red';
              context.fillRect(0, 0, 160, 160);
              return canvas.toDataURL(type).split(',')[1];
            }, mimeType),
            'base64',
          );
    await fileInput.setInputFiles({
      name: `avatar.${extension}`,
      mimeType,
      buffer,
    });
    await dialog.waitFor({ state: 'visible' });
    await page.waitForFunction(() =>
      [...document.querySelectorAll('[role="dialog"] img')].some(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    if (mimeType === 'image/png') {
      failUpload = true;
      await dialog.getByRole('button', { name: '确认', exact: true }).click();
      await page
        .getByText('Mock upload failed', { exact: true })
        .first()
        .waitFor();
      assert.equal(await dialog.isVisible(), true);
      failUpload = false;
    }
    await dialog.getByRole('button', { name: '确认', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    const multipart = uploads.at(-1);
    const outputMime = mimeType === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    const outputExtension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    assert.ok(
      multipart.includes(Buffer.from(`filename="avatar.${outputExtension}"`)),
    );
    assert.ok(multipart.includes(Buffer.from(`Content-Type: ${outputMime}`)));
    assert.ok(
      multipart.includes(
        outputMime === 'image/png'
          ? Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
          : Buffer.from([255, 216, 255]),
      ),
    );
  }

  const gif = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64',
  );
  await fileInput.setInputFiles({
    name: 'avatar.gif',
    mimeType: 'image/gif',
    buffer: gif,
  });
  await page
    .getByText('动图已直接上传（裁剪仅支持静态图片）', { exact: true })
    .waitFor();
  assert.equal(await dialog.isVisible(), false);
  assert.ok(uploads.at(-1).includes(gif));
  assert.equal(uploads.length, 6);

  await page.reload();
  await page.getByText('Profile tester', { exact: true }).waitFor();
  await page.goto(`${baseUrl}/vben-admin/about`);
  await page.getByRole('heading', { name: '基本信息' }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'PASS: login/reload user mapping, nullable profile fields, registration payloads, PNG/JPEG/WebP/SVG crop uploads, failed upload retry, GIF bypass, about page; no page errors or real API writes',
  );
} finally {
  await browser.close();
}
