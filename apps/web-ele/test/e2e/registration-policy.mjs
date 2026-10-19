import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

// Browser tooling is supplied by the monorepo root devDependencies.
// eslint-disable-next-line n/no-extraneous-import
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  let policy = {
    min_length: 6,
    max_length: 32,
    require_special_char: false,
  };
  let fail = false;
  let registrations = 0;
  await page.route('**/api/v1/auth/password-policy', (route) =>
    route.fulfill({
      status: fail ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        fail ? { code: 503, msg: 'unavailable' } : { code: 200, data: policy },
      ),
    }),
  );
  await page.route('**/api/v1/auth/register', (route) => {
    registrations++;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ code: 400, msg: 'test only' }),
    });
  });
  await page.goto(
    `${process.env.TEST_BASE_URL || 'http://localhost:5777'}/auth/register`,
  );
  const hint = page.getByText('密码长度为 6～32 个字符', { exact: true });
  await hint.waitFor();
  await page.getByPlaceholder('请输入用户名').fill('policy_test');
  await page.getByPlaceholder('密码', { exact: true }).fill('abc123');
  await page.getByPlaceholder('确认密码', { exact: true }).fill('abc123');
  await page.getByRole('checkbox').check();
  for (const password of ['123456', 'abcdef']) {
    await page.getByPlaceholder('密码', { exact: true }).fill(password);
    await page.getByPlaceholder('确认密码', { exact: true }).fill(password);
    await Promise.all([
      page.waitForResponse('**/api/v1/auth/register'),
      page.getByRole('button', { name: 'register', exact: true }).click(),
    ]);
  }
  assert.equal(registrations, 2);
  registrations = 0;
  await page.getByPlaceholder('密码', { exact: true }).fill('abc123');
  await page.getByPlaceholder('确认密码', { exact: true }).fill('abc123');
  // Change server rules while this page remains open.
  policy = {
    ...policy,
    min_length: 10,
    max_length: 20,
    require_special_char: true,
  };
  await page.getByRole('button', { name: 'register', exact: true }).click();
  await page.getByText('密码长度不能少于 10 个字符', { exact: true }).waitFor();
  assert.equal(registrations, 0);
  await page.getByPlaceholder('密码', { exact: true }).fill('abcdefgh12');
  await page.getByPlaceholder('确认密码', { exact: true }).fill('abcdefgh12');
  await page.getByRole('button', { name: 'register', exact: true }).click();
  await page
    .getByText('密码必须包含特殊字符（如：!@#$%）', { exact: true })
    .waitFor();
  assert.equal(registrations, 0);
  await page.getByPlaceholder('密码', { exact: true }).fill('abcdefgh12!');
  await page.getByPlaceholder('确认密码', { exact: true }).fill('abcdefgh12!');
  await Promise.all([
    page.waitForResponse('**/api/v1/auth/register'),
    page.getByRole('button', { name: 'register', exact: true }).click(),
  ]);
  assert.equal(registrations, 1);
  fail = true;
  await page.reload();
  await page.getByText('密码规则加载失败，请重试', { exact: true }).waitFor();
  fail = false;
  await page.getByRole('button', { name: '重新加载' }).click();
  await page.getByText(/密码长度为 10～20 个字符，必须包含特殊字符/).waitFor();
  await page.screenshot({
    path: join(tmpdir(), 'registration-policy-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(tmpdir(), 'registration-policy-mobile.png'),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  console.log(
    'Registration policy: dynamic rules, submit refresh, complexity validation, retry and mobile layout passed.',
  );
} finally {
  await browser.close();
}
