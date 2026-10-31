<script setup lang="ts">
import type { TableActionItem } from '../../components/table-actions';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { CommandLogDetail } from '#/api/opensandbox';

import { computed, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { ElTag } from 'element-plus';

import { getAdminCommandsApi } from '#/api/opensandbox';

import DetailTable from '../../components/detail-table.vue';
import TableActions from '../../components/table-actions.vue';
import { pagedQuery, useAdminGrid } from '../../shared/useAdminGrid';

defineOptions({ name: 'AdminSandboxAudit' });

const statusOptions = [
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
  { label: '错误', value: 'error' },
];
const querySchema: VbenFormSchema[] = [
  { component: 'Input', fieldName: 'username', label: '用户名' },
  { component: 'Input', fieldName: 'sandbox_id', label: '沙盒 ID' },
  { component: 'Input', fieldName: 'keyword', label: '命令关键词' },
  {
    component: 'Select',
    componentProps: { clearable: true, options: statusOptions },
    fieldName: 'status',
    label: '执行状态',
  },
  {
    component: 'DatePicker',
    componentProps: {
      class: 'w-full',
      clearable: true,
      type: 'datetime',
      valueFormat: 'YYYY-MM-DD HH:mm:ss',
    },
    fieldName: 'start_time',
    label: '开始时间',
  },
  {
    component: 'DatePicker',
    componentProps: {
      class: 'w-full',
      clearable: true,
      type: 'datetime',
      valueFormat: 'YYYY-MM-DD HH:mm:ss',
    },
    fieldName: 'end_time',
    label: '结束时间',
  },
];

const detailActions: TableActionItem[] = [
  { key: 'details', label: '详情', type: 'primary' },
];

function handleRowAction(row: CommandLogDetail, key: string) {
  if (key === 'details') {
    current.value = row;
    drawerApi.open();
  }
}

const columns: VxeGridProps['columns'] = [
  { field: 'username', title: '用户', width: 110 },
  {
    field: 'sandbox_name',
    title: '沙盒',
    minWidth: 180,
    slots: { default: 'sandbox' },
  },
  {
    field: 'source',
    title: '来源',
    width: 90,
    slots: { default: 'source' },
  },
  {
    field: 'command',
    title: '命令',
    minWidth: 300,
    slots: { default: 'command' },
  },
  {
    field: 'status',
    title: '状态',
    width: 90,
    slots: { default: 'status' },
  },
  { field: 'exit_code', title: '退出码', width: 80 },
  {
    field: 'duration_ms',
    title: '耗时',
    width: 100,
    slots: { default: 'duration' },
  },
  { field: 'created_time', title: '执行时间', width: 165 },
  {
    field: 'operation',
    title: '操作',
    minWidth: 96,
    maxWidth: 160,
    fixed: 'right',
    align: 'center',
    sortable: false,
    slots: { default: 'operation' },
  },
];

const [Grid] = useAdminGrid<CommandLogDetail>({
  columns: () => columns,
  schema: () => querySchema,
  query: pagedQuery(getAdminCommandsApi),
  gridOptions: {
    minHeight: 420,
    rowConfig: { keyField: 'id' },
  },
});

const current = ref<CommandLogDetail>();
const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[980px] max-w-full',
  contentClass: 'p-4',
  destroyOnClose: true,
  footer: false,
});

const detailItems = computed(() => {
  const row = current.value;
  return [
    { key: 'username', label: '用户', value: row?.username },
    { key: 'sandbox_name', label: '沙盒名称', value: row?.sandbox_name },
    {
      key: 'sandbox_id',
      label: '沙盒 ID',
      value: row?.sandbox_id,
      fullWidth: true,
    },
    { key: 'source', label: '来源', value: sourceLabel(row?.source) },
    { key: 'status', label: '状态', value: statusLabel(row?.status) },
    {
      key: 'session_id',
      label: '会话 ID',
      value: row?.session_id,
      fullWidth: true,
    },
    { key: 'command', label: '命令', value: row?.command, fullWidth: true },
    { key: 'cwd', label: '工作目录', value: row?.cwd },
    { key: 'exit_code', label: '退出码', value: row?.exit_code },
    {
      key: 'duration_ms',
      label: '耗时',
      value: formatDuration(row?.duration_ms),
    },
    { key: 'created_time', label: '执行时间', value: row?.created_time },
    { key: 'truncated', label: '输出截断', value: row?.truncated },
    { key: 'stdout', label: '标准输出', value: row?.stdout, fullWidth: true },
    { key: 'stderr', label: '标准错误', value: row?.stderr, fullWidth: true },
  ];
});

function sourceLabel(source?: string) {
  const map: Record<string, string> = {
    code: '代码运行',
    file: '文件操作',
    terminal: '终端',
  };
  return map[source || ''] || source || '—';
}

function statusLabel(status?: string) {
  const map: Record<string, string> = {
    error: '错误',
    failed: '失败',
    success: '成功',
  };
  return map[status || ''] || status || '—';
}

function statusType(status?: string) {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'danger';
  return 'warning';
}

function formatDuration(value?: number) {
  if (value === undefined || value === null) return '—';
  return value < 1000 ? value + ' ms' : (value / 1000).toFixed(2) + ' s';
}

function formatTime(value?: null | string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #sandbox="{ row }">
        <div class="sandbox-cell">
          <span class="sandbox-name" :title="row.sandbox_name">
            {{ row.sandbox_name }}
          </span>
          <span class="sandbox-id" :title="row.sandbox_id">
            {{ row.sandbox_id }}
          </span>
        </div>
      </template>

      <template #source="{ row }">
        <ElTag size="small" effect="plain">
          {{ sourceLabel(row.source) }}
        </ElTag>
      </template>

      <template #command="{ row }">
        <code class="command-text" :title="row.command">
          {{ row.command }}
        </code>
      </template>

      <template #status="{ row }">
        <ElTag :type="statusType(row.status)" size="small">
          {{ statusLabel(row.status) }}
        </ElTag>
      </template>

      <template #duration="{ row }">
        {{ formatDuration(row.duration_ms) }}
      </template>

      <template #operation="{ row }">
        <TableActions
          :actions="detailActions"
          @run="(key) => handleRowAction(row, key)"
        />
      </template>
    </Grid>

    <Drawer title="命令审计详情">
      <DetailTable :items="detailItems">
        <template #source>
          <ElTag size="small" effect="plain">
            {{ sourceLabel(current?.source) }}
          </ElTag>
        </template>
        <template #status>
          <ElTag :type="statusType(current?.status)" size="small">
            {{ statusLabel(current?.status) }}
          </ElTag>
        </template>
        <template #truncated>
          <ElTag
            :type="current?.truncated ? 'warning' : 'success'"
            size="small"
          >
            {{ current?.truncated ? '是' : '否' }}
          </ElTag>
        </template>
        <template #command>
          <pre class="detail-output">{{ current?.command }}</pre>
        </template>
        <template #stdout>
          <pre class="detail-output">{{ current?.stdout || '（空）' }}</pre>
        </template>
        <template #stderr>
          <pre class="detail-output">{{ current?.stderr || '（空）' }}</pre>
        </template>
        <template #created_time>
          {{ formatTime(current?.created_time) }}
        </template>
      </DetailTable>
    </Drawer>
  </Page>
</template>

<style scoped>
.sandbox-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.sandbox-name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sandbox-id {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-text {
  display: block;
  overflow: hidden;
  color: var(--el-text-color-regular);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-output {
  max-height: 280px;
  margin: 0;
  overflow: auto;
  padding: 10px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
