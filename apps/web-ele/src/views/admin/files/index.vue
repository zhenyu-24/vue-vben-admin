<script setup lang="ts">
import type {
  FileFolder,
  FileListParams,
  ManagedFile,
  UploadType,
} from '#/api/core/files';

import { computed, onBeforeUnmount, ref } from 'vue';

import { Page, VbenButton, VbenIconButton } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  ElAlert,
  ElBreadcrumb,
  ElBreadcrumbItem,
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElForm,
  ElFormItem,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElProgress,
  ElSelect,
  ElSwitch,
  ElTag,
} from 'element-plus';

import {
  deleteManagedFileApi,
  deleteManagedFilesApi,
  downloadFileToDiskApi,
  downloadManagedFileApi,
  getFileBrowseApi,
  getManagedFileApi,
  getResourceFoldersApi,
  replaceManagedFileApi,
  updateFileVisibilityApi,
  uploadFileApi,
} from '#/api/core/files';

import { useAdminGrid } from '../shared/useAdminGrid';

defineOptions({ name: 'AdminFiles' });
type Entry = (
  | { file: ManagedFile; folder?: never }
  | { file?: never; folder: FileFolder }
) & { id: string };
const types: { label: string; value: UploadType }[] = [
  { label: '普通文件', value: 'file' },
  { label: '头像', value: 'avatar' },
  { label: '资源', value: 'resource' },
  { label: '文档', value: 'document' },
  { label: '图片', value: 'image' },
  { label: '音频', value: 'audio' },
  { label: '视频', value: 'video' },
];
const path = ref('');
const searching = ref(false);
const crumbs = computed(() =>
  path.value
    .split('/')
    .filter(Boolean)
    .map((name, index, parts) => ({
      name,
      path: parts.slice(0, index + 1).join('/'),
    })),
);
const failed = ref(false);
const detail = ref<ManagedFile>();
const detailOpen = ref(false);
const detailLoading = ref(false);
const busy = ref(new Set<string>());
const uploadOpen = ref(false);
const replacement = ref<ManagedFile>();
const uploadType = ref<UploadType>('file');
const targetPath = ref('');
const uploadFolders = ref<string[]>([]);
const publicUpload = ref(false);
const chosenFile = ref<File>();
const fileInput = ref<HTMLInputElement>();
const selected = ref<Entry[]>([]);
const deleting = ref(false);
const uploading = ref(false);
const progress = ref(0);
let transfer: AbortController | undefined;
let detailSequence = 0;
const [Grid, gridApi] = useAdminGrid<Entry>({
  columns: () => [
    { type: 'checkbox', width: 45 },
    {
      field: 'file.original_name',
      title: '文件名称',
      minWidth: 260,
      slots: { default: 'name' },
    },
    {
      field: 'file.upload_type',
      title: '类型',
      width: 100,
      slots: { default: 'type' },
    },
    {
      field: 'file.size',
      title: '大小',
      width: 120,
      slots: { default: 'size' },
    },
    { field: 'file.username', title: '上传者', minWidth: 130 },
    {
      field: 'file.storage_path',
      title: '所在路径',
      minWidth: 240,
      sortable: false,
    },
    {
      field: 'file.is_public',
      title: '可见性',
      width: 100,
      slots: { default: 'visibility' },
    },
    {
      field: 'file.exists',
      title: '存储状态',
      width: 120,
      slots: { default: 'status' },
    },
    { field: 'file.created_time', title: '上传时间', width: 180 },
    {
      field: 'operation',
      title: '操作',
      width: 170,
      slots: { default: 'operation' },
    },
  ],
  schema: () => [
    {
      component: 'Input',
      fieldName: 'name',
      label: '文件名',
      componentProps: { placeholder: '搜索文件名', clearable: true },
    },
    {
      component: 'Select',
      fieldName: 'upload_type',
      label: '类型',
      componentProps: { clearable: true, options: types },
    },
    {
      component: 'Input',
      fieldName: 'username',
      label: '上传者',
      componentProps: { placeholder: '用户名', clearable: true },
    },
    {
      component: 'Select',
      fieldName: 'visibility',
      label: '可见性',
      componentProps: {
        clearable: true,
        options: [
          { label: '公开', value: 'public' },
          { label: '私有', value: 'private' },
        ],
      },
    },
  ],
  gridOptions: {
    checkboxConfig: {
      checkMethod: ({ row }) =>
        Boolean(row.file && !row.file.owner_uses_avatar),
    },
  },
  gridEvents: {
    checkboxChange: () => {
      selected.value = gridApi.grid.getCheckboxRecords();
    },
    checkboxAll: () => {
      selected.value = gridApi.grid.getCheckboxRecords();
    },
  },
  onQuery: async () => {
    selected.value = [];
    await gridApi.grid.clearCheckboxRow();
  },
  query: async (
    { page, sort },
    values: FileListParams & { visibility?: string },
  ) => {
    failed.value = false;
    searching.value = Boolean(
      values.name || values.username || values.upload_type || values.visibility,
    );
    try {
      const result = await getFileBrowseApi({
        path: searching.value ? '' : path.value,
        recursive: searching.value,
        sort_by: sort?.order ? sort.field : undefined,
        sort_order: sort?.order || undefined,
        name: values.name || undefined,
        username: values.username || undefined,
        upload_type: values.upload_type || undefined,
        is_public: values.visibility
          ? values.visibility === 'public'
          : undefined,
        page: page.currentPage,
        size: page.pageSize,
      });
      gridApi.setGridOptions({
        pagerConfig: { enabled: result.files.total > 0 },
      });
      return {
        items: [
          ...result.folders.map((folder) => ({
            id: `folder:${folder.path}`,
            folder,
          })),
          ...result.files.items.map((file) => ({
            id: String(file.file_id),
            file,
          })),
        ],
        total: result.files.total,
      };
    } catch (error) {
      failed.value = true;
      throw error;
    }
  },
});
async function removeSelected() {
  if (!selected.value.length || deleting.value) return;
  try {
    await ElMessageBox.confirm(
      `永久删除已选择的 ${selected.value.length} 个文件？此操作不可恢复。`,
      '批量删除',
      { type: 'warning' },
    );
  } catch {
    return;
  }
  deleting.value = true;
  try {
    const result = await deleteManagedFilesApi(
      selected.value.map((row) => row.file!.file_id),
    );
    if (result.failed.length) {
      ElMessage.warning(
        `已删除 ${result.deleted.length} 个，失败 ${result.failed.length} 个：${result.failed.map((item) => item.message).join('；')}`,
      );
    } else ElMessage.success(`已删除 ${result.deleted.length} 个文件`);
    await gridApi.query();
  } finally {
    deleting.value = false;
  }
}
async function changeVisibility(row: ManagedFile) {
  const key = String(row.file_id);
  if (busy.value.has(key)) return;
  try {
    await ElMessageBox.confirm(
      `将“${row.original_name}”设为${row.is_public ? '私有' : '公开'}？访问路径会随之更新，原有外部引用需要同步调整。`,
      '修改可见性',
      { type: 'warning' },
    );
  } catch {
    return;
  }
  busy.value.add(key);
  try {
    const updated = await updateFileVisibilityApi(row.file_id, !row.is_public);
    if (detail.value?.file_id === row.file_id) detail.value = updated;
    await gridApi.query();
  } finally {
    busy.value.delete(key);
  }
}
function navigate(next: string) {
  path.value = next;
  void gridApi.reload();
}
function label(type: string) {
  return types.find((item) => item.value === type)?.label || type;
}
function bytes(value: number) {
  if (value < 1024) return `${value} B`;
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 3);
  return `${(value / 1024 ** unit).toFixed(1)} ${['B', 'KB', 'MB', 'GB'][unit]}`;
}
async function showDetail(row: ManagedFile) {
  const sequence = ++detailSequence;
  detail.value = undefined;
  detailOpen.value = true;
  detailLoading.value = true;
  try {
    const result = await getManagedFileApi(row.file_id);
    if (sequence === detailSequence) detail.value = result;
  } catch {
    if (sequence === detailSequence) detailOpen.value = false;
  } finally {
    if (sequence === detailSequence) detailLoading.value = false;
  }
}
async function remove(row: ManagedFile) {
  try {
    await ElMessageBox.confirm(
      `永久删除“${row.original_name}”及其存储文件？引用此文件的业务将无法继续访问，且无法恢复。`,
      '删除文件',
      {
        type: 'warning',
        confirmButtonText: '永久删除',
        cancelButtonText: '取消',
      },
    );
  } catch {
    return;
  }
  const key = String(row.file_id);
  busy.value.add(key);
  try {
    await deleteManagedFileApi(row.file_id);
    ElMessage.success('文件已删除');
    if (detail.value?.file_id === row.file_id) detailOpen.value = false;
    await gridApi.query();
  } finally {
    busy.value.delete(key);
  }
}
async function download(row: ManagedFile) {
  const key = String(row.file_id);
  if (busy.value.has(key)) return;
  busy.value.add(key);
  try {
    const picker = (
      window as unknown as {
        showSaveFilePicker?: (options: {
          suggestedName: string;
        }) => Promise<FileSystemFileHandle>;
      }
    ).showSaveFilePicker;
    if (picker) {
      const destination = await picker.call(window, {
        suggestedName: row.original_name,
      });
      await downloadFileToDiskApi(row.file_id, destination, { managed: true });
    } else {
      if (row.size > 100 * 1024 * 1024) {
        ElMessage.warning(
          '大文件下载需要支持保存文件功能的 Chrome 或 Edge 浏览器',
        );
        return;
      }
      const blob = await downloadManagedFileApi(row.file_id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = row.original_name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError')
      ElMessage.error('下载未完成，请重试');
  } finally {
    busy.value.delete(key);
  }
}
function openUpload(target?: ManagedFile) {
  replacement.value = target;
  chosenFile.value = undefined;
  uploadType.value = target
    ? target.upload_type === 'avatar'
      ? 'image'
      : target.upload_type
    : 'file';
  publicUpload.value = false;
  targetPath.value = '';
  uploadFolders.value = [];
  if (!target) void loadUploadFolders();
  uploadOpen.value = true;
}
let folderRequest = 0;
async function loadUploadFolders() {
  const current = ++folderRequest;
  try {
    const folders = await getResourceFoldersApi(publicUpload.value);
    if (current === folderRequest) uploadFolders.value = folders;
  } catch {
    if (current === folderRequest) uploadFolders.value = [];
  }
}
function choose(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (
    file &&
    replacement.value &&
    file.name.split('.').pop()?.toLowerCase() !==
      replacement.value.extension.toLowerCase()
  ) {
    ElMessage.warning(`请选择 .${replacement.value.extension} 文件`);
    (event.target as HTMLInputElement).value = '';
    chosenFile.value = undefined;
    return;
  }
  chosenFile.value = file;
}
async function upload() {
  if (!chosenFile.value || uploading.value) return;
  uploading.value = true;
  progress.value = 0;
  transfer = new AbortController();
  let uploaded = false;
  try {
    const result = await uploadFileApi(chosenFile.value, {
      upload_type: uploadType.value,
      target_path:
        !replacement.value && uploadType.value === 'resource'
          ? targetPath.value.trim() || undefined
          : undefined,
      is_public: replacement.value ? false : publicUpload.value,
      signal: transfer.signal,
      onProgress: (done, all) => {
        progress.value = Math.round((done / all) * 100);
      },
    });
    uploaded = true;
    if (replacement.value) {
      const updated = await replaceManagedFileApi(
        replacement.value.file_id,
        result.file_id,
      );
      if (detail.value?.file_id === updated.file_id) detail.value = updated;
    }
    ElMessage.success(
      replacement.value ? '文件已替换，访问地址保持不变' : '上传成功',
    );
    uploadOpen.value = false;
    chosenFile.value = undefined;
    await gridApi.query();
  } catch {
    ElMessage.error(
      transfer.signal.aborted
        ? '上传已暂停，可重新选择同一文件继续'
        : uploaded
          ? '替换失败，已上传的文件保留在资源中心'
          : '上传失败，请重试',
    );
  } finally {
    uploading.value = false;
  }
}
onBeforeUnmount(() => {
  detailSequence++;
  transfer?.abort();
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <div class="flex min-w-0 flex-wrap items-center gap-3">
          <VbenButton class="gap-2" @click="openUpload()">
            <IconifyIcon icon="lucide:upload" class="size-4" />上传文件
          </VbenButton>
          <VbenButton
            variant="destructive"
            class="gap-2"
            :disabled="!selected.length || deleting"
            :loading="deleting"
            @click="removeSelected"
          >
            <IconifyIcon icon="lucide:trash-2" class="size-4" />删除所选
          </VbenButton>
          <VbenIconButton
            tooltip="上一级"
            aria-label="上一级"
            :disabled="!path"
            @click="navigate(path.split('/').slice(0, -1).join('/'))"
          >
            <IconifyIcon icon="lucide:arrow-up" class="size-4" />
          </VbenIconButton>
          <ElBreadcrumb class="file-breadcrumb">
            <ElBreadcrumbItem>
              <button type="button" @click="navigate('')">全部文件</button>
            </ElBreadcrumbItem>
            <ElBreadcrumbItem v-if="searching">搜索结果</ElBreadcrumbItem>
            <ElBreadcrumbItem
              v-for="crumb in searching ? [] : crumbs"
              :key="crumb.path"
            >
              <button type="button" @click="navigate(crumb.path)">
                {{ crumb.name }}
              </button>
            </ElBreadcrumbItem>
          </ElBreadcrumb>
        </div>
      </template>
      <template #table-title>
        <ElAlert
          v-if="failed"
          title="文件列表加载失败，请刷新重试"
          type="error"
          :closable="false"
        />
      </template>
      <template #name="{ row }">
        <button
          type="button"
          class="flex max-w-full items-center gap-2 text-primary"
          @click="row.folder ? navigate(row.folder.path) : showDetail(row.file)"
        >
          <IconifyIcon
            :icon="
              row.folder
                ? 'lucide:folder'
                : ['image', 'avatar'].includes(row.file.upload_type)
                  ? 'lucide:image'
                  : 'lucide:file-text'
            "
            class="size-5 shrink-0"
            :class="[row.folder ? 'text-amber-500' : 'text-muted-foreground']"
          />
          <span class="truncate">{{
            row.folder ? row.folder.name : row.file.original_name
          }}</span>
        </button>
      </template>
      <template #type="{ row }">
        {{ row.folder ? '文件夹' : label(row.file.upload_type) }}
      </template>
      <template #size="{ row }">
        {{ row.folder ? `${row.folder.count} 个文件` : bytes(row.file.size) }}
      </template>
      <template #visibility="{ row }">
        <ElSwitch
          v-if="row.file"
          :model-value="row.file.is_public"
          :disabled="busy.has(String(row.file.file_id))"
          inline-prompt
          active-text="公开"
          inactive-text="私有"
          :before-change="
            () => {
              void changeVisibility(row.file);
              return false;
            }
          "
        />
      </template>
      <template #status="{ row }">
        <ElTag
          v-if="row.file"
          :type="
            !row.file.exists
              ? 'danger'
              : row.file.owner_uses_avatar
                ? 'warning'
                : 'success'
          "
        >
          {{
            !row.file.exists
              ? '文件缺失'
              : row.file.owner_uses_avatar
                ? '头像使用中'
                : '正常'
          }}
        </ElTag>
      </template>
      <template #operation="{ row }">
        <div v-if="row.file" class="flex items-center justify-center gap-1">
          <VbenIconButton
            tooltip="详情"
            aria-label="文件详情"
            @click="showDetail(row.file)"
          >
            <IconifyIcon icon="lucide:info" class="size-4" />
          </VbenIconButton>
          <VbenIconButton
            tooltip="下载"
            aria-label="下载文件"
            :disabled="!row.file.exists || busy.has(String(row.file.file_id))"
            @click="download(row.file)"
          >
            <IconifyIcon icon="lucide:download" class="size-4" />
          </VbenIconButton>
          <VbenIconButton
            tooltip="替换文件"
            aria-label="替换文件"
            :disabled="busy.has(String(row.file.file_id))"
            @click="openUpload(row.file)"
          >
            <IconifyIcon icon="lucide:replace" class="size-4" />
          </VbenIconButton>
          <VbenIconButton
            :tooltip="
              row.file.owner_uses_avatar ? '正在使用的头像不能删除' : '永久删除'
            "
            aria-label="删除文件"
            :disabled="
              row.file.owner_uses_avatar || busy.has(String(row.file.file_id))
            "
            @click="remove(row.file)"
          >
            <IconifyIcon
              icon="lucide:trash-2"
              class="size-4 text-destructive"
            />
          </VbenIconButton>
        </div>
        <ElButton v-else link type="primary" @click="navigate(row.folder.path)">
          打开
        </ElButton>
      </template>
    </Grid>
    <ElDialog
      v-model="detailOpen"
      title="文件详情"
      width="680px"
      class="!max-w-[calc(100vw-2rem)]"
    >
      <div v-loading="detailLoading" class="min-h-24">
        <ElDescriptions v-if="detail" :column="1" border>
          <ElDescriptionsItem label="文件 ID">
            {{ detail.file_id }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="原始名称">
            {{ detail.original_name }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="存储名称">
            {{ detail.name }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="类型">
            {{ label(detail.upload_type) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="文件大小">
            {{ bytes(detail.size) }}（{{ detail.size }}
            字节）
          </ElDescriptionsItem>
          <ElDescriptionsItem label="MIME">
            {{ detail.mime_type || '-' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="可见性">
            {{ detail.is_public ? '公开' : '私有' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="上传者">
            {{ detail.username || '-' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="存储路径">
            <span class="break-all">{{ detail.url_path }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="上传时间">
            {{ detail.created_time }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="存储状态">
            {{ detail.exists ? '文件存在' : '文件缺失'
            }}{{ detail.owner_uses_avatar ? '，头像使用中' : '' }}
          </ElDescriptionsItem>
        </ElDescriptions>
      </div>
      <template #footer>
        <ElButton @click="detailOpen = false">关闭</ElButton>
        <ElButton v-if="detail" @click="openUpload(detail)">替换文件</ElButton>
        <ElButton
          v-if="detail"
          type="primary"
          :disabled="!detail.exists || busy.has(String(detail.file_id))"
          @click="download(detail)"
        >
          下载
        </ElButton>
      </template>
    </ElDialog>
    <ElDialog
      v-model="uploadOpen"
      destroy-on-close
      :title="replacement ? '替换文件' : '上传文件'"
      width="500px"
      class="!max-w-[calc(100vw-2rem)]"
      :close-on-click-modal="!uploading"
      :show-close="!uploading"
      :close-on-press-escape="!uploading"
      @closed="chosenFile = undefined"
    >
      <ElAlert
        v-if="replacement"
        class="mb-4"
        type="warning"
        :closable="false"
        :title="`替换 ${replacement.original_name}，原内容将被覆盖。保留原名称、访问地址及上传者，要求 .${replacement.extension} 文件。`"
      />
      <ElForm label-position="top">
        <ElFormItem v-if="!replacement" label="文件类型">
          <ElSelect v-model="uploadType" :disabled="uploading">
            <ElOption
              v-for="item in types.filter((item) => item.value !== 'avatar')"
              :key="item.value"
              v-bind="item"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="!replacement" label="公开访问">
          <ElSwitch v-model="publicUpload" :disabled="uploading" @change="loadUploadFolders" />
        </ElFormItem>
        <ElFormItem v-if="!replacement && uploadType === 'resource'" label="资源目录">
          <ElSelect
            v-model="targetPath"
            filterable
            allow-create
            default-first-option
            clearable
            :disabled="uploading"
            placeholder="选择或输入相对目录"
          >
            <ElOption v-for="folder in uploadFolders" :key="folder" :label="folder" :value="folder" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="选择文件">
          <input
            ref="fileInput"
            type="file"
            :accept="replacement ? `.${replacement.extension}` : undefined"
            :disabled="uploading"
            class="hidden"
            @change="choose"
          />
          <div class="flex w-full min-w-0 items-center gap-3">
            <ElButton :disabled="uploading" @click="fileInput?.click()">
              <IconifyIcon
                icon="lucide:folder-open"
                class="mr-2 size-4"
              />选择文件
            </ElButton>
            <span class="min-w-0 truncate" :title="chosenFile?.name">{{
              chosenFile?.name || '未选择文件'
            }}</span>
          </div>
        </ElFormItem>
        <ElProgress v-if="uploading" :percentage="progress" />
      </ElForm>
      <template #footer>
        <ElButton v-if="uploading" @click="transfer?.abort()">
          暂停上传
        </ElButton>
        <ElButton v-else @click="uploadOpen = false">取消</ElButton>
        <ElButton
          type="primary"
          :loading="uploading"
          :disabled="!chosenFile"
          @click="upload"
        >
          {{ replacement ? '确认替换' : '上传' }}
        </ElButton>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
.file-breadcrumb {
  line-height: 1.8;
  overflow-wrap: anywhere;
}

:deep(.el-descriptions__content) {
  overflow-wrap: anywhere;
}
</style>
