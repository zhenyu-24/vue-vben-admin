<script lang="ts" setup>
import type { VbenFormProps } from '@vben/common-ui';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { OnlineMonitorResult } from '#/api';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { ElMessage, ElTag } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getOnlineMonitorApi, kickOutOnlineApi } from '#/api';

import { querySchema, useColumns } from './data';

const formOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  submitButtonOptions: {
    content: $t('common.query'),
  },
  schema: querySchema,
};

const gridOptions: VxeTableGridOptions<OnlineMonitorResult> = {
  rowConfig: {
    keyField: 'session_uuid',
  },
  virtualYConfig: {
    enabled: true,
    gt: 0,
  },
  height: 'auto',
  exportConfig: {},
  printConfig: {},
  toolbarConfig: {
    export: true,
    print: false,
    refresh: true,
    refreshOptions: {
      code: 'query',
    },
    custom: true,
    zoom: true,
  },
  pagerConfig: {
    pageSize: 20,
    pageSizes: [10, 20, 30, 50, 100, 200],
  },
  columns: useColumns(onActionClick),
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const res = await getOnlineMonitorApi({
          ...formValues,
        });
        const total = res.length;
        onlineCount.value = total;
        const start = (page.currentPage - 1) * page.pageSize;
        const items = res.slice(start, start + page.pageSize);
        return { items, total };
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
  tableTitle: '在线用户',
});

const onlineCount = ref<number>(0);

function onRefresh() {
  gridApi.query();
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<OnlineMonitorResult>) {
  if (code === 'delete') {
    kickOutOnlineApi(row.id, { session_uuid: row.session_uuid }).then(() => {
      ElMessage.success({
        message: `已强制下线 ${row.nickname}`,
      });
      onRefresh();
    });
  }
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
