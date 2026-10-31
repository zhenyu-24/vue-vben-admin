<script setup lang="ts">
import type { TableActionItem } from '../components/table-actions';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type {
  AdminOverview,
  AdminUserOption,
  SandboxItem,
} from '#/api/opensandbox';

import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Plus } from '@element-plus/icons-vue';
import {
  ElButton,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTag,
  ElTooltip,
} from 'element-plus';

import {
  createAdminSandboxApi,
  deleteAdminSandboxApi,
  getAdminOverviewApi,
  getAdminSandboxesApi,
  getAdminUsersApi,
  pauseAdminSandboxApi,
  renameAdminSandboxApi,
  restartAdminSandboxApi,
  resumeAdminSandboxApi,
  startOpenSandboxServiceApi,
  stopOpenSandboxServiceApi,
  syncAdminSandboxesApi,
} from '#/api/opensandbox';

import TableActions from '../components/table-actions.vue';
import { pagedQuery, useAdminGrid } from '../shared/useAdminGrid';

defineOptions({ name: 'AdminSandbox' });

type TagType = 'danger' | 'info' | 'primary' | 'success' | 'warning';

const router = useRouter();
const overview = ref<AdminOverview>();
const users = ref<AdminUserOption[]>([]);
const createOpen = ref(false);
const createLoading = ref(false);
const serviceBusy = ref(false);
const bulkLoading = ref(false);
const busy = ref<Record<string, boolean>>({});
const selected = ref<SandboxItem[]>([]);
const createForm = reactive({
  image: '',
  name: '',
  owner_id: null as null | number | string,
});

const statusOptions = [
  { label: '运行中', value: 'Running' },
  { label: '已停止', value: 'Paused' },
  { label: '创建中', value: 'Pending' },
  { label: '失败', value: 'Failed' },
];
const querySchema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: { clearable: true, placeholder: '按用户名筛选' },
    fieldName: 'username',
    label: '所属用户',
  },
  {
    component: 'Select',
    componentProps: { clearable: true, options: statusOptions },
    fieldName: 'status',
    label: '状态',
  },
  {
    component: 'Input',
    componentProps: { clearable: true, placeholder: '沙盒名称关键词' },
    fieldName: 'keyword',
    label: '关键词',
  },
];

const columns: VxeGridProps['columns'] = [
  { type: 'checkbox', fixed: 'left', width: 45 },
  {
    field: 'name',
    title: '沙盒名称',
    minWidth: 140,
    slots: { default: 'sandbox' },
  },
  {
    field: 'sandbox_id',
    title: '沙盒 ID',
    minWidth: 190,
    sortable: false,
    slots: { default: 'sandboxId' },
  },
  {
    field: 'owner_username',
    title: '用户名',
    minWidth: 100,
    sortable: false,
  },
  {
    field: 'state',
    title: '状态',
    width: 92,
    sortable: false,
    slots: { default: 'state' },
  },
  {
    field: 'last_activity_time',
    title: '最后活动',
    width: 160,
    sortable: true,
    slots: { default: 'lastActivity' },
  },
  {
    field: 'operation',
    title: '操作',
    minWidth: 260,
    maxWidth: 380,
    fixed: 'right',
    sortable: false,
    slots: { default: 'operation' },
    align: 'center',
  },
];

const [Grid, gridApi] = useAdminGrid<SandboxItem>({
  columns: () => columns,
  schema: () => querySchema,
  query: pagedQuery(getAdminSandboxesApi),
  onQuery: handleQuery,
  gridOptions: {
    minHeight: 420,
    rowConfig: { keyField: 'sandbox_id' },
    checkboxConfig: { highlight: true },
  },
  gridEvents: {
    checkboxChange: () => {
      selected.value = gridApi.grid.getCheckboxRecords();
    },
    checkboxAll: () => {
      selected.value = gridApi.grid.getCheckboxRecords();
    },
  },
});

const serviceAvailable = computed(
  () => overview.value?.service.available ?? false,
);
const serviceConfigured = computed(
  () => overview.value?.service.configured ?? false,
);
const apiEnabled = computed(
  () => overview.value?.service.api_enabled ?? true,
);
const serverAvailable = computed(
  () =>
    overview.value?.service.server_available ??
    overview.value?.service.available ??
    false,
);
const serviceStateLabel = computed(() => {
  if (!serviceConfigured.value) return '未配置';
  if (!apiEnabled.value) return '已暂停';
  return serverAvailable.value ? '可用' : '进程不可达';
});
const serviceStateType = computed<TagType>(() => {
  if (!serviceConfigured.value) return 'info';
  if (!apiEnabled.value) return 'warning';
  return serverAvailable.value ? 'success' : 'danger';
});
const serviceStateNote = computed(() => {
  if (!serviceConfigured.value) return '尚未配置 OpenSandbox';
  if (!apiEnabled.value) return 'API 已暂停，OpenSandbox 进程未停止';
  if (serverAvailable.value && overview.value?.service.version) {
    return `v${overview.value.service.version}`;
  }
  return 'OpenSandbox 进程不可达';
});
const createDisabled = computed(
  () => !serviceConfigured.value || !serviceAvailable.value,
);

async function handleQuery() {
  selected.value = [];
  await loadOverview();
}

async function bulkAction(command: 'delete' | 'restart' | 'start' | 'stop') {
  if (selected.value.length === 0 || bulkLoading.value) return;
  if (!serviceAvailable.value) {
    ElMessage.warning('沙盒 API 已暂停，无法执行批量操作');
    return;
  }
  const rows = selected.value.filter((row) => {
    if (command === 'start') return row.state === 'Paused';
    if (command === 'stop' || command === 'restart') {
      return row.state === 'Running';
    }
    return true;
  });
  if (rows.length === 0) {
    ElMessage.warning('选中的沙盒中没有可执行该操作的状态');
    return;
  }
  if (command === 'delete') {
    try {
      await ElMessageBox.confirm(
        '确定删除选中的 ' + rows.length + ' 个沙盒？该操作不可恢复。',
        '批量删除沙盒',
        {
          cancelButtonText: '取消',
          confirmButtonText: '删除',
          type: 'warning',
        },
      );
    } catch {
      return;
    }
  }
  bulkLoading.value = true;
  let success = 0;
  for (const row of rows) {
    try {
      await (command === 'delete'
        ? deleteAdminSandboxApi(row.sandbox_id)
        : command === 'start'
          ? resumeAdminSandboxApi(row.sandbox_id)
          : command === 'stop'
            ? pauseAdminSandboxApi(row.sandbox_id)
            : restartAdminSandboxApi(row.sandbox_id));
      success += 1;
    } catch {
      // Continue remaining rows; request errors are shown by the interceptor.
    }
  }
  bulkLoading.value = false;
  selected.value = [];
  await gridApi.query();
  ElMessage.success('批量操作完成：成功 ' + success + ' / ' + rows.length);
}

async function loadOverview() {
  try {
    overview.value = await getAdminOverviewApi();
  } catch {
    // Request errors are handled by the shared interceptor.
  }
}

function stateLabel(state?: string) {
  const map: Record<string, string> = {
    Failed: '失败',
    Paused: '已停止',
    Pending: '创建中',
    Running: '运行中',
    Terminated: '已删除',
  };
  return map[state || ''] || state || '-';
}

function stateType(state?: string): TagType {
  const map: Record<string, TagType> = {
    Failed: 'danger',
    Paused: 'warning',
    Pending: 'info',
    Running: 'success',
    Terminated: 'info',
  };
  return map[state || ''] || 'info';
}

function formatTime(value?: null | string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function isBusy(kind: string, row: Record<string, any>) {
  return Boolean(busy.value[kind + ':' + row.sandbox_id]);
}

function setBusy(kind: string, row: Record<string, any>, value: boolean) {
  busy.value[kind + ':' + row.sandbox_id] = value;
}

function openWorkspace(row: Record<string, any>, command: string) {
  const path =
    command === 'sftp'
      ? '/online/sftp'
      : command === 'code'
        ? '/online/code'
        : '/online/terminal';
  void router.push({ path, query: { sandbox_id: row.sandbox_id } });
}

async function runAction(
  row: Record<string, any>,
  kind: 'pause' | 'restart' | 'resume',
) {
  const key = kind + ':' + row.sandbox_id;
  if (busy.value[key]) return;
  setBusy(kind, row, true);
  try {
    await (kind === 'pause'
      ? pauseAdminSandboxApi(row.sandbox_id)
      : kind === 'restart'
        ? restartAdminSandboxApi(row.sandbox_id)
        : resumeAdminSandboxApi(row.sandbox_id));
    ElMessage.success(
      kind === 'pause'
        ? '沙盒已停止'
        : kind === 'restart'
          ? '沙盒已重启'
          : '沙盒已启动',
    );
    await gridApi.query();
  } catch {
    // Request errors are handled by the shared interceptor.
  } finally {
    setBusy(kind, row, false);
  }
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
    const key = 'rename:' + row.sandbox_id;
    if (busy.value[key]) return;
    busy.value[key] = true;
    try {
      await renameAdminSandboxApi(row.sandbox_id, result.value.trim());
      ElMessage.success('沙盒已重命名');
      await gridApi.query();
    } finally {
      busy.value[key] = false;
    }
  } catch {
    // Cancelled by the user.
  }
}

async function removeSandbox(row: Record<string, any>) {
  try {
    await ElMessageBox.confirm(
      '确定删除沙盒“' + row.name + '”？该用户未导出的文件将永久丢失。',
      '删除沙盒',
      {
        cancelButtonText: '取消',
        confirmButtonText: '删除',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  const key = 'delete:' + row.sandbox_id;
  if (busy.value[key]) return;
  busy.value[key] = true;
  try {
    await deleteAdminSandboxApi(row.sandbox_id);
    ElMessage.success('沙盒已删除');
    await gridApi.query();
  } catch {
    // Request errors are handled by the shared interceptor.
  } finally {
    busy.value[key] = false;
  }
}

function rowActions(row: SandboxItem): TableActionItem[] {
  const enterDisabled = row.state !== 'Running' || !serviceAvailable.value;
  const toggleAction: TableActionItem =
    row.state === 'Paused'
      ? {
          key: 'resume',
          label: '启动',
          type: 'success',
          loading: isBusy('resume', row),
          disabled: !serviceAvailable.value,
        }
      : row.state === 'Running'
        ? {
            key: 'pause',
            label: '停止',
            type: 'warning',
            loading: isBusy('pause', row),
            disabled: !serviceAvailable.value,
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
      loading: isBusy('restart', row),
      disabled: row.state !== 'Running' || !serviceAvailable.value,
    },
    {
      key: 'rename',
      label: '重命名',
      type: 'primary',
      loading: isBusy('rename', row),
      disabled: !serviceAvailable.value,
    },
    {
      key: 'delete',
      label: '删除',
      type: 'danger',
      loading: isBusy('delete', row),
      disabled: !serviceAvailable.value,
    },
  ];
}

function handleRowAction(row: SandboxItem, key: string) {
  if (key.startsWith('enter-')) {
    openWorkspace(row, key.slice('enter-'.length));
    return;
  }
  if (key === 'resume' || key === 'pause' || key === 'restart') {
    void runAction(row, key);
    return;
  }
  if (key === 'rename') {
    void renameSandbox(row);
    return;
  }
  if (key === 'delete') {
    void removeSandbox(row);
  }
}

async function loadUsers() {
  try {
    users.value = await getAdminUsersApi();
  } catch {
    users.value = [];
  }
}

async function openCreate() {
  await loadUsers();
  createOpen.value = true;
}

function resetCreate() {
  createForm.image = '';
  createForm.name = '';
  createForm.owner_id = null;
}

async function submitCreate() {
  if (createForm.owner_id === null) {
    ElMessage.warning('请选择沙盒所属用户');
    return;
  }
  createLoading.value = true;
  try {
    await createAdminSandboxApi({
      image: createForm.image.trim() || undefined,
      name: createForm.name.trim() || undefined,
      owner_id: createForm.owner_id,
    });
    ElMessage.success('沙盒创建成功');
    createOpen.value = false;
    resetCreate();
    await gridApi.query();
  } catch {
    // Request errors are handled by the shared interceptor.
  } finally {
    createLoading.value = false;
  }
}

async function syncSandboxes() {
  if (!serviceAvailable.value) {
    ElMessage.warning('沙盒 API 已暂停，无法同步远端沙盒');
    return;
  }
  try {
    const count = await syncAdminSandboxesApi();
    ElMessage.success('已同步 ' + count + ' 个沙盒');
    await gridApi.query();
  } catch {
    // Request errors are handled by the shared interceptor.
  }
}

async function controlService(action: 'start' | 'stop') {
  const title = action === 'start' ? '启用沙盒 API' : '暂停沙盒 API';
  try {
    await ElMessageBox.confirm(
      action === 'start'
        ? '启用后用户可以继续创建、进入和操作沙盒。该操作不会启动 OpenSandbox 进程。'
        : '暂停后所有沙盒操作 API 将被禁用，但 OpenSandbox 进程和已有沙盒不会被删除。',
      title,
      {
        cancelButtonText: '取消',
        confirmButtonText: '确定',
        type: action === 'stop' ? 'warning' : 'info',
      },
    );
  } catch {
    return;
  }
  serviceBusy.value = true;
  try {
    const result =
      action === 'start'
        ? await startOpenSandboxServiceApi()
        : await stopOpenSandboxServiceApi();
    if (result.success) {
      if (action === 'start' && !result.status.server_available) {
        ElMessage.warning(result.output);
      } else {
        ElMessage.success(
          action === 'start' ? '沙盒 API 已启用' : '沙盒 API 已暂停',
        );
      }
    } else {
      ElMessage.error(result.output || '沙盒 API 操作失败');
    }
    await loadOverview();
  } catch {
    // Request errors are handled by the shared interceptor.
  } finally {
    serviceBusy.value = false;
  }
  void gridApi.query();
}
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <div class="admin-toolbar-actions">
          <div class="admin-primary-actions">
            <ElButton
              class="admin-action-button"
              type="primary"
              :icon="Plus"
              :disabled="createDisabled"
              @click="openCreate"
            >
              新建沙盒
            </ElButton>
            <ElButton
              class="admin-action-button"
              :disabled="serviceBusy || !serviceAvailable"
              @click="syncSandboxes"
            >
              同步远端
            </ElButton>
            <ElButton
              class="admin-action-button"
              :disabled="serviceBusy || !serviceConfigured || apiEnabled"
              :loading="serviceBusy"
              @click="controlService('start')"
            >
              启用 API
            </ElButton>
            <ElButton
              class="admin-action-button"
              :disabled="serviceBusy || !apiEnabled"
              :loading="serviceBusy"
              @click="controlService('stop')"
            >
              暂停 API
            </ElButton>
          </div>
          <ElDropdown
            v-if="selected.length > 0"
            trigger="click"
            :disabled="!serviceAvailable"
            @command="bulkAction"
          >
            <ElButton plain type="primary" :disabled="!serviceAvailable">
              批量操作 ({{ selected.length }})
            </ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="start">批量启动</ElDropdownItem>
                <ElDropdownItem command="stop">批量停止</ElDropdownItem>
                <ElDropdownItem command="restart">批量重启</ElDropdownItem>
                <ElDropdownItem command="delete" divided>
                  批量删除
                </ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </template>

      <template #table-title>
        <div class="admin-overview-strip">
          <span class="overview-item">
            <span class="overview-label">API</span>
            <ElTag :type="serviceStateType" size="small">
              {{ serviceStateLabel }}
            </ElTag>
            <span class="overview-note">{{ serviceStateNote }}</span>
          </span>
          <span class="overview-item">
            <span class="overview-label">沙盒总数</span>
            <strong>{{ overview?.total_sandboxes ?? '—' }}</strong>
          </span>
          <span class="overview-item">
            <span class="overview-label">运行中</span>
            <strong class="text-emerald-600">
              {{ overview?.running_sandboxes ?? '—' }}
            </strong>
          </span>
          <span class="overview-item">
            <span class="overview-label">已停止</span>
            <strong class="text-amber-600">
              {{ overview?.paused_sandboxes ?? '—' }}
            </strong>
          </span>
          <span class="overview-item">
            <span class="overview-label">用户数</span>
            <strong>{{ overview?.total_users ?? '—' }}</strong>
          </span>
        </div>
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
        {{ formatTime(row.last_activity_time) }}
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
      title="管理员创建沙盒"
      width="520px"
      :close-on-click-modal="false"
      @closed="resetCreate"
    >
      <ElForm label-position="top">
        <ElFormItem label="所属用户" required>
          <ElSelect
            v-model="createForm.owner_id"
            class="w-full"
            filterable
            placeholder="请选择用户"
          >
            <ElOption
              v-for="user in users"
              :key="user.id"
              :label="`${user.username} · ${user.nickname}`"
              :value="user.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="沙盒名称">
          <ElInput
            v-model="createForm.name"
            maxlength="64"
            placeholder="例如：python-lab"
            show-word-limit
          />
        </ElFormItem>
        <ElFormItem label="自定义镜像">
          <ElInput
            v-model="createForm.image"
            maxlength="512"
            placeholder="留空使用默认镜像"
            clearable
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton :disabled="createLoading" @click="createOpen = false">
          取消
        </ElButton>
        <ElButton type="primary" :loading="createLoading" @click="submitCreate">
          创建
        </ElButton>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
.admin-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.admin-primary-actions {
  display: grid;
  grid-template-columns: repeat(4, 118px);
  gap: 8px;
}

.admin-primary-actions > * {
  width: 100%;
}

.admin-action-button {
  margin-left: 0 !important;
  justify-content: center;
}

.admin-overview-strip {
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
</style>
