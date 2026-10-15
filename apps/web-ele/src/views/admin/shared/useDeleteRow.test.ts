import type { useVbenVxeGrid } from '#/adapter/vxe-table';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }));

import { ElMessage } from 'element-plus';

import { useDeleteRow } from './useDeleteRow';

interface Row {
  id: number | string;
  name: string;
}

function setup(currentPage = 1, rowCount = 2) {
  const grid = {
    setLoading: vi.fn(),
    setGridOptions: vi.fn(),
    query: vi.fn().mockResolvedValue(undefined),
    grid: {
      getProxyInfo: () => ({ pager: { currentPage } }),
      getTableData: () => ({ fullData: Array.from({ length: rowCount }) }),
    },
  };
  const remove = vi.fn().mockResolvedValue(undefined);
  const deleteRow = useDeleteRow<Row>(
    grid as unknown as ReturnType<typeof useVbenVxeGrid<Row>>[1],
    remove,
    (row) => `Deleted ${row.name}`,
  );
  return { grid, remove, deleteRow };
}

beforeEach(() => vi.clearAllMocks());

describe('organization deletion', () => {
  it.each([1, '1', '2069061886627938311'])(
    'passes ID %s unchanged and refreshes after deletion',
    async (id) => {
      const { grid, remove, deleteRow } = setup();
      await deleteRow({ id, name: 'Test' });
      expect(remove).toHaveBeenCalledWith(id, { id, name: 'Test' });
      expect(grid.query).toHaveBeenCalledOnce();
      expect(grid.setGridOptions).not.toHaveBeenCalled();
      expect(grid.setLoading.mock.calls).toEqual([[true], [false]]);
      expect(ElMessage.success).toHaveBeenCalledWith('Deleted Test');
    },
  );

  it('moves back one page after deleting the last row', async () => {
    const { grid, deleteRow } = setup(3, 1);
    await deleteRow({ id: 1, name: 'Test' });
    expect(grid.setGridOptions).toHaveBeenCalledWith({
      pagerConfig: { currentPage: 2 },
    });
  });

  it('does not move before the first page or paginate a tree', async () => {
    for (const page of [0, 1]) {
      const { grid, deleteRow } = setup(page, 1);
      await deleteRow({ id: 1, name: 'Test' });
      expect(grid.setGridOptions).not.toHaveBeenCalled();
    }
  });

  it('keeps data and page unchanged on failure and permits retry', async () => {
    const { grid, remove, deleteRow } = setup(3, 1);
    remove.mockRejectedValueOnce(new Error('Department contains users'));
    await deleteRow({ id: 1, name: 'Test' });
    expect(grid.query).not.toHaveBeenCalled();
    expect(grid.setGridOptions).not.toHaveBeenCalled();
    expect(ElMessage.success).not.toHaveBeenCalled();
    expect(grid.setLoading).toHaveBeenLastCalledWith(false);
    await deleteRow({ id: 1, name: 'Test' });
    expect(grid.query).toHaveBeenCalledOnce();
  });

  it('ignores duplicate submissions while deletion is pending', async () => {
    const { remove, deleteRow } = setup();
    let resolve!: () => void;
    remove.mockReturnValueOnce(new Promise<void>((done) => (resolve = done)));
    const pending = deleteRow({ id: 1, name: 'Test' });
    await deleteRow({ id: 1, name: 'Test' });
    expect(remove).toHaveBeenCalledOnce();
    resolve();
    await pending;
  });
});
