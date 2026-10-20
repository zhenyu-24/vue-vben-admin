import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

// eslint-disable-next-line n/no-extraneous-import
import { chromium } from 'playwright';

const base = process.env.TEST_BASE_URL || 'http://localhost:5777';
const output = join(tmpdir(), 'file-resources-regression');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
let admin = true;
let failed = false;
let deleted = 0;
let uploads = 0;
let replacements = 0;
let visibilityChanges = 0;
let batchDeletes = 0;
let lastBrowse;
const errors = [];
const unexpected = [];
const digest = (data) => createHash('sha256').update(data).digest('hex');
const file = (id, name, extra = {}) => ({
  file_id: id, name, original_name: name, upload_type: 'document', extension: 'pdf',
  size: 6, is_public: false, exists: true, user_id: '9007199254740993', username: 'file_admin',
  owner_uses_avatar: false, mime_type: 'application/pdf', created_time: '2026-10-20 12:00:00',
  url_path: `/storage/files/document/${name}`, url: '',
  storage_path: `document/${name}`,
  download_url: `/api/v1/files/download/${id}`, ...extra,
});
let records = [
  file('9007199254741001', 'report.pdf'),
  file('9007199254741002', 'avatar.png', { upload_type: 'avatar', owner_uses_avatar: true, is_public: true }),
  file('9007199254741003', 'missing.pdf', { exists: false }),
];
await context.addInitScript(() => {
  localStorage.setItem('vben-web-ele-5.7.0-dev-core-access', JSON.stringify({ accessToken: 'ui-test' }));
  Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
});
let metadata;
await context.route('http://localhost:8000/api/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace('/api', '');
  let data = [];
  let status = 200;
  if (path.startsWith('/v1/files/')) {
    assert.equal(request.headers().authorization, 'Bearer ui-test');
    if (path === '/v1/files/manage/resource-folders') {
      data = ['manuals', 'manuals/api'];
    } else if (path === '/v1/files/manage/browse') {
      lastBrowse = url;
      if (failed) status = 503;
      const items = records.filter((row) => (!url.searchParams.get('name') || row.original_name.includes(url.searchParams.get('name')))
        && (!url.searchParams.get('username') || row.username.includes(url.searchParams.get('username'))));
      const current = url.searchParams.get('path') || '';
      const recursive = url.searchParams.get('recursive') === 'true';
      data = { path: current, folders: current || recursive || !items.length ? [] : [{ name: 'document', path: 'document', count: items.length }],
        files: { items: current || recursive ? items : [], total: current || recursive ? items.length : 0, page: 1, size: 20, total_pages: 1 } };
    } else if (path === '/v1/files/manage/batch-delete') {
      const ids = request.postDataJSON().ids;
      assert.ok(ids.every((id) => typeof id === 'string'));
      records = records.filter((row) => !ids.includes(row.file_id));
      batchDeletes++;
      data = { deleted: ids, failed: [] };
    } else if (path.endsWith('/visibility')) {
      assert.equal(request.method(), 'PATCH');
      const id = path.split('/').at(-2);
      data = records.find((row) => row.file_id === id);
      data.is_public = request.postDataJSON().is_public;
      visibilityChanges++;
    } else if (path.endsWith('/content')) {
      assert.equal(request.method(), 'PUT');
      const id = path.split('/').at(-2);
      const source = request.postDataJSON().source_file_id;
      assert.equal(source, '9007199254741004');
      records = records.filter((row) => row.file_id !== source);
      data = records.find((row) => row.file_id === id);
      replacements++;
    } else if (path.endsWith('/download')) {
      return route.fulfill({ contentType: 'application/octet-stream', body: 'report' });
    } else if (path.startsWith('/v1/files/manage/')) {
      const id = path.split('/').at(-1);
      if (request.method() === 'DELETE') {
        records = records.filter((row) => row.file_id !== id);
        deleted++;
      } else data = records.find((row) => row.file_id === id);
    } else if (path.endsWith('/precheck')) {
      metadata = request.postDataJSON();
      assert.equal(metadata.filename, 'upload.pdf');
      assert.equal(metadata.sha256, digest('upload'));
      assert.equal(metadata.is_public, false);
      if (uploads === 1) assert.equal(metadata.target_path, 'manuals/api');
      else assert.equal(metadata.target_path, undefined);
      data = { upload_id: 'a'.repeat(64), chunk_size: 4194304, total_chunks: 1, uploaded_chunks: [], file: null };
    } else if (request.method() === 'PUT') {
      assert.equal(request.postData(), 'upload');
      assert.equal(request.headers()['x-chunk-sha256'], digest('upload'));
      data = null;
    } else if (path.endsWith('/merge')) {
      uploads++;
      data = file('9007199254741004', metadata.filename);
      records.push(data);
    } else unexpected.push(path);
  } else if (path === '/v1/sys/users/me') {
    data = { id: '1', username: 'admin', nickname: '测试管理员', roles: [], is_superuser: admin, homePath: '/admin/files' };
  } else if (path === '/v1/sys/menus/sidebar') {
    data = [{ name: 'Admin', path: '/admin', component: 'BasicLayout', meta: { title: '系统管理' }, children: [] }];
  } else if (path === '/v1/sys/notices') data = { items: [], total: 0 };
  else if (path === '/v1/auth/codes' || path.includes('/status') || path.startsWith('/v1/sys/external-links')) data = [];
  else unexpected.push(path);
  await route.fulfill({ status, json: { code: status, msg: status === 200 ? 'success' : 'unavailable', data } });
});
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
const row = (name) => page.locator('.vxe-table--main-wrapper .vxe-body--row').filter({ hasText: name }).first();
try {
  await page.goto(`${base}/admin/files`);
  await page.getByRole('menuitem', { name: '文件中心', exact: true }).waitFor();
  await row('document').getByRole('button', { name: 'document', exact: true }).click();
  await row('report.pdf').waitFor();
  assert.ok((await row('report.pdf').first().textContent()).includes('file_admin'));
  await page.getByRole('button', { name: '上一级', exact: true }).click();
  await row('document').waitFor();
  await row('document').getByRole('button', { name: 'document', exact: true }).click();
  assert.equal(await row('avatar.png').getByRole('button', { name: '删除文件', exact: true }).isDisabled(), true);
  assert.equal(await row('missing.pdf').getByRole('button', { name: '下载文件', exact: true }).isDisabled(), true);
  await row('report.pdf').getByRole('button', { name: '文件详情', exact: true }).click();
  const detail = page.getByRole('dialog', { name: '文件详情', exact: true });
  await detail.getByText('9007199254741001', { exact: true }).waitFor();
  await detail.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByPlaceholder('搜索文件名').fill('missing');
  await page.getByPlaceholder('搜索文件名').press('Enter');
  await row('report.pdf').waitFor({ state: 'hidden' });
  assert.equal(lastBrowse.searchParams.get('recursive'), 'true');
  assert.equal(lastBrowse.searchParams.get('path'), '');
  await page.getByRole('button', { name: '重置', exact: true }).click();
  await row('report.pdf').waitFor();
  await row('report.pdf').locator('.el-switch').click();
  await page.getByRole('button', { name: '确定', exact: true }).click();
  await page.waitForResponse((response) => response.url().includes('/browse'));
  assert.equal(visibilityChanges, 1);
  assert.equal(records[0].is_public, true);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('sort_by=')),
    page.locator('.vxe-table--main-wrapper .vxe-header--column').filter({ hasText: '上传时间' }).locator('.vxe-sort--asc-btn').click(),
  ]);
  assert.equal(lastBrowse.searchParams.get('sort_by'), 'file.created_time');
  assert.equal(lastBrowse.searchParams.get('sort_order'), 'asc');
  const downloadEvent = page.waitForEvent('download');
  await row('report.pdf').getByRole('button', { name: '下载文件', exact: true }).click();
  assert.equal((await downloadEvent).suggestedFilename(), 'report.pdf');
  await row('report.pdf').getByRole('button', { name: '替换文件', exact: true }).click();
  const replaceDialog = page.getByRole('dialog', { name: '替换文件', exact: true });
  await replaceDialog.locator('input[type=file]').setInputFiles({ name: 'upload.pdf', mimeType: 'application/pdf', buffer: Buffer.from('upload') });
  await replaceDialog.getByRole('button', { name: '确认替换', exact: true }).click();
  await replaceDialog.waitFor({ state: 'hidden' });
  assert.equal(replacements, 1);
  assert.equal(records.some((item) => item.file_id === '9007199254741004'), false);
  await row('report.pdf').waitFor();
  await row('report.pdf').getByRole('button', { name: '删除文件', exact: true }).click();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(deleted, 0);
  await row('report.pdf').getByRole('button', { name: '删除文件', exact: true }).click();
  await page.getByRole('button', { name: '永久删除', exact: true }).click();
  await row('report.pdf').waitFor({ state: 'hidden' });
  assert.equal(deleted, 1);
  await page.getByRole('button', { name: '上传文件', exact: true }).click();
  const uploadDialog = page.getByRole('dialog', { name: '上传文件', exact: true });
  await uploadDialog.locator('.el-select__wrapper').first().click();
  await page.getByRole('option', { name: '资源', exact: true }).click();
  await uploadDialog.locator('.el-select__wrapper').nth(1).click();
  await page.getByRole('option', { name: 'manuals/api', exact: true }).click();
  await page.screenshot({ path: join(output, 'upload-directory-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(output, 'upload-directory-mobile.png'), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await uploadDialog.locator('input[type=file]').setInputFiles({ name: 'upload.pdf', mimeType: 'application/pdf', buffer: Buffer.from('upload') });
  await uploadDialog.getByRole('button', { name: '上传', exact: true }).click();
  await row('upload.pdf').waitFor();
  assert.equal(uploads, 2);
  await uploadDialog.waitFor({ state: 'hidden' });
  await row('upload.pdf').locator('.vxe-cell--checkbox').click();
  await row('missing.pdf').locator('.vxe-cell--checkbox').click();
  await page.getByRole('button', { name: '删除所选', exact: true }).click();
  await page.getByRole('button', { name: '确定', exact: true }).click();
  await row('upload.pdf').waitFor({ state: 'hidden' });
  assert.equal(batchDeletes, 1);
  await page.locator('.el-message').first().waitFor({ state: 'hidden' });
  await page.screenshot({ path: join(output, 'desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(output, 'mobile.png'), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  failed = true;
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await page.getByText('文件列表加载失败，请刷新重试', { exact: true }).waitFor();
  failed = false;
  records = [];
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await row('upload.pdf').waitFor({ state: 'hidden' });
  admin = false;
  await page.reload();
  await page.locator('#__app-loading__').waitFor({ state: 'hidden' });
  await page.waitForTimeout(1000);
  assert.equal(await page.getByRole('button', { name: '上传文件', exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  console.log(`File resource center regression passed. Screenshots: ${output}`);
} catch (error) {
  await page.screenshot({ path: join(output, 'failure.png'), fullPage: true });
  console.log(await page.locator('.vxe-body--row').allTextContents());
  throw error;
} finally {
  await browser.close();
}
