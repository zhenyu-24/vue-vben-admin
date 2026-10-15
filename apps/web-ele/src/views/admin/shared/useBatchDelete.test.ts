import type { AdminGridApi } from './useAdminGrid';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vben/common-ui', () => ({ confirm: vi.fn() }));
vi.mock('@vben/locales', () => ({ $t: (key: string) => key }));
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }));

import { confirm } from '@vben/common-ui';

import { useBatchDelete } from './useBatchDelete';

interface Row {
  id: number | string;
}

function setup() {
  const selected: Row[] = [{ id: '2069061886627938311' }, { id: 2 }];
  const grid = {
    setLoading: vi.fn(),
    setGridOptions: vi.fn(),
    query: vi.fn().mockResolvedValue(undefined),
    grid: {
      getCheckboxRecords: () => selected,
      clearCheckboxRow: vi.fn().mockResolvedValue(undefined),
      getProxyInfo: () => ({ pager: { currentPage: 3 } }),
      getTableData: () => ({ fullData: selected }),
    },
  };
  const remove = vi.fn().mockResolvedValue(undefined);
  const batch = useBatchDelete(
    () => grid as unknown as AdminGridApi<Row>,
    remove,
  );
  function select() {
    // Vxe supplies event metadata; the hook only reads current grid selection.
    (batch.gridEvents.checkboxChange as () => void)();
  }
  return { batch, grid, remove, selected, select };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(confirm).mockResolvedValue(undefined);
});

describe('admin batch deletion', () => {
  it('requires selection and sends an ID snapshot without coercion', async () => {
    const { batch, grid, remove, select, selected } = setup();
    await batch.deleteSelected();
    expect(confirm).not.toHaveBeenCalled();
    select();
    let resolve!: () => void;
    vi.mocked(confirm).mockReturnValueOnce(
      new Promise<void>((done) => {
        resolve = done;
      }),
    );
    const pending = batch.deleteSelected();
    await batch.deleteSelected();
    selected[0] = { id: 'changed' };
    resolve();
    await pending;
    expect(remove).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith(['2069061886627938311', 2]);
    expect(grid.grid.clearCheckboxRow).toHaveBeenCalledOnce();
    expect(grid.setGridOptions).toHaveBeenCalledWith({
      pagerConfig: { currentPage: 2 },
    });
    expect(grid.query).toHaveBeenCalledOnce();
    expect(batch.disabled.value).toBe(true);
    expect(batch.loading.value).toBe(false);
  });

  it('treats cancellation as a no-op and preserves selection', async () => {
    const { batch, grid, remove, select } = setup();
    select();
    vi.mocked(confirm).mockRejectedValueOnce(new Error('Cancelled'));
    await batch.deleteSelected();
    expect(remove).not.toHaveBeenCalled();
    expect(grid.query).not.toHaveBeenCalled();
    expect(batch.disabled.value).toBe(false);
  });

  it('retains selection on failure and supports retry', async () => {
    const { batch, grid, remove, select } = setup();
    select();
    remove.mockRejectedValueOnce(new Error('Unavailable'));
    await batch.deleteSelected();
    expect(grid.grid.clearCheckboxRow).not.toHaveBeenCalled();
    expect(batch.disabled.value).toBe(false);
    await batch.deleteSelected();
    expect(remove).toHaveBeenCalledTimes(2);
    expect(batch.disabled.value).toBe(true);
  });

  it('clears selected IDs after a new query', async () => {
    const { batch, remove, select } = setup();
    select();
    await batch.onQuery();
    expect(batch.disabled.value).toBe(true);
    await batch.deleteSelected();
    expect(remove).not.toHaveBeenCalled();
  });
});
