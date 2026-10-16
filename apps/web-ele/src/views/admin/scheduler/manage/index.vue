<script setup lang="ts">
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { TaskSchedulerResult } from '#/api';
import type { SysId } from '#/types/api';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenModal, VbenButton, VbenTooltip } from '@vben/common-ui';
import { CircleHelp, Plus } from '@vben/icons';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import {
  createTaskSchedulerApi,
  deleteTaskSchedulerApi,
  executeTaskSchedulerApi,
  getTaskSchedulerApi,
  getTaskSchedulerListApi,
  updateTaskSchedulerApi,
  updateTaskSchedulerStatusApi,
} from '#/api';

import StatusSwitch from '../../shared/status-switch.vue';
import { pagedQuery, useAdminGrid } from '../../shared/useAdminGrid';
import { useDeleteRow } from '../../shared/useDeleteRow';
import { useFormSubmit } from '../../shared/useFormSubmit';
import CronBuilder from './cron-builder.vue';
import { createSchema, querySchema, useColumns } from './data';
import {
  nextRuns,
  scheduleLabel,
  schedulerPayload,
  schedulerValues,
} from './schedule';

defineOptions({ name: 'TaskSchedulerManage' });
const router = useRouter();
const cronBuilder = ref<InstanceType<typeof CronBuilder>>();
const editing = ref<TaskSchedulerResult>();
const title = computed(() => (editing.value ? '编辑任务' : '新增任务'));
const busy = ref<Record<string, boolean>>({});
const [Grid, gridApi] = useAdminGrid<TaskSchedulerResult>({
  columns: () => useColumns(onActionClick),
  schema: () => querySchema,
  query: pagedQuery(getTaskSchedulerListApi),
});
const deleteRow = useDeleteRow(
  gridApi,
  deleteTaskSchedulerApi,
  (row) => `已删除 ${row.name}`,
);
const [Form, formApi] = useVbenForm({
  wrapperClass: 'md:grid-cols-2',
  layout: 'vertical',
  showDefaultActions: false,
  schema: createSchema(async () => {
    const values = await formApi.getValues();
    cronBuilder.value?.open(values.crontab);
  }),
});
const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  class: 'w-[800px] max-w-[calc(100vw-2rem)]',
  onConfirm: useFormSubmit<ReturnType<typeof schedulerValues>>({
    form: () => formApi,
    modal: (): ReturnType<typeof useVbenModal>[1] => modalApi,
    save: (values) =>
      editing.value
        ? updateTaskSchedulerApi(editing.value.id, schedulerPayload(values))
        : createTaskSchedulerApi(schedulerPayload(values)),
    successMessage: () => '保存成功',
    onSuccess: () => gridApi.query(),
  }),
  async onOpenChange(open) {
    if (!open) return;
    editing.value = undefined;
    await formApi.resetForm();
    const data = modalApi.getData<TaskSchedulerResult>();
    if (data?.id !== undefined) {
      modalApi.lock();
      try {
        editing.value = await getTaskSchedulerApi(data.id);
      } catch {
        await modalApi.close();
        return;
      } finally {
        modalApi.unlock();
      }
    }
    await formApi.setValues(schedulerValues(editing.value));
  },
});
function onActionClick({
  code,
  row,
}: OnActionClickParams<TaskSchedulerResult>) {
  if (code === 'delete') return deleteRow(row);
  if (code === 'edit') modalApi.setData(row).open();
  if (code === 'log')
    router.push({ name: 'TaskSchedulerRecord', query: { name: row.task } });
}
async function rowAction(id: SysId, action: 'execute' | 'status') {
  const key = `${action}:${id}`;
  if (busy.value[key]) return;
  busy.value[key] = true;
  try {
    await (action === 'execute'
      ? executeTaskSchedulerApi(id)
      : updateTaskSchedulerStatusApi(id));
    ElMessage.success(action === 'execute' ? '任务已提交执行' : '状态已更新');
    await gridApi.query();
  } catch {
    // Request errors are shown by the shared interceptor.
  } finally {
    busy.value[key] = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton class="gap-2" @click="modalApi.setData({}).open()">
          <Plus class="size-4 shrink-0" aria-hidden="true" />
          新增任务
        </VbenButton>
      </template>
      <template #scheduleHeader>
        <span class="inline-flex items-center gap-1 align-middle">
          触发策略
          <VbenTooltip side="top">
            <template #trigger>
              <VbenButton
                class="size-4 shrink-0 cursor-help rounded-full p-0 text-muted-foreground"
                size="icon"
                variant="ghost"
                aria-label="触发策略说明"
                :tabindex="0"
              >
                <CircleHelp class="size-3.5 shrink-0" />
              </VbenButton>
            </template>
            <span>Crontab 表达式：</span>
            <a
              class="break-all text-primary hover:underline"
              href="https://docs.celery.dev/en/latest/userguide/periodic-tasks.html#crontab-schedules"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://docs.celery.dev/en/latest/userguide/periodic-tasks.html#crontab-schedules
            </a>
          </VbenTooltip>
        </span>
      </template>
      <template #schedule="{ row }">
        <VbenTooltip side="top">
          <template #trigger>
            <VbenButton
              class="h-6 bg-muted px-2 font-mono"
              variant="link"
              size="sm"
            >
              {{ scheduleLabel(row) }}
            </VbenButton>
          </template>
          <div class="mb-1 font-medium">预计执行时间（浏览器本地时区）</div>
          <div
            v-for="(time, index) in nextRuns(row)"
            :key="index"
            class="font-mono text-sm"
          >
            {{ time }}
          </div>
          <span v-if="nextRuns(row).length === 0">暂无后续执行计划</span>
        </VbenTooltip>
      </template>
      <template #status="{ row }">
        <StatusSwitch
          :model-value="row.status === 1"
          :loading="busy[`status:${row.id}`]"
          :aria-label="`${row.name}状态`"
          @change="rowAction(row.id, 'status')"
        />
      </template>
      <template #execute="{ row }">
        <VbenButton
          class="px-2.5 text-base font-normal"
          variant="outline"
          size="sm"
          :loading="busy[`execute:${row.id}`]"
          @click="rowAction(row.id, 'execute')"
        >
          执行
        </VbenButton>
      </template>
    </Grid>
    <Modal :title="title"><Form /></Modal>
    <CronBuilder
      ref="cronBuilder"
      @confirm="(crontab) => formApi.setValues({ crontab })"
    />
  </Page>
</template>
