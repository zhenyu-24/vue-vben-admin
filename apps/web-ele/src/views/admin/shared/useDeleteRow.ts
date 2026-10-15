import type { AdminGridApi } from './useAdminGrid';

import type { SysId } from '#/types/api';

import { ElMessage } from 'element-plus';

export async function refreshAfterDelete<T extends Record<string, any>>(
  gridApi: AdminGridApi<T>,
  deletedCount: number,
) {
  const { currentPage } = gridApi.grid.getProxyInfo()?.pager ?? {};
  if (
    currentPage &&
    currentPage > 1 &&
    gridApi.grid.getTableData().fullData.length <= deletedCount
  ) {
    gridApi.setGridOptions({ pagerConfig: { currentPage: currentPage - 1 } });
  }
  await gridApi.query();
}

export function useDeleteRow<T extends { id: SysId }>(
  gridApi: AdminGridApi<T>,
  remove: (id: T['id'], row: T) => Promise<unknown>,
  successMessage: (row: T) => string,
) {
  let deleting = false;

  return async (row: T) => {
    if (deleting) return;
    deleting = true;
    gridApi.setLoading(true);
    try {
      await remove(row.id, row);
      ElMessage.success(successMessage(row));
      await refreshAfterDelete(gridApi, 1);
    } catch {
      // The request interceptor displays API errors.
    } finally {
      gridApi.setLoading(false);
      deleting = false;
    }
  };
}
