<script lang="ts" setup>
import type { AdminGridApi } from '../../shared/useAdminGrid';

import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { OperaLogResult } from '#/api';

import { computed, ref } from 'vue';

import { JsonViewer, Page, useVbenDrawer, VbenButton } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import { Delete } from '@element-plus/icons-vue';
import { ElMessage, ElTag } from 'element-plus';

import { deleteOperaLogApi, getOperaLogListApi } from '#/api';

import DetailTable from '../../components/detail-table.vue';
import { pagedQuery, useAdminGrid } from '../../shared/useAdminGrid';
import { useBatchDelete } from '../../shared/useBatchDelete';
import { querySchema, useColumns } from './data';

defineOptions({ name: 'OperaLog' });

const { gridEvents, disabled, loading, deleteSelected, onQuery } =
  useBatchDelete<OperaLogResult>(
    (): AdminGridApi<OperaLogResult> => gridApi,
    deleteOperaLogApi,
  );
const [Grid, gridApi] = useAdminGrid<OperaLogResult>({
  columns: () => useColumns(onActionClick),
  schema: () => querySchema,
  query: pagedQuery(getOperaLogListApi),
  gridEvents,
  onQuery,
  gridOptions: { checkboxConfig: { highlight: true } },
});

function onActionClick({ code, row }: OnActionClickParams<OperaLogResult>) {
  switch (code) {
    case 'details': {
      operaLogDetails.value = row;
      drawerApi.open();
    }
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  destroyOnClose: true,
  footer: false,
  class: 'w-[900px] max-w-full',
  contentClass: 'p-4',
});

const operaLogDetails = ref<OperaLogResult>();
const { isDark } = usePreferences();

const operaLogDescItems = computed(() => {
  const d = operaLogDetails.value;
  return [
    { key: 'trace_id', label: '追踪 ID', value: d?.trace_id, fullWidth: true },
    { key: 'path', label: '请求路径', value: d?.path, fullWidth: true },
    { key: 'username', label: '用户名', value: d?.username },
    { key: 'title', label: '操作标题', value: d?.title },
    { key: 'method', label: '请求方法', value: d?.method },
    { key: 'os', label: '操作系统', value: d?.os },
    { key: 'device', label: '设备', value: d?.device },
    { key: 'browser', label: '浏览器', value: d?.browser },
    { key: 'ip', label: '请求 IP', value: d?.ip },
    {
      key: 'country',
      label: '国家',
      value: d?.country === 'None' || !d?.country ? 'N/A' : d?.country,
    },
    {
      key: 'region',
      label: '地区',
      value: d?.region === 'None' || !d?.region ? 'N/A' : d?.region,
    },
    { key: 'city', label: '城市', value: d?.city },
    { key: 'code', label: '状态码', value: d?.code },
    { key: 'status', label: '状态' },
    { key: 'opera_time', label: '操作时间', value: d?.opera_time },
    { key: 'cost_time', label: '耗时' },
    {
      key: 'user_agent',
      label: '用户代理',
      value: d?.user_agent,
      fullWidth: true,
    },
    { key: 'args', label: '请求参数', fullWidth: true },
    { key: 'msg', label: '响应消息', value: d?.msg, fullWidth: true },
  ];
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton
          variant="destructive"
          :disabled="disabled"
          :loading="loading"
          @click="deleteSelected"
        >
          <Delete class="size-5" />
          删除日志
        </VbenButton>
      </template>
    </Grid>
    <Drawer title="操作日志详情">
      <DetailTable :items="operaLogDescItems">
        <template #status>
          <ElTag
            v-if="operaLogDetails?.status === 1"
            size="small"
            type="success"
          >
            成功
          </ElTag>
          <ElTag v-else size="small" type="danger">失败</ElTag>
        </template>
        <template #cost_time>
          <ElTag
            size="small"
            :type="
              (operaLogDetails?.cost_time || 0) < 200 ? 'success' : 'warning'
            "
          >
            {{ operaLogDetails?.cost_time }} ms
          </ElTag>
        </template>
        <template #args>
          <div class="min-w-0 overflow-x-auto">
            <JsonViewer
              class="w-full"
              :value="operaLogDetails?.args"
              :copyable="!!operaLogDetails?.args"
              :theme="isDark ? 'dark' : 'light'"
              boxed
              expanded
              :expand-depth="3"
              :show-array-index="false"
              @copied="ElMessage.success('已复制请求参数')"
            />
          </div>
        </template>
      </DetailTable>
    </Drawer>
  </Page>
</template>
