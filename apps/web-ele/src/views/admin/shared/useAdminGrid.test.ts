import { effectScope, nextTick, ref } from 'vue';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useGrid: vi.fn(),
  setGridOptions: vi.fn(),
  setFormState: vi.fn(),
}));
const locale = ref('zh-CN');
vi.mock('@vben/locales', () => ({
  $t: (key: string) => key,
  useI18n: () => ({ locale }),
}));
vi.mock('#/adapter/vxe-table', () => ({ useVbenVxeGrid: mocks.useGrid }));

import { pagedQuery, useAdminGrid } from './useAdminGrid';

beforeEach(() => {
  vi.clearAllMocks();
  locale.value = 'zh-CN';
  mocks.useGrid.mockReturnValue([
    'Grid',
    {
      setGridOptions: mocks.setGridOptions,
      formApi: { setState: mocks.setFormState },
    },
  ]);
});

describe('admin grid', () => {
  it('merges defaults and business options without losing toolbar or proxy options', () => {
    const scope = effectScope();
    const query = vi.fn();
    const columns = [
      { field: 'name' },
      { field: 'operation', showOverflow: true },
    ];
    scope.run(() =>
      useAdminGrid({
        columns: () => columns,
        schema: () => [],
        query,
        gridOptions: {
          height: 400,
          rowConfig: { keyField: 'session_uuid' },
          toolbarConfig: { print: true, export: false },
          proxyConfig: { autoLoad: false },
        },
      }),
    );
    const options = mocks.useGrid.mock.calls[0]![0];
    expect(options.gridOptions).toMatchObject({
      height: 400,
      keepSource: true,
      rowConfig: { keyField: 'session_uuid' },
      toolbarConfig: {
        print: true,
        export: false,
        refresh: true,
        custom: true,
      },
      proxyConfig: { autoLoad: false, ajax: { query: expect.any(Function) } },
      columns: [{ field: 'name' }, { field: 'operation', showOverflow: false }],
    });
    expect(columns[1]?.showOverflow).toBe(true);
    scope.stop();
  });

  it('rebuilds translated columns and form schema on locale change', async () => {
    const scope = effectScope();
    scope.run(() =>
      useAdminGrid({
        columns: () => [{ field: 'name', title: locale.value }],
        schema: () => [
          { fieldName: 'name', component: 'Input', label: locale.value },
        ],
        query: vi.fn(),
      }),
    );
    locale.value = 'en-US';
    await nextTick();
    expect(mocks.setGridOptions).toHaveBeenCalledWith({
      columns: [{ field: 'name', title: 'en-US' }],
    });
    expect(mocks.setFormState).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: [expect.objectContaining({ label: 'en-US' })],
      }),
    );
    scope.stop();
  });

  it('passes filter values with authoritative current pagination', async () => {
    const request = vi.fn().mockResolvedValue({ items: [] });
    await pagedQuery(request)(
      { page: { currentPage: 3, pageSize: 50 } },
      { username: 'test', status: 0, page: 99, size: 99 },
    );
    expect(request).toHaveBeenCalledWith({
      username: 'test',
      status: 0,
      page: 3,
      size: 50,
    });
  });

  it('runs the query lifecycle for programmatic reloads as well as toolbar requests', async () => {
    const scope = effectScope();
    const onQuery = vi.fn();
    const query = vi.fn().mockResolvedValue({ items: [] });
    scope.run(() =>
      useAdminGrid({
        columns: () => [],
        schema: () => [],
        query,
        onQuery,
      }),
    );
    const run =
      mocks.useGrid.mock.calls[0]![0].gridOptions.proxyConfig.ajax.query;
    const page = { page: { currentPage: 1, pageSize: 20 } };
    await expect(run(page, { name: 'Test' })).resolves.toEqual({ items: [] });
    expect(onQuery).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledWith(page, { name: 'Test' });
    scope.stop();
  });
});
