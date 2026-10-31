<script setup lang="ts">
import type { TableActionItem } from '../../admin/components/table-actions';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { SandboxItem } from '#/api/opensandbox';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, VbenButton } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import {
  ElAlert,
  ElButton,
  ElDialog,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElTag,
  ElTooltip,
} from 'element-plus';

import TableActions from '../../admin/components/table-actions.vue';
import { useAdminGrid } from '../../admin/shared/useAdminGrid';
import { useOpenSandbox } from '../shared/useOpenSandbox';

defineOptions({ name: 'OnlineMySandbox' });

const router = useRouter();
const {
  action,
  actionLoading,
  create,
  overview,
  refresh,
  remove,
  rename,
  sandboxes,
  service,
  setSelected,
  stateLabel,
  stateType,
} = useOpenSandbox();

const createName = ref('');
const createOpen = ref(false);

const statusOptions = [
  { label: '运行中', value: 'Running' },
  { label: '已停止', value: 'Paused' },
  { label: '创建中', value: 'Pending' },
  { label: '失败', value: 'Failed' },
];
const stateRank: Record<string, number> = {
  Running: 0,
  Pending: 1,
  Paused: 2,
  Failed: 3,
  Terminated: 4,
};
const querySchema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: {
      clearable: true,
      placeholder: '搜索名称、ID、镜像或状态',
    },
    fieldName: 'keyword',
    label: '关键词',
  },
  {
    component: 'Select',
    componentProps: { clearable: true, options: statusOptions },
    fieldName: 'status',
    label: '状态',
  },
];

const columns: VxeGridProps['columns'] = [
  {
    field: 'name',
    title: '沙盒名称',
    minWidth: 150,
    slots: { default: 'sandbox' },
  },
  {
    field: 'sandbox_id',
    title: '沙盒 ID',
    minWidth: 190,
    slots: { default: 'sandboxId' },
  },
  {
    field: 'state',
    title: '状态',
    width: 92,
    slots: { default: 'state' },
  },
  {
    field: 'last_activity_time',
    title: '最后活动',
    width: 165,
    slots: { default: 'lastActivity' },
  },
  {
    field: 'operation',
    title: '操作',
    minWidth: 260,
    maxWidth: 380,
    fixed: 'right',
    sortable: false,
    align: 'center',
    slots: { default: 'operation' },
  },
];

const [Grid, gridApi] = useAdminGrid<SandboxItem>({
  columns: () => columns,
  schema: () => querySchema,
  query: querySandboxes,
  gridOptions: {
    minHeight: 420,
    rowConfig: { keyField: 'sandbox_id' },
  },
});

const runningCount = computed(
  () => sandboxes.value.filter((item) => item.state === 'Running').length,
);
const pausedCount = computed(
  () => sandboxes.value.filter((item) => item.state === 'Paused').length,
);
const availableCount = computed(
  () =>
    sandboxes.value.filter(
      (item) => item.state !== 'Failed' && item.state !== 'Terminated',
    ).length,
);
const maxSandboxes = computed(() => overview.value?.max_sandboxes ?? 0);
const limitReached = computed(
  () => maxSandboxes.value > 0 && availableCount.value >= maxSandboxes.value,
);
const serviceAvailable = computed(
  () => overview.value?.service.available ?? false,
);
const serviceConfigured = computed(
  () => overview.value?.service.configured ?? false,
);
const serviceTagType = computed<'danger' | 'info' | 'success' | 'warning'>(
  () => {
    if (!service.value?.configured) return 'info';
    if (service.value.api_enabled === false) return 'warning';
    return service.value.available ? 'success' : 'danger';
  },
);
const serviceLabel = computed(() => {
  if (!service.value) return '检测中';
  if (!service.value.configured) return '未配置';
  if (service.value.api_enabled === false) return 'API 已暂停';
  return service.value.available ? '服务可用' : '服务不可用';
});
const serviceNote = computed(() => {
  if (!service.value) return '正在检测服务状态';
  if (service.value.api_enabled === false) {
    return 'OpenSandbox 进程仍在运行，平台 API 已暂停';
  }
  if (service.value.version) return 'OpenSandbox v' + service.value.version;
  return service.value.configured
    ? 'OpenSandbox 已配置'
    : '尚未配置 OpenSandbox';
});
const serviceAlertTitle = computed(() => {
  if (!service.value?.configured) return '尚未配置 OpenSandbox 服务';
  if (service.value.api_enabled === false) {
    return '沙盒 API 已被管理员暂停，请联系管理员启用。';
  }
  return '无法连接 OpenSandbox 服务，请稍后重试或联系管理员。';
});
const createDisabled = computed(
  () =>
    !serviceConfigured.value || !serviceAvailable.value || limitReached.value,
);
const autoPauseLabel = computed(() => {
  if (!overview.value) return '检测中';
  if (!overview.value.auto_pause_enabled) return '未启用';
  return String(Math.round(overview.value.idle_timeout_seconds / 60)) + ' 分钟';
});

async function querySandboxes(
  {
    page,
    sort,
  }: {
    page: { currentPage: number; pageSize: number };
    sort?: { field: string; order: string };
  },
  values: { keyword?: string; status?: string },
) {
  await refresh();
  const keyword = (values.keyword || '').trim().toLowerCase();
  const filtered = sandboxes.value.filter((item) => {
    if (values.status && item.state !== values.status) return false;
    if (!keyword) return true;
    return [
      item.name,
      item.sandbox_id,
      item.image,
      stateLabel(item.state),
    ].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(keyword),
    );
  });
  if (sort?.field) {
    filtered.sort((left, right) => {
      const factor = sort.order === 'desc' ? -1 : 1;
      let result: number;
      if (sort.field === 'name') {
        result = left.name.localeCompare(right.name, 'zh-CN');
      } else if (sort.field === 'sandbox_id') {
        result = left.sandbox_id.localeCompare(right.sandbox_id);
      } else if (sort.field === 'state') {
        result = (stateRank[left.state] ?? 99) - (stateRank[right.state] ?? 99);
      } else if (sort.field === 'image') {
        result = left.image.localeCompare(right.image, 'zh-CN');
      } else {
        result =
          toTimestamp(left.last_activity_time || left.created_at) -
          toTimestamp(right.last_activity_time || right.created_at);
      }
      return result === 0
        ? left.sandbox_id.localeCompare(right.sandbox_id)
        : result * factor;
    });
  }
  const total = filtered.length;
  const size = page.pageSize;
  const current = page.currentPage;
  const start = (current - 1) * size;
  return {
    items: filtered.slice(start, start + size),
    total,
    page: current,
    size,
    total_pages: Math.ceil(total / size),
  };
}

function toTimestamp(value?: null | string) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatTime(value?: null | string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function actionDisabled(row: Record<string, any>) {
  return (
    actionLoading.value ||
    !serviceAvailable.value ||
    !['Paused', 'Running'].includes(row.state)
  );
}

function rowActions(row: SandboxItem): TableActionItem[] {
  const enterDisabled = row.state !== 'Running' || !serviceAvailable.value;
  const toggleAction: TableActionItem =
    row.state === 'Paused'
      ? {
          key: 'resume',
          label: '启动',
          type: 'success',
          loading: actionLoading.value,
          disabled: actionDisabled(row),
        }
      : row.state === 'Running'
        ? {
            key: 'pause',
            label: '停止',
            type: 'warning',
            loading: actionLoading.value,
            disabled: actionDisabled(row),
          }
        : {
            key: 'pending',
            label: '处理中',
            type: 'info',
            disabled: true,
          };

  return [
    {
      key: 'enter',
      label: '进入',
      disabled: enterDisabled,
      children: [
        { key: 'enter-terminal', label: 'SSH 终端', disabled: enterDisabled },
        { key: 'enter-sftp', label: 'SFTP 文件传输', disabled: enterDisabled },
        { key: 'enter-code', label: '在线代码运行', disabled: enterDisabled },
      ],
    },
    toggleAction,
    {
      key: 'restart',
      label: '重启',
      type: 'primary',
      loading: actionLoading.value,
      disabled:
        row.state !== 'Running' ||
        actionLoading.value ||
        !serviceAvailable.value,
    },
    {
      key: 'rename',
      label: '重命名',
      type: 'primary',
      disabled: actionLoading.value || !serviceAvailable.value,
    },
    {
      key: 'delete',
      label: '删除',
      type: 'danger',
      disabled: actionLoading.value || !serviceAvailable.value,
    },
  ];
}

function handleRowAction(row: SandboxItem, key: string) {
  if (key.startsWith('enter-')) {
    openWorkspace(row, key.slice('enter-'.length));
    return;
  }
  if (key === 'resume' || key === 'pause') {
    void toggleSandbox(row);
    return;
  }
  if (key === 'restart') {
    void restartSandbox(row);
    return;
  }
  if (key === 'rename') {
    void renameSandbox(row);
    return;
  }
  if (key === 'delete') {
    void confirmDelete(row);
  }
}

function openWorkspace(row: Record<string, any>, command: string) {
  const path =
    command === 'sftp'
      ? '/online/sftp'
      : command === 'code'
        ? '/online/code'
        : '/online/terminal';
  setSelected(row.sandbox_id);
  void router.push({ path, query: { sandbox_id: row.sandbox_id } });
}

async function toggleSandbox(row: Record<string, any>) {
  await action(row.state === 'Paused' ? 'resume' : 'pause', row.sandbox_id);
  await gridApi.query();
}

async function restartSandbox(row: Record<string, any>) {
  await action('restart', row.sandbox_id);
  await gridApi.query();
}

async function renameSandbox(row: Record<string, any>) {
  try {
    const result = await ElMessageBox.prompt(
      '请输入新的沙盒名称',
      '重命名沙盒',
      {
        cancelButtonText: '取消',
        confirmButtonText: '保存',
        inputValidator: (value) =>
          Boolean(value && value.trim()) || '沙盒名称不能为空',
        inputValue: row.name,
      },
    );
    if (await rename(row.sandbox_id, result.value.trim())) {
      await gridApi.query();
    }
  } catch {
    // Cancelled by the user.
  }
}

async function confirmDelete(row: Record<string, any>) {
  const message =
    '确定删除沙盒“' +
    String(row.name || '未命名沙盒') +
    '”？沙盒内未导出的文件和运行状态将永久丢失。';
  try {
    await ElMessageBox.confirm(message, '删除沙盒', {
      cancelButtonText: '取消',
      confirmButtonText: '删除',
      type: 'warning',
    });
  } catch {
    return;
  }
  await remove(row.sandbox_id);
  await gridApi.query();
}

async function submitCreate() {
  const name = createName.value.trim();
  if (!name) {
    ElMessage.warning('请输入沙盒名称');
    return;
  }
  if (!(await create(name))) return;
  createOpen.value = false;
  createName.value = '';
  await gridApi.query();
}
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <div class="my-toolbar-actions">
          <VbenButton
            class="gap-2"
            :disabled="createDisabled"
            @click="createOpen = true"
          >
            <Plus class="size-4 shrink-0" aria-hidden="true" />
            新建沙盒
          </VbenButton>
        </div>
      </template>

      <template #table-title>
        <div class="my-overview">
          <span class="overview-item">
            <span class="overview-label">服务</span>
            <ElTag :type="serviceTagType" size="small">
              {{ serviceLabel }}
            </ElTag>
            <span class="overview-note">{{ serviceNote }}</span>
          </span>
          <span class="overview-item">
            <span class="overview-label">运行中</span>
            <strong>{{ runningCount }}</strong>
          </span>
          <span class="overview-item">
            <span class="overview-label">已停止</span>
            <strong>{{ pausedCount }}</strong>
          </span>
          <span class="overview-item">
            <span class="overview-label">配额</span>
            <strong>{{ availableCount }} / {{ maxSandboxes || '—' }}</strong>
          </span>
          <span class="overview-item">
            <span class="overview-label">空闲策略</span>
            <strong>{{ autoPauseLabel }}</strong>
          </span>
        </div>
        <ElAlert
          v-if="service && (!service.configured || !service.available)"
          class="mt-3"
          :title="serviceAlertTitle"
          :type="service.configured ? 'warning' : 'info'"
          show-icon
          :closable="false"
        />
        <ElAlert
          v-else-if="limitReached"
          class="mt-3"
          :title="`已达到每个用户 ${
            maxSandboxes
          } 个沙盒的上限，请先停止并删除不再使用的沙盒。`"
          type="warning"
          show-icon
          :closable="false"
        />
      </template>

      <template #sandbox="{ row }">
        <ElTooltip :content="row.image" placement="top">
          <span class="sandbox-name" :title="row.name">{{ row.name }}</span>
        </ElTooltip>
      </template>

      <template #sandboxId="{ row }">
        <span class="sandbox-id" :title="row.sandbox_id">
          {{ row.sandbox_id }}
        </span>
      </template>

      <template #state="{ row }">
        <ElTag :type="stateType(row.state)" effect="light">
          {{ stateLabel(row.state) }}
        </ElTag>
      </template>

      <template #lastActivity="{ row }">
        {{ formatTime(row.last_activity_time || row.created_at) }}
      </template>

      <template #operation="{ row }">
        <TableActions
          :actions="rowActions(row)"
          @run="(key) => handleRowAction(row, key)"
        />
      </template>
    </Grid>

    <ElDialog
      v-model="createOpen"
      title="新建沙盒"
      width="460px"
      :close-on-click-modal="false"
      @closed="createName = ''"
    >
      <p class="dialog-tip">
        沙盒用于隔离终端、文件和代码运行。创建后会自动进入当前工作区。
      </p>
      <ElInput
        v-model="createName"
        maxlength="64"
        placeholder="例如：python-lab"
        show-word-limit
        clearable
        @keyup.enter="submitCreate"
      />
      <template #footer>
        <ElButton @click="createOpen = false">取消</ElButton>
        <ElButton
          type="primary"
          :loading="actionLoading"
          :disabled="limitReached"
          @click="submitCreate"
        >
          创建
        </ElButton>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
.my-toolbar-actions {
  margin-top: 10px;
}

.my-overview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 22px;
  width: 100%;
}

.overview-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.overview-label {
  color: var(--el-text-color-secondary);
}

.overview-note {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.sandbox-name {
  display: block;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sandbox-id {
  display: block;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-tip {
  margin: 0 0 14px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
}
</style>
