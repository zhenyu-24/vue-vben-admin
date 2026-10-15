import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

// Playwright is provided by the workspace root devDependencies.
// eslint-disable-next-line n/no-extraneous-import
import { chromium } from 'playwright';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5777';
const output = join(tmpdir(), 'web-ele-organization-e2e');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  channel: process.env.E2E_BROWSER_CHANNEL,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('requestfailed', (request) => {
  console.error('Request failed:', request.url(), request.failure()?.errorText);
});
const requests = [];
const failures = new Map();
function failNext(method, path, message) {
  failures.set(`${method} ${path}`, message);
}
const timestamp = '2026-10-15 12:00:00';
const departmentIds = {
  root: '2069061886627938310',
  engineering: '2069061886627938311',
  platform: '2069061886627938312',
  operations: '2069061886627938313',
};
const dept = (id, name, parent_id = null) => ({
  id,
  name,
  parent_id,
  sort: 0,
  status: 1,
  leader: null,
  phone: null,
  email: null,
  created_time: timestamp,
  updated_time: null,
});
const departments = [
  dept(1, 'Test department ID one'),
  dept(departmentIds.root, 'Head Office'),
  dept(departmentIds.engineering, 'Engineering', departmentIds.root),
  dept(departmentIds.platform, 'Platform', departmentIds.engineering),
  dept(departmentIds.operations, 'Operations', departmentIds.root),
  { ...dept('700', 'Disabled department'), status: 0 },
];
const roles = [
  {
    id: 1,
    name: 'Test role ID one',
    status: 1,
    is_filter_scopes: false,
    remark: null,
    created_time: timestamp,
    updated_time: null,
  },
  {
    id: 2,
    name: 'Operator',
    status: 1,
    is_filter_scopes: true,
    remark: 'Operations',
    created_time: timestamp,
    updated_time: null,
  },
  {
    id: 700,
    name: 'Disabled role',
    status: 0,
    is_filter_scopes: false,
    remark: null,
    created_time: timestamp,
    updated_time: null,
  },
];
const loginUser = {
  id: 99,
  username: 'e2e',
  nickname: 'Test user',
  avatar: '',
  roles: [{ id: 1, name: 'admin' }],
  is_superuser: true,
  homePath: '/admin/dept',
};
const users = [
  {
    id: 200,
    uuid: 'test-user',
    username: 'department-user',
    nickname: 'Department user',
    phone: '',
    email: '',
    avatar: '/avatar.png',
    status: 1,
    is_superuser: false,
    is_staff: true,
    is_multi_login: false,
    join_time: timestamp,
    last_login_time: timestamp,
    dept_id: departmentIds.platform,
    roles: [roles[1]],
  },
];
function tree(rows, parent = null) {
  return rows
    .filter((item) => item.parent_id === parent)
    .map((item) => ({
      ...item,
      children: tree(rows, item.id),
    }));
}
function pagination(items) {
  return { items, total: items.length, page: 1, size: 20, total_pages: 1 };
}
function lastRequest(path, method) {
  return requests.findLast(
    (item) => item.path === path && item.method === method,
  );
}

// Isolate every API request so CRUD tests never modify the real database.
await context.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace(/^\/api/, '');
  const method = request.method();
  const payload = request.postDataJSON();
  requests.push({
    path,
    method,
    payload,
    query: Object.fromEntries(url.searchParams),
  });
  const respond = (data) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, msg: 'OK', data }),
    });
  const reject = (msg) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ code: 409, msg, data: null }),
    });
  const failureKey = `${method} ${path}`;
  if (failures.has(failureKey)) {
    const message = failures.get(failureKey);
    failures.delete(failureKey);
    return reject(message);
  }
  if (method === 'OPTIONS') return respond(null);
  if (path === '/v1/auth/captcha')
    return respond({
      is_enabled: false,
      expire_seconds: 0,
      uuid: '',
      image: '',
    });
  if (path === '/v1/auth/login')
    return respond({ access_token: 'isolated-e2e-token', user: loginUser });
  if (path === '/v1/auth/codes') return respond([]);
  if (path === '/v1/sys/users/me') return respond(loginUser);
  if (path === '/v1/sys/notices') return respond(pagination([]));
  if (path === '/v1/sys/notices/user/status') return respond([]);
  if (path === '/v1/sys/depts') {
    if (method === 'POST') {
      departments.push({
        ...dept(String(100 + departments.length), payload.name),
        ...payload,
      });
      return respond(null);
    }
    const matching = departments.filter((item) =>
      ['name', 'leader', 'phone', 'status'].every((field) => {
        const value = url.searchParams.get(field);
        return !value || String(item[field] ?? '').includes(value);
      }),
    );
    return respond(
      matching.length === departments.length ? tree(departments) : matching,
    );
  }
  const deptMatch = path.match(/^\/v1\/sys\/depts\/(\d+)$/);
  if (deptMatch) {
    const index = departments.findIndex(
      (item) => String(item.id) === deptMatch[1],
    );
    if (method === 'PUT') Object.assign(departments[index], payload);
    if (method === 'DELETE') {
      if (users.some((item) => String(item.dept_id) === deptMatch[1]))
        return reject('Department contains users');
      if (departments.some((item) => String(item.parent_id) === deptMatch[1]))
        return reject('Department contains child departments');
      departments.splice(index, 1);
    }
    return respond(
      method === 'GET'
        ? {
            ...departments[index],
            parent_id:
              departments[index].parent_id === null
                ? null
                : Number(departments[index].parent_id),
          }
        : null,
    );
  }
  if (path === '/v1/sys/roles/all') return respond(roles);
  if (path === '/v1/sys/roles') {
    if (method === 'POST')
      roles.push({
        id: 100 + roles.length,
        created_time: timestamp,
        updated_time: null,
        ...payload,
      });
    if (method === 'DELETE') {
      for (const id of payload.pks) {
        const index = roles.findIndex((item) => item.id === id);
        if (index >= 0) roles.splice(index, 1);
      }
    }
    const filtered = roles.filter((item) =>
      ['name', 'status'].every((field) => {
        const value = url.searchParams.get(field);
        return !value || String(item[field]).includes(value);
      }),
    );
    return respond(method === 'GET' ? pagination(filtered) : null);
  }
  const roleMatch = path.match(/^\/v1\/sys\/roles\/(\d+)$/);
  if (roleMatch) {
    if (method === 'PUT')
      Object.assign(
        roles.find((item) => item.id === Number(roleMatch[1])),
        payload,
      );
    return respond(null);
  }
  if (path === '/v1/sys/users') {
    if (method === 'POST') {
      users.push({
        ...users[0],
        ...payload,
        id: 200 + users.length,
        roles: payload.roles.map((id) => roles.find((item) => item.id === id)),
      });
      return respond(null);
    }
    return respond(
      pagination(
        users.map((item) => ({
          ...item,
          dept:
            departments.find((department) => department.id === item.dept_id) ??
            null,
        })),
      ),
    );
  }
  const permissionMatch = path.match(/^\/v1\/sys\/users\/(\d+)\/permissions$/);
  if (permissionMatch && method === 'PUT') {
    const user = users.find((item) => item.id === Number(permissionMatch[1]));
    const type = url.searchParams.get('type');
    const field = type === 'status' ? 'status' : `is_${type}`;
    user[field] = field === 'status' ? Number(!user[field]) : !user[field];
    return respond(null);
  }
  const userMatch = path.match(/^\/v1\/sys\/users\/(\d+)$/);
  if (userMatch) {
    if (method === 'DELETE') {
      const index = users.findIndex((item) => item.id === Number(userMatch[1]));
      users.splice(index, 1);
      return respond(null);
    }
    if (method === 'PUT')
      Object.assign(
        users.find((item) => item.id === Number(userMatch[1])),
        payload,
        {
          roles: payload.roles.map((id) =>
            roles.find((item) => item.id === id),
          ),
        },
      );
    return respond(null);
  }
  return respond([]);
});

const dialog = () => page.locator('[role="dialog"]:visible').last();
const row = (name) =>
  page
    .locator('.vxe-table--body-wrapper .vxe-body--row')
    .filter({ has: page.getByText(name, { exact: true }) })
    .filter({ visible: true })
    .first();
const buttonName = (name) => new RegExp(`^${[...name].join('\\s*')}$`);
const button = (name) => page.getByRole('button', { name: buttonName(name) });
const modalButton = (name) =>
  dialog().getByRole('button', { name: buttonName(name) });
const departmentInput = () => dialog().locator('[name="dept_id"]');
async function actionButton(name, action) {
  const id = await row(name).getAttribute('rowid');
  assert.ok(id, `Missing table row for ${name}`);
  return page
    .locator(`.vxe-body--row[rowid="${id}"]`)
    .getByRole('button', { name: action, exact: true })
    .filter({ visible: true });
}
async function selectDepartment(name) {
  await departmentInput().click();
  await page
    .locator('.el-tree-select__popper:visible')
    .getByText(name, { exact: true })
    .click();
}
async function editUser() {
  await (await actionButton('department-user', '修改')).click();
  await departmentInput().waitFor();
  await waitForModalReady();
}
async function waitForModalReady() {
  await dialog()
    .locator('button:not([disabled])')
    .filter({
      hasText: buttonName('确认'),
    })
    .waitFor();
}
async function confirmDelete(name) {
  await (await actionButton(name, '删除')).click();
  await page
    .locator('.el-popconfirm:visible')
    .getByRole('button')
    .last()
    .click();
  await row(name).waitFor({ state: 'hidden' });
}
async function submitModal() {
  await modalButton('确认').click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}

async function screenshot(name) {
  await page.waitForTimeout(600);
  await page.screenshot({
    path: join(output, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

try {
  await page.goto(`${baseURL}/auth/login`);
  await page.getByRole('textbox', { name: '用户名' }).fill('e2e');
  await page
    .getByRole('textbox', { name: '密码', exact: true })
    .fill('test-password');
  await page.getByRole('button', { name: 'login', exact: true }).click();
  await row('Head Office').waitFor();
  await (await actionButton('Platform', '修改')).click();
  await waitForModalReady();
  await page.waitForFunction(() =>
    document
      .querySelector('[role="dialog"] [name="parent_id"]')
      ?.closest('.el-select')
      ?.textContent.includes('Engineering'),
  );
  await screenshot('department-parent-name');
  await submitModal();
  assert.equal(
    lastRequest(`/v1/sys/depts/${departmentIds.platform}`, 'PUT').payload
      .parent_id,
    departmentIds.engineering,
  );
  await screenshot('departments-desktop');
  const deleteOne = await actionButton('Test department ID one', '删除');
  assert.equal(await deleteOne.isEnabled(), true);
  await deleteOne.click();
  await page
    .locator('.el-popconfirm:visible')
    .getByRole('button')
    .first()
    .click();
  assert.equal(
    requests.some(
      (item) => item.method === 'DELETE' && item.path === '/v1/sys/depts/1',
    ),
    false,
  );
  await confirmDelete('Test department ID one');
  assert.ok(lastRequest('/v1/sys/depts/1', 'DELETE'));

  for (const [name, message] of [
    ['Engineering', 'Department contains child departments'],
    ['Platform', 'Department contains users'],
  ]) {
    await (await actionButton(name, '删除')).click();
    await page
      .locator('.el-popconfirm:visible')
      .getByRole('button')
      .last()
      .click();
    await page.getByText(message, { exact: true }).waitFor();
    assert.equal(await row(name).isVisible(), true);
  }

  await button('新增部门').click();
  await dialog().locator('[name="name"]').fill('Temporary department');
  await submitModal();
  assert.deepEqual(lastRequest('/v1/sys/depts', 'POST').payload, {
    name: 'Temporary department',
    parent_id: null,
    sort: 0,
    status: 1,
    leader: null,
    email: null,
    phone: null,
  });
  await (await actionButton('Engineering', '新增下级')).click();
  await dialog().locator('[name="name"]').fill('Temporary child');
  await submitModal();
  assert.equal(
    lastRequest('/v1/sys/depts', 'POST').payload.parent_id,
    departmentIds.engineering,
  );
  await confirmDelete('Temporary child');
  await (await actionButton('Temporary department', '修改')).click();
  const departmentName = dialog().locator('[name="name"]');
  await departmentName.waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector('[role="dialog"] [name="name"]')?.value ===
      'Temporary department',
  );
  await departmentName.fill('Temporary updated');
  await submitModal();
  await button('新增部门').click();
  await page.waitForFunction(
    () => document.querySelector('[role="dialog"] [name="name"]')?.value === '',
  );
  await modalButton('取消').click();
  await confirmDelete('Temporary updated');
  await page
    .getByRole('textbox', { name: '部门名称', exact: true })
    .fill('Platform');
  await button('查询').click();
  await row('Platform').waitFor();
  await row('Head Office').waitFor({ state: 'hidden' });
  console.log(
    'Passed: department tree, create, child, update, reset, delete and search.',
  );

  await page.goto(`${baseURL}/admin/role`);
  await page
    .getByText('Operator', { exact: true })
    .filter({ visible: true })
    .first()
    .waitFor();
  assert.equal(await button('权限设置').count(), 0);
  assert.equal(
    await page.getByText('过滤数据权限', { exact: true }).count(),
    0,
  );
  await screenshot('roles-desktop');
  assert.equal(
    await (await actionButton('Test role ID one', '删除')).isEnabled(),
    true,
  );
  await confirmDelete('Test role ID one');
  assert.deepEqual(lastRequest('/v1/sys/roles', 'DELETE').payload, {
    pks: [1],
  });
  await (await actionButton('Operator', '修改')).click();
  assert.equal(await dialog().locator('[name="is_filter_scopes"]').count(), 0);
  await dialog().locator('[name="remark"]').fill('Updated operator');
  await submitModal();
  assert.equal(
    lastRequest('/v1/sys/roles/2', 'PUT').payload.is_filter_scopes,
    true,
  );
  await button('新增角色').click();
  assert.equal(await dialog().locator('[name="is_filter_scopes"]').count(), 0);
  await dialog().locator('[name="name"]').fill('Temporary role');
  failNext('POST', '/v1/sys/roles', 'Role save failed');
  await modalButton('确认').click();
  await page.getByText('Role save failed', { exact: true }).waitFor();
  assert.equal(
    await dialog().locator('[name="name"]').inputValue(),
    'Temporary role',
  );
  await submitModal();
  assert.equal(
    lastRequest('/v1/sys/roles', 'POST').payload.is_filter_scopes,
    false,
  );
  await (await actionButton('Temporary role', '修改')).click();
  await dialog().locator('[name="name"]').fill('Temporary role updated');
  await submitModal();
  assert.equal(
    requests.findLast(
      (item) => item.path.startsWith('/v1/sys/roles/') && item.method === 'PUT',
    ).payload.is_filter_scopes,
    false,
  );
  await confirmDelete('Temporary role updated');
  await page
    .getByRole('textbox', { name: '角色名称', exact: true })
    .fill('Operator');
  await button('查询').click();
  await row('Test role ID one').waitFor({ state: 'hidden' });
  assert.equal(
    requests.some((item) =>
      /\/(?:menus|scopes|data-scopes)(?:\/|$)/.test(item.path),
    ),
    false,
  );
  console.log(
    'Passed: role create, update, delete, search; no permission entry or permission API calls.',
  );

  await page.goto(`${baseURL}/admin/user`);
  await row('department-user').waitFor();
  const userSwitches = () => row('department-user').getByRole('switch');
  assert.equal(await userSwitches().count(), 4);
  for (const [index, checked] of [true, false, true, false].entries()) {
    const control = userSwitches().nth(index);
    assert.equal(await control.getAttribute('aria-checked'), String(checked));
    assert.equal(
      await control.locator('..').locator('.el-switch__core').innerText(),
      checked ? '已启用' : '已禁用',
    );
  }
  for (const type of ['status', 'superuser', 'staff', 'multi_login']) {
    const index = ['status', 'superuser', 'staff', 'multi_login'].indexOf(type);
    const control = userSwitches().nth(index);
    const before = await control.getAttribute('aria-checked');
    await control.locator('..').locator('.el-switch__core').click();
    await control
      .and(page.locator(`[aria-checked="${before !== 'true'}"]`))
      .waitFor({ state: 'attached' });
    assert.equal(
      lastRequest('/v1/sys/users/200/permissions', 'PUT').query.type,
      type,
    );
    assert.equal(
      await control.getAttribute('aria-checked'),
      String(before !== 'true'),
    );
    assert.equal(
      await control.locator('..').locator('.el-switch__core').innerText(),
      before === 'true' ? '已禁用' : '已启用',
    );
    await control.locator('..').locator('.el-switch__core').click();
    await control
      .and(page.locator(`[aria-checked="${before}"]`))
      .waitFor({ state: 'attached' });
  }
  failNext('PUT', '/v1/sys/users/200/permissions', 'Permission update failed');
  await userSwitches()
    .first()
    .locator('..')
    .locator('.el-switch__core')
    .click();
  await page.getByText('Permission update failed', { exact: true }).waitFor();
  assert.equal(
    await userSwitches().first().getAttribute('aria-checked'),
    'true',
  );
  for (const name of ['修改', '删除', '重置密码']) {
    await (await actionButton('department-user', name)).hover();
    await page.waitForTimeout(400);
    assert.equal(
      await page.locator('.vxe-table--tooltip-wrapper:visible').count(),
      0,
    );
  }
  await screenshot('users-switches-desktop');
  console.log(
    'Passed: inline switch labels, numeric/boolean toggles, failure handling and no operation tooltips.',
  );
  await editUser();
  await dialog()
    .locator('[name="roles"]')
    .locator('xpath=ancestor::div[contains(@class,"el-select__wrapper")][1]')
    .click();
  const disabledRole = page
    .locator('.el-select-dropdown__item:visible')
    .filter({ hasText: /^Disabled role$/ });
  await disabledRole.waitFor();
  assert.equal(await disabledRole.getAttribute('aria-disabled'), 'true');
  await disabledRole.dispatchEvent('click');
  assert.equal(
    await dialog().locator('.el-select__selected-item .el-tag').innerText(),
    'Operator',
  );
  await page.keyboard.press('Escape');
  await page.waitForFunction(() =>
    document
      .querySelector('[name="dept_id"]')
      ?.closest('.el-select')
      ?.textContent.includes('Platform'),
  );
  await departmentInput().click();
  const disabledDepartment = page
    .locator('.el-tree-select__popper:visible [role="treeitem"]')
    .filter({
      has: page.getByText('Disabled department', { exact: true }),
    });
  assert.equal(await disabledDepartment.getAttribute('aria-disabled'), 'true');
  await disabledDepartment
    .getByText('Disabled department', { exact: true })
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector('[role="dialog"] [name="dept_id"]')
      ?.closest('.el-select')
      ?.textContent.includes('Platform'),
  );
  await page
    .locator('.el-tree-select__popper:visible')
    .getByText('Platform', { exact: true })
    .waitFor();
  await screenshot('user-department-tree-desktop');
  await departmentInput().fill('Operations');
  await page
    .locator('.el-tree-select__popper:visible')
    .getByText('Operations', { exact: true })
    .click();
  await submitModal();
  assert.equal(
    lastRequest('/v1/sys/users/200', 'PUT').payload.dept_id,
    departmentIds.operations,
  );
  assert.equal(
    lastRequest('/v1/sys/users/200', 'PUT').payload.avatar,
    '/avatar.png',
  );
  assert.equal(lastRequest('/v1/sys/users/200', 'PUT').payload.email, null);
  assert.equal(lastRequest('/v1/sys/users/200', 'PUT').payload.phone, null);
  assert.equal(
    'is_superuser' in lastRequest('/v1/sys/users/200', 'PUT').payload,
    false,
  );

  await editUser();
  await page.waitForFunction(() =>
    document
      .querySelector('[name="dept_id"]')
      ?.closest('.el-select')
      ?.textContent.includes('Operations'),
  );
  await selectDepartment('Head Office');
  await submitModal();
  assert.equal(
    lastRequest('/v1/sys/users/200', 'PUT').payload.dept_id,
    departmentIds.root,
  );
  await editUser();
  await selectDepartment('Platform');
  await submitModal();
  assert.equal(
    lastRequest('/v1/sys/users/200', 'PUT').payload.dept_id,
    departmentIds.platform,
  );
  await editUser();
  await departmentInput().hover();
  await dialog().locator('.el-select__clear').click();
  await submitModal();
  assert.equal(lastRequest('/v1/sys/users/200', 'PUT').payload.dept_id, null);
  await editUser();
  await page.waitForFunction(
    () =>
      !document
        .querySelector('[name="dept_id"]')
        ?.closest('.el-select')
        ?.textContent.includes('Platform'),
  );
  await modalButton('取消').click();

  departments.push(dept('900', 'Fresh department'));
  roles.push({ ...roles[0], id: 900, name: 'Fresh role' });
  await button('添加用户').click();
  await waitForModalReady();
  assert.equal(await dialog().locator('[name="username"]').inputValue(), '');
  await departmentInput().click();
  await page
    .locator('.el-tree-select__popper:visible')
    .getByText('Fresh department', { exact: true })
    .waitFor();
  await page.keyboard.press('Escape');
  await dialog().locator('[name="username"]').fill('new-department-user');
  await dialog().locator('[name="password"]').fill('test-password');
  await selectDepartment('Platform');
  failNext('POST', '/v1/sys/users', 'User save failed');
  await modalButton('确认').click();
  await page.getByText('User save failed', { exact: true }).waitFor();
  assert.equal(
    await dialog().locator('[name="password"]').inputValue(),
    'test-password',
  );
  await submitModal();
  assert.equal(
    lastRequest('/v1/sys/users', 'POST').payload.dept_id,
    departmentIds.platform,
  );
  await (await actionButton('new-department-user', '修改')).click();
  await waitForModalReady();
  assert.equal(await dialog().locator('[name="password"]').count(), 0);
  await dialog().locator('[name="nickname"]').fill('Updated new user');
  await submitModal();
  const updatedUser = lastRequest('/v1/sys/users/201', 'PUT').payload;
  assert.equal(updatedUser.nickname, 'Updated new user');
  assert.equal('password' in updatedUser, false);
  await (await actionButton('new-department-user', '重置密码')).click();
  await dialog().locator('[name="password"]').fill('replacement-password');
  await submitModal();
  assert.deepEqual(lastRequest('/v1/sys/users/201/password', 'PUT').payload, {
    password: 'replacement-password',
  });
  await confirmDelete('new-department-user');
  failNext('GET', '/v1/sys/depts', 'Department options unavailable');
  await button('添加用户').click();
  await page
    .getByText('Department options unavailable', { exact: true })
    .waitFor();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await button('添加用户').click();
  await waitForModalReady();
  await modalButton('取消').click();
  users[0].dept_id = '700';
  users[0].roles = [roles.find((role) => role.id === 700)];
  await page.goto(`${baseURL}/admin/user`);
  await editUser();
  await page.waitForFunction(() =>
    document
      .querySelector('[role="dialog"] [name="dept_id"]')
      ?.closest('.el-select')
      ?.textContent.includes('Disabled department'),
  );
  assert.equal(
    await dialog().locator('.el-select__selected-item .el-tag').innerText(),
    'Disabled role',
  );
  await submitModal();
  assert.equal(lastRequest('/v1/sys/users/200', 'PUT').payload.dept_id, '700');
  assert.deepEqual(
    lastRequest('/v1/sys/users/200', 'PUT').payload.roles,
    [700],
  );
  console.log(
    'Passed: department display/search/assignment, string IDs, clearing, user CRUD, disabled options and preserved existing bindings.',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/admin/dept`);
  await page
    .getByText('Head Office', { exact: true })
    .filter({ visible: true })
    .first()
    .waitFor();
  await button('新增部门').click();
  await dialog().locator('[name="name"]').waitFor();
  await screenshot('department-mobile');
  const bounds = await dialog().boundingBox();
  assert.ok(
    bounds && bounds.x >= 0 && bounds.x + bounds.width <= 391,
    'Department modal overflows mobile viewport',
  );
  await modalButton('取消').click();
  await page.goto(`${baseURL}/admin/user`);
  await row('department-user').waitFor();
  await editUser();
  await departmentInput().click();
  await page
    .locator('.el-tree-select__popper:visible')
    .getByText('Platform', { exact: true })
    .waitFor();
  await screenshot('user-department-tree-mobile');
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log('Passed: desktop/mobile layout; no uncaught browser errors.');
  console.log(`Screenshots: ${output}`);
} catch (error) {
  console.error(error);
  await page
    .screenshot({
      path: join(output, 'failure.png'),
      fullPage: true,
      timeout: 5000,
    })
    .catch(() => {});
  console.error((await page.locator('body').innerText()).slice(-14_000));
  console.error(
    await page.locator('button, [role="button"]').evaluateAll((items) =>
      items.map((item) => ({
        text: item.textContent,
        label: item.getAttribute('aria-label'),
        tag: item.tagName,
        role: item.getAttribute('role'),
      })),
    ),
  );
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await context.close();
  await browser.close();
}
