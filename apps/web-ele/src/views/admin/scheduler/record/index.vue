<script setup lang="ts">
import type { AdminGridApi } from '../../shared/useAdminGrid';
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { TaskResult } from '#/api';

import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer, VbenButton } from '@vben/common-ui';

import { Delete } from '@element-plus/icons-vue';
import { ElDescriptions, ElDescriptionsItem, ElTag } from 'element-plus';

import {
  deleteTaskResultApi,
  getTaskResultApi,
  getTaskResultListApi,
} from '#/api';

import { pagedQuery, useAdminGrid } from '../../shared/useAdminGrid';
import { useBatchDelete } from '../../shared/useBatchDelete';
import { displayResult, querySchema, statusOptions, useColumns } from './data';

defineOptions({ name: 'TaskSchedulerRecord' });
const route = useRoute();
const details = ref<TaskResult>();
const { gridEvents, disabled, loading, deleteSelected, onQuery } =
  useBatchDelete<TaskResult>(
    (): AdminGridApi<TaskResult> => gridApi,
    deleteTaskResultApi,
  );
const [Grid, gridApi] = useAdminGrid<TaskResult>({
  columns: () => useColumns(onActionClick),
  schema: () => querySchema,
  query: pagedQuery(getTaskResultListApi),
  gridEvents,
  onQuery,
  gridOptions: {
    checkboxConfig: { highlight: true },
    proxyConfig: { autoLoad: false },
  },
});
const [Drawer, drawerApi] = useVbenDrawer({
  title: '任务执行记录详情',
  class: 'w-[760px] max-w-full',
  footer: false,
  destroyOnClose: true,
});
let detailRequest = 0;
async function onActionClick({ code, row }: OnActionClickParams<TaskResult>) {
  if (code !== 'details') return;
  const request = ++detailRequest;
  details.value = undefined;
  drawerApi.open();
  drawerApi.setState({ loading: true });
  try {
    const result = await getTaskResultApi(row.id);
    if (request === detailRequest) details.value = result;
  } catch {
    if (request === detailRequest) drawerApi.close();
  } finally {
    if (request === detailRequest) drawerApi.setState({ loading: false });
  }
}
async function syncRoute() {
  if (route.name !== 'TaskSchedulerRecord') return;
  await gridApi.formApi.setValues({
    name: typeof route.query.name === 'string' ? route.query.name : '',
  });
  gridApi.formApi.setLatestSubmissionValues(await gridApi.formApi.getValues());
  await gridApi.reload();
}
onMounted(syncRoute);
watch(() => route.query.name, syncRoute);
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
          <Delete class="mr-1 size-5" />删除记录
        </VbenButton>
      </template>
    </Grid>
    <Drawer>
      <ElDescriptions v-if="details" :column="1" border class="break-all">
        <ElDescriptionsItem label="任务 ID">{{
          details.task_id
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="任务名称">{{
          details.name ?? '无'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="状态">
          <ElTag
            :type="
              (statusOptions.find((item) => item.value === details?.status)
                ?.color ?? 'info') as
                | 'success'
                | 'danger'
                | 'primary'
                | 'warning'
                | 'info'
            "
            >{{ details.status }}</ElTag
          >
        </ElDescriptionsItem>
        <ElDescriptionsItem label="结束时间">{{
          details.date_done ?? '无'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="重试次数">{{
          details.retries ?? 0
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Worker">{{
          details.worker ?? '无'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="队列">{{
          details.queue ?? '无'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem
          v-for="item in [
            { key: 'args', label: '位置参数' },
            { key: 'kwargs', label: '关键字参数' },
            { key: 'result', label: '执行结果' },
            { key: 'traceback', label: '错误回溯' },
          ] as const"
          :key="item.key"
          :label="item.label"
        >
          <pre
            class="max-h-[400px] overflow-auto whitespace-pre-wrap break-all font-mono text-sm"
            >{{ displayResult(details[item.key]) }}</pre
          >
        </ElDescriptionsItem>
      </ElDescriptions>
    </Drawer>
  </Page>
</template>
