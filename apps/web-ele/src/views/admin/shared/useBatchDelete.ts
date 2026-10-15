import type { ComputedRef, Ref } from 'vue';

import type { AdminGridApi } from './useAdminGrid';

import type { VxeGridListeners } from '#/adapter/vxe-table';
import type { SysId } from '#/types/api';

import { computed, ref } from 'vue';

import { confirm } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { ElMessage } from 'element-plus';

import { refreshAfterDelete } from './useDeleteRow';

export function useBatchDelete<T extends { id: SysId }>(
  getGrid: () => AdminGridApi<T>,
  remove: (ids: SysId[]) => Promise<unknown>,
): {
  deleteSelected: () => Promise<void>;
  disabled: ComputedRef<boolean>;
  gridEvents: VxeGridListeners<T>;
  loading: Ref<boolean>;
  onQuery: () => Promise<void>;
} {
  const selectedIds = ref<SysId[]>([]);
  const loading = ref(false);
  const disabled = computed(
    () => loading.value || selectedIds.value.length === 0,
  );

  function updateSelection() {
    selectedIds.value = getGrid()
      .grid.getCheckboxRecords(true)
      .map((row) => row.id);
  }

  const gridEvents: VxeGridListeners<T> = {
    checkboxChange: updateSelection,
    checkboxAll: updateSelection,
  };

  async function onQuery() {
    selectedIds.value = [];
    await getGrid().grid.clearCheckboxRow();
  }

  async function deleteSelected() {
    if (disabled.value) return;
    const ids = [...selectedIds.value];
    loading.value = true;
    const grid = getGrid();
    try {
      await confirm({ icon: 'warning', content: '确定删除已勾选的记录吗？' });
      grid.setLoading(true);
      await remove(ids);
      ElMessage.success($t('ui.actionMessage.deleteSuccess'));
      await grid.grid.clearCheckboxRow();
      selectedIds.value = [];
      await refreshAfterDelete(grid, ids.length);
    } catch {
      // Cancellation needs no message; API failures are handled by the interceptor.
    } finally {
      grid.setLoading(false);
      loading.value = false;
    }
  }

  return { gridEvents, disabled, loading, deleteSelected, onQuery };
}
