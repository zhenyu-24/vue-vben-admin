import assert from 'node:assert/strict';
import process from 'node:process';

// eslint-disable-next-line n/no-extraneous-import
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
});
const base = 'http://127.0.0.1:5777';
const adminPaths = [
  '/admin',
  '/admin/org',
  '/admin/user',
  '/admin/dept',
  '/admin/role',
  '/admin/log',
  '/admin/log/login',
  '/admin/log/opera',
  '/admin/monitor',
  '/admin/monitor/online',
  '/admin/monitor/redis',
  '/admin/monitor/server',
  '/admin/scheduler',
  '/admin/scheduler/manage',
  '/admin/scheduler/record',
  '/admin/plugin',
  '/admin/notice',
  '/admin/config',
];
const backendMenus = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    component: 'BasicLayout',
    meta: { title: '概览' },
    children: [
      {
        name: 'Analytics',
        path: '/dashboard/analytics',
        component: '/dashboard/analytics/index',
        meta: { title: '分析页' },
      },
    ],
  },
  {
    name: 'Admin',
    path: '/admin',
    component: 'BasicLayout',
    meta: { title: '系统管理' },
    children: [
      {
        name: 'AdminPlugin',
        path: '/admin/plugin',
        component: '/admin/plugin/index',
        meta: { title: '插件管理' },
      },
    ],
  },
];
const errors = [];
try {
  for (const mode of ['frontend', 'backend', 'mixed']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on('pageerror', (error) => errors.push(error.message));
    const adminRequests = [];
    let superuser = false;
    let roles = ['admin'];
    await page.route('**/api/v1/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      let data = [];
      if (pathname.endsWith('/sys/users/me')) {
        data = {
          id: 2,
          username: 'permission-tester',
          nickname: '权限测试',
          avatar: '',
          homePath: '/admin/plugin',
          roles,
          is_superuser: superuser,
        };
      } else if (pathname.endsWith('/sys/menus/sidebar')) {
        data = backendMenus;
      } else if (
        route.request().method() === 'GET' &&
        (pathname.endsWith('/sys/notices') ||
          pathname.endsWith('/sys/notices/user/status'))
      ) {
        // The shared header fetches notifications for ordinary users as well.
        data = pathname.endsWith('/sys/notices') ? { items: [], total: 0 } : [];
      } else if (pathname.endsWith('/sys/plugins/changed')) {
        adminRequests.push(pathname);
        data = false;
      } else {
        adminRequests.push(pathname);
      }
      await route.fulfill({ json: { code: 200, msg: '成功', data } });
    });
    await page.addInitScript((accessMode) => {
      localStorage.setItem(
        'vben-web-ele-5.7.0-dev-core-access',
        JSON.stringify({ accessToken: 'test-only-token', accessCodes: [] }),
      );
      localStorage.setItem(
        'vben-web-ele-5.7.0-dev-preferences',
        JSON.stringify({ value: { app: { accessMode } } }),
      );
    }, mode);
    const navigate = (target) =>
      page.evaluate(async (url) => {
        const { router } = await import('/src/router/index.ts');
        await router.push(url);
        return router.currentRoute.value.path;
      }, target);
    const waitForForbidden = async () => {
      try {
        await page.waitForURL('**/403');
      } catch (error) {
        throw new Error(
          `${mode}: expected /403 with superuser=${String(superuser)}, got ${page.url()}; page errors: ${errors.join('; ')}`,
          { cause: error },
        );
      }
    };
    const assertNoAdminRoutes = async () => {
      const routes = await page.evaluate(async () => {
        const { router } = await import('/src/router/index.ts');
        return router.getRoutes().map((route) => route.path);
      });
      assert.ok(!routes.some((route) => /^\/admin(?:\/|$)/i.test(route)));
      assert.equal(
        await page.getByText('系统管理', { exact: true }).count(),
        0,
      );
    };

    await page.goto(`${base}/admin/plugin`);
    await waitForForbidden();
    await assertNoAdminRoutes();
    assert.equal(await navigate('/dashboard'), '/dashboard/analytics');
    await assertNoAdminRoutes();
    for (const adminPath of adminPaths) {
      assert.equal(await navigate(adminPath), '/403', `${mode}: ${adminPath}`);
    }
    assert.deepEqual(adminRequests, [], 'Blocked pages must not load data');
    await page.reload();
    await assertNoAdminRoutes();
    await page.goto(`${base}/dashboard`);
    await waitForForbidden();
    assert.deepEqual(adminRequests, [], 'Admin home must also be blocked');

    // Only an actual boolean flag grants access, regardless of role names.
    if (mode === 'frontend') {
      for (const flag of [undefined, 'true']) {
        superuser = flag;
        await page.goto(`${base}/admin/plugin`);
        await waitForForbidden();
        await assertNoAdminRoutes();
      }
    }
    superuser = true;
    roles = [];
    await page.goto(`${base}/admin/plugin`);
    await page.getByRole('button', { name: '安装插件', exact: true }).waitFor();
    assert.ok(
      (await page.getByText('系统管理', { exact: true }).count()) > 0,
      'Superusers must see the menu even without a named admin role',
    );
    assert.ok(
      adminRequests.some((request) => request.endsWith('/sys/plugins')),
    );
    superuser = false;
    roles = ['admin'];
    await page.reload();
    await waitForForbidden();
    await assertNoAdminRoutes();
    await context.close();
  }
  assert.deepEqual(errors, []);
  process.stdout.write(
    'PASS: frontend/backend/mixed menu filtering, every admin route, direct entry and reload, admin home redirect, strict superuser flag, revocation; no page errors\n',
  );
} finally {
  await browser.close();
}
