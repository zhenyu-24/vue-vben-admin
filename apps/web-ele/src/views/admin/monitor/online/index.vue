<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { MonitorOnlineParams, OnlineMonitorResult } from '#/api';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

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
  query: async ({ page, sort }, values: MonitorOnlineParams) => {
    const sessions = await getOnlineMonitorApi(values);
    onlineCount.value = sessions.filter(
      (session) => session.status === 1,
    ).length;
    if (sort?.order)
      sessions.sort((a, b) => {
        const field = sort.field as keyof OnlineMonitorResult;
        const compared = String(a[field] ?? '').localeCompare(
          String(b[field] ?? ''),
          'zh-CN',
          { numeric: true },
        );
        return sort.order === 'desc' ? -compared : compared;
      });
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
      <template #table-title>
        <div class="flex items-center gap-2">
          <span class="text-[1rem] font-bold">在线用户</span>
          <span
            :aria-label="`在线会话数：${onlineCount}`"
            class="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-success/10 px-2 text-xs font-semibold leading-none text-success-700 tabular-nums dark:text-success-400"
            role="status"
          >
            {{ onlineCount }}
          </span>
        </div>
      </template>
    </Grid>
  </Page>
</template>
