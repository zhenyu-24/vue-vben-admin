import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const task = {
  id: '9007199254740993',
  name: '调度测试任务',
  task: 'tasks.demo',
  type: 1,
  crontab: '*/15 * * * *',
  status: 1,
  total_run_count: 3,
  args: '[1]',
  kwargs: '{"count":0}',
  one_off: false,
  last_run_time: null,
  created_time: '2026-10-16 12:00:00',
};
const record = {
  id: '9007199254740994',
  task_id: 'test-task-uuid',
  name: 'tasks.demo',
  status: 'SUCCESS',
  result: false,
  args: [1],
  kwargs: { count: 0 },
  retries: 0,
  date_done: '2026-10-16 12:00:00',
  traceback: null,
  worker: 'worker@test',
  queue: 'celery',
};
const writes = [];
const recordQueries = [];
await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  let data = null;
  if (request.method() !== 'GET') {
    writes.push({
      url: url.pathname,
      method: request.method(),
      body: request.postDataJSON(),
    });
  } else if (url.pathname.endsWith('/sys/users/me')) {
    data = {
      id: 1,
      username: 'tester',
      realName: '测试管理员',
      roles: ['admin'],
      homePath: '/admin/scheduler/manage',
      avatar: '',
    };
  } else if (url.pathname.endsWith('/schedulers')) {
    data = { items: [task], total: 1 };
  } else if (url.pathname.endsWith('/sys/users')) {
    data = {
      items: [
        {
          id: 2,
          username: 'switch-tester',
          nickname: '状态测试',
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
  } else if (url.pathname.endsWith(`/schedulers/${task.id}`)) {
    data = task;
  } else if (url.pathname.endsWith('/tasks/registered')) {
    data = [{ name: '测试任务', task: 'tasks.demo' }];
  } else if (url.pathname.endsWith('/task-results')) {
    recordQueries.push(url.searchParams.get('name'));
    const matches = url.searchParams.get('name') === task.task;
    data = { items: matches ? [record] : [], total: matches ? 1 : 0 };
  } else if (url.pathname.endsWith(`/task-results/${record.id}`)) {
    data = record;
  } else {
    data = [];
  }
  await route.fulfill({ json: { code: 200, msg: '成功', data } });
});
await page.addInitScript(() => {
  localStorage.setItem(
    'vben-web-ele-5.7.0-dev-core-access',
    JSON.stringify({ accessToken: 'test-only-token', accessCodes: [] }),
  );
});
try {
  await page.goto('http://127.0.0.1:5777/admin/scheduler/manage');
  await page.getByRole('button', { name: '新增任务', exact: true }).waitFor();
  await page.getByText('调度测试任务', { exact: true }).first().waitFor();
  const statusSwitch = page.locator('.admin-status-switch').first();
  await statusSwitch.waitFor();
  const switchShape = await statusSwitch
    .locator('.el-switch__core')
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        height: element.getBoundingClientRect().height,
        radius: style.borderRadius,
        width: element.getBoundingClientRect().width,
        text: element.textContent,
      };
    });
  assert.equal(switchShape.height, 26);
  assert.equal(switchShape.width, 60);
  assert.equal(switchShape.radius, '13px');
  assert.match(switchShape.text, /启用/);
  assert.doesNotMatch(switchShape.text, /已启用/);
  const operationStyle = await page
    .getByRole('button', { name: '修改', exact: true })
    .first()
    .evaluate((element) => ({
      size: getComputedStyle(element).fontSize,
      weight: getComputedStyle(element).fontWeight,
    }));
  assert.deepEqual(operationStyle, { size: '16px', weight: '400' });
  await page.screenshot({
    path: path.join(tmpdir(), 'scheduler-actions.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: '新增任务', exact: true }).click();
  const dialog = page.locator('[role="dialog"]:visible').last();
  await dialog.locator('input').first().waitFor();
  await page.screenshot({
    path: path.join(tmpdir(), 'scheduler-create.png'),
    fullPage: true,
  });
  await dialog.getByRole('button', { name: '配置执行计划' }).click();
  await page
    .getByText('预计执行时间（浏览器本地时区）', { exact: true })
    .first()
    .waitFor();
  await page
    .locator('[role="dialog"]:visible')
    .last()
    .getByRole('button', { name: '取消', exact: true })
    .click();
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '修改', exact: true }).first().click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('input')].some(
      (input) => input.value === '调度测试任务',
    ),
  );
  const update = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/schedulers/${task.id}`) &&
      response.request().method() === 'PUT',
  );
  await page
    .locator('[role="dialog"]:visible')
    .last()
    .getByRole('button', { name: '确认', exact: true })
    .click();
  await update;
  const saved = writes.find((write) => write.method === 'PUT');
  assert.equal(saved.body.args, '[1]');
  assert.equal(saved.body.kwargs, '{"count":0}');
  await page.getByRole('button', { name: '新增任务', exact: true }).click();
  await page
    .locator('[role="dialog"]:visible')
    .last()
    .locator('input')
    .first()
    .waitFor();
  assert.equal(
    await page
      .locator('[role="dialog"]:visible')
      .last()
      .locator('input.el-input__inner')
      .first()
      .inputValue(),
    '',
  );
  await page
    .locator('[role="dialog"]:visible')
    .last()
    .getByRole('button', { name: '取消', exact: true })
    .click();
  const execution = page.waitForResponse((response) =>
    response.url().endsWith(`/${task.id}/execute`),
  );
  await page.getByRole('button', { name: '执行', exact: true }).first().click();
  await execution;
  await page.getByRole('button', { name: '日志', exact: true }).first().click();
  await page.getByText('test-task-uuid', { exact: true }).first().waitFor();
  assert.equal(recordQueries.at(-1), task.task);
  assert.equal(
    await page
      .locator('input')
      .evaluateAll((inputs) =>
        inputs.some((input) => input.value === 'tasks.demo'),
      ),
    true,
  );
  await page.getByRole('button', { name: '详情', exact: true }).first().click();
  await page.getByText('worker@test', { exact: true }).waitFor();
  assert.equal(
    await page
      .locator('pre')
      .filter({ hasText: /^false$/ })
      .count(),
    1,
  );
  await page.screenshot({
    path: path.join(tmpdir(), 'scheduler-record.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(tmpdir(), 'scheduler-mobile.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:5777/admin/user');
  await page.getByText('状态测试', { exact: true }).first().waitFor();
  const userSwitch = page.locator('.admin-status-switch').first();
  await userSwitch.waitFor();
  assert.equal(
    await userSwitch
      .locator('.el-switch__core')
      .evaluate((element) => element.getBoundingClientRect().width),
    60,
  );
  assert.match(await userSwitch.innerText(), /启用/);
  await userSwitch.click();
  await page.waitForFunction(() =>
    document
      .querySelector('.admin-status-switch')
      ?.textContent?.includes('禁用'),
  );
  assert.equal(
    writes.some((write) => write.url.includes('/sys/users/2/')),
    true,
  );
  await page.screenshot({
    path: path.join(tmpdir(), 'user-actions.png'),
    fullPage: true,
  });
  assert.equal(
    writes.some((write) => write.url.endsWith(`/${task.id}/execute`)),
    true,
  );
  assert.deepEqual(errors, []);
  process.stdout.write(
    'PASS: menus, create reset, Cron builder, edit save payload, execute, log filter, record detail, false result, mobile; no page errors\n',
  );
} catch (error) {
  console.error('URL:', page.url(), 'Errors:', errors);
  const body = await page.locator('body').innerText();
  console.error(body.slice(0, 2000));
  await page.screenshot({
    path: path.join(tmpdir(), 'scheduler-failure.png'),
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
}
