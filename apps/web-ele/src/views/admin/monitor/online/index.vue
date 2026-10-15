<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { MonitorOnlineParams, OnlineMonitorResult } from '#/api';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElTag } from 'element-plus';

import { getOnlineMonitorApi, kickOutOnlineApi } from '#/api';

import { useAdminGrid } from '../../shared/useAdminGrid';
import { useDeleteRow } from '../../shared/useDeleteRow';
import { querySchema, useColumns } from './data';

defineOptions({ name: 'Online' });

const onlineCount = ref(0);
const [Grid, gridApi] = useAdminGrid<OnlineMonitorResult>({
  columns: () => useColumns(onActionClick),
  schema: () => querySchema,
  tableTitle: '在线用户',
  gridOptions: {
    rowConfig: { keyField: 'session_uuid' },
    virtualYConfig: { enabled: true, gt: 0 },
    pagerConfig: { pageSize: 20, pageSizes: [10, 20, 30, 50, 100, 200] },
  },
  query: async ({ page }, values: MonitorOnlineParams) => {
    const sessions = await getOnlineMonitorApi(values);
    onlineCount.value = sessions.length;
    const start = (page.currentPage - 1) * page.pageSize;
    return {
      items: sessions.slice(start, start + page.pageSize),
      total: sessions.length,
    };
  },
});
const kickOut = useDeleteRow<OnlineMonitorResult>(
  gridApi,
  (id, row) => kickOutOnlineApi(id, { session_uuid: row.session_uuid }),
  (row) => `已强制下线 ${row.nickname}`,
);

function onActionClick({
  code,
  row,
}: OnActionClickParams<OnlineMonitorResult>) {
  if (code === 'delete') return kickOut(row);
}
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <div class="flex items-center gap-2">
          <ElTag type="success" effect="dark" size="small">
            {{ onlineCount }}
          </ElTag>
        </div>
      </template>
    </Grid>
  </Page>
</template>
