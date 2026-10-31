<script setup lang="ts">
import type { FileEntry } from '#/api/opensandbox';

import { computed, onMounted, ref, watch } from 'vue';

import { ArrowLeft, Download, Folder, Refresh, UploadFilled } from '@element-plus/icons-vue';
import { Page } from '@vben/common-ui';
import {
  ElButton,
  ElCard,
  ElEmpty,
  ElIcon,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElProgress,
  ElSkeleton,
  ElTag,
  ElUpload,
} from 'element-plus';

import {
  deleteFileApi,
  downloadFileApi,
  listFilesApi,
  mkdirApi,
  renameFileApi,
  uploadFileApi,
  writeFileApi,
} from '#/api/opensandbox';

import OpenSandboxToolbar from '../shared/OpenSandboxToolbar.vue';
import { useOpenSandbox } from '../shared/useOpenSandbox';

defineOptions({ name: 'OnlineSftp' });

interface TransferRecord {
  direction: 'download' | 'upload';
  id: string;
  localPath: string;
  name: string;
  progress: number;
  remotePath: string;
  size: number;
  status: 'failed' | 'finished' | 'running';
  time: string;
}

const {
  initialize,
  loading,
  selectedId,
  selectedSandbox,
  service,
  workspaceRoot,
} = useOpenSandbox();
const serviceAvailable = computed(() => service.value?.available ?? false);
const currentPath = ref('/workspace');
const entries = ref<FileEntry[]>([]);
const entriesLoading = ref(false);
const transfers = ref<TransferRecord[]>([]);

const parentPath = computed(() => {
  const parts = currentPath.value.split('/').filter(Boolean);
  parts.pop();
  return `/${parts.join('/')}`;
});
const isAtRoot = computed(() => currentPath.value === workspaceRoot.value || currentPath.value === '/');

onMounted(async () => {
  await initialize();
  if (selectedId.value && serviceAvailable.value) {
    await loadEntries();
  }
});

watch(
  selectedId,
  async (value) => {
    currentPath.value = workspaceRoot.value;
    transfers.value = [];
    if (value) await loadEntries();
  },
  { immediate: true },
);

async function loadEntries() {
  if (!selectedId.value) return;
  if (!serviceAvailable.value) {
    entries.value = [];
    return;
  }
  entriesLoading.value = true;
  try {
    entries.value = await listFilesApi(selectedId.value, currentPath.value);
  } catch (error: any) {
    ElMessage.error(error?.message || String(error));
  } finally {
    entriesLoading.value = false;
  }
}

function openFolder(entry: FileEntry) {
  if (entry.type !== 'directory') return;
  currentPath.value = entry.path;
  void loadEntries();
}

function goUp() {
  if (isAtRoot.value) return;
  currentPath.value = parentPath.value;
  void loadEntries();
}

function goPath() {
  if (currentPath.value !== workspaceRoot.value && !currentPath.value.startsWith(`${workspaceRoot.value}/`)) {
    currentPath.value = workspaceRoot.value;
  }
  void loadEntries();
}

function addTransfer(record: Omit<TransferRecord, 'id' | 'time'>) {
  const item: TransferRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    time: new Date().toLocaleTimeString(),
  };
  transfers.value.unshift(item);
  return item;
}

function updateTransfer(item: TransferRecord, patch: Partial<TransferRecord>) {
  const current = transfers.value.find((entry) => entry.id === item.id);
  if (current) Object.assign(current, patch);
}

async function beforeUpload(file: File) {
  if (!selectedId.value) return false;
  if (!serviceAvailable.value) {
    ElMessage.warning('沙盒 API 已暂停，请联系管理员启用');
    return false;
  }
  const item = addTransfer({
    direction: 'upload',
    localPath: file.name,
    name: file.name,
    progress: 15,
    remotePath: `${currentPath.value}/${file.name}`,
    size: file.size,
    status: 'running',
  });
  try {
    await uploadFileApi(selectedId.value, currentPath.value, file);
    updateTransfer(item, { progress: 100, status: 'finished' });
    ElMessage.success(`${file.name} 上传完成`);
    await loadEntries();
  } catch (error: any) {
    updateTransfer(item, { status: 'failed' });
    ElMessage.error(error?.message || String(error));
  }
  return false;
}

async function download(entry: FileEntry) {
  if (!selectedId.value || entry.type === 'directory') return;
  const item = addTransfer({
    direction: 'download',
    localPath: `本地下载/${entry.name}`,
    name: entry.name,
    progress: 30,
    remotePath: entry.path,
    size: entry.size,
    status: 'running',
  });
  try {
    const blob = await downloadFileApi(selectedId.value, entry.path);
    updateTransfer(item, { progress: 100, status: 'finished' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = entry.name;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error: any) {
    updateTransfer(item, { status: 'failed' });
    ElMessage.error(error?.message || String(error));
  }
}


async function createFolder() {
  if (!selectedId.value) return;
  try {
    const { value } = await ElMessageBox.prompt('文件夹名称', '新建文件夹', {
      inputValue: 'new-folder',
      inputPattern: /^[^/]+$/,
      inputErrorMessage: '名称不能包含 /',
    });
    await mkdirApi(selectedId.value, `${currentPath.value}/${value}`);
    await loadEntries();
    ElMessage.success('文件夹已创建');
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || String(error));
  }
}

async function createFile() {
  if (!selectedId.value) return;
  try {
    const { value } = await ElMessageBox.prompt('文件名称', '新建文件', {
      inputValue: 'untitled.txt',
      inputPattern: /^[^/]+$/,
      inputErrorMessage: '名称不能包含 /',
    });
    await writeFileApi(selectedId.value, {
      content: '',
      path: `${currentPath.value}/${value}`,
    });
    await loadEntries();
    ElMessage.success('文件已创建');
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || String(error));
  }
}

async function renameEntry(entry: FileEntry) {
  if (!selectedId.value) return;
  try {
    const { value } = await ElMessageBox.prompt('新名称', '重命名', {
      inputValue: entry.name,
      inputPattern: /^[^/]+$/,
      inputErrorMessage: '名称不能包含 /',
    });
    const parts = entry.path.split('/');
    parts.pop();
    await renameFileApi(selectedId.value, {
      destination: `${parts.join('/')}/${value}`,
      source: entry.path,
    });
    await loadEntries();
    ElMessage.success('重命名完成');
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || String(error));
  }
}

async function removeEntry(entry: FileEntry) {
  if (!selectedId.value) return;
  try {
    await ElMessageBox.confirm(`确定删除 ${entry.name}？`, '删除', { type: 'warning' });
    await deleteFileApi(selectedId.value, entry.path);
    await loadEntries();
    ElMessage.success('已删除');
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || String(error));
  }
}

function formatSize(size: number) {
  if (!size) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function directionLabel(value: TransferRecord['direction']) {
  return value === 'upload' ? '上传' : '下载';
}

function statusLabel(value: TransferRecord['status']) {
  return value === 'finished' ? '完成' : value === 'failed' ? '失败' : '进行中';
}
</script>

<template>
  <Page auto-content-height>
    <div class="sftp-page">
      <OpenSandboxToolbar />

      <el-empty v-if="!loading && !selectedSandbox" description="请先创建一个沙盒" />

      <div v-else class="sftp-grid">
        <el-card class="remote-card" shadow="never">
          <template #header>
            <div class="panel-header">
              <div class="panel-title">
                <el-icon><Folder /></el-icon>
                远程文件
              </div>
              <div class="panel-actions">
                <el-button size="small" :icon="ArrowLeft" :disabled="isAtRoot || !serviceAvailable" @click="goUp">上级</el-button>
                <el-button size="small" :disabled="!serviceAvailable" @click="createFolder">新建文件夹</el-button>
                <el-button size="small" :disabled="!serviceAvailable" @click="createFile">新建文件</el-button>
                <el-button size="small" :icon="Refresh" :loading="entriesLoading" :disabled="!serviceAvailable" @click="loadEntries">
                  刷新
                </el-button>
                <el-upload :before-upload="beforeUpload" :show-file-list="false" :disabled="!selectedId || !serviceAvailable">
                  <el-button type="primary" size="small" :icon="UploadFilled" :disabled="!serviceAvailable">上传文件</el-button>
                </el-upload>
              </div>
            </div>
          </template>

          <div class="path-bar">
            <span class="path-prefix">远程路径</span>
            <el-input v-model="currentPath" size="small" @keyup.enter="goPath" />
            <el-button size="small" :disabled="!serviceAvailable" @click="goPath">打开</el-button>
          </div>

          <div class="file-list">
            <div class="file-list-head">
              <span>名称</span>
              <span>类型</span>
              <span>大小</span>
              <span>操作</span>
            </div>
            <div v-for="entry in entries" :key="entry.path" class="file-row">
              <button class="file-name-button" :class="{ folder: entry.type === 'directory' }" type="button" @click="openFolder(entry)">
                <el-icon>
                  <Folder v-if="entry.type === 'directory'" />
                  <Download v-else />
                </el-icon>
                <span>{{ entry.name }}</span>
              </button>
              <span class="cell-muted">{{ entry.type === 'directory' ? '目录' : '文件' }}</span>
              <span class="cell-muted">{{ entry.type === 'directory' ? '-' : formatSize(entry.size) }}</span>
              <div class="row-actions">
                <el-button v-if="entry.type === 'file'" size="small" text type="primary" :icon="Download" :disabled="!serviceAvailable" @click="download(entry)">
                  下载
                </el-button>
                <el-button size="small" text :disabled="!serviceAvailable" @click="renameEntry(entry)">重命名</el-button>
                <el-button size="small" text type="danger" :disabled="!serviceAvailable" @click="removeEntry(entry)">删除</el-button>
              </div>
            </div>
            <el-empty v-if="!entriesLoading && entries.length === 0" description="目录为空" />
            <el-skeleton v-if="entriesLoading" :rows="5" animated />
          </div>
        </el-card>

        <el-card class="transfer-card" shadow="never">
          <template #header>
            <div class="panel-header">
              <div class="panel-title">
                <el-icon><UploadFilled /></el-icon>
                传输记录
              </div>
              <el-tag type="info" size="small">{{ transfers.length }} 个任务</el-tag>
            </div>
          </template>

          <div class="transfer-list">
            <div class="transfer-head">
              <span>名称</span>
              <span>方向</span>
              <span>状态</span>
              <span>进度</span>
              <span>大小</span>
              <span>远端路径</span>
            </div>
            <div v-for="item in transfers" :key="item.id" class="transfer-row">
              <span class="cell-ellipsis">{{ item.name }}</span>
              <el-tag :type="item.direction === 'upload' ? 'success' : 'primary'" size="small">
                {{ directionLabel(item.direction) }}
              </el-tag>
              <el-tag :type="item.status === 'finished' ? 'success' : item.status === 'failed' ? 'danger' : 'warning'" size="small">
                {{ statusLabel(item.status) }}
              </el-tag>
              <el-progress
                :percentage="item.progress"
                :status="item.status === 'failed' ? 'exception' : item.progress === 100 ? 'success' : undefined"
                :stroke-width="9"
              />
              <span class="cell-muted">{{ formatSize(item.size) }}</span>
              <span class="cell-ellipsis cell-muted" :title="item.remotePath">{{ item.remotePath }}</span>
            </div>
            <el-empty v-if="transfers.length === 0" description="暂无传输任务" />
          </div>
        </el-card>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.sftp-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.sftp-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(430px, 1fr);
  gap: 14px;
  min-height: 0;
  flex: 1;
}

.remote-card,
.transfer-card {
  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
}

.remote-card :deep(.el-card__body),
.transfer-card :deep(.el-card__body) {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.remote-card :deep(.el-card__header),
.transfer-card :deep(.el-card__header) {
  flex: none;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.path-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
}

.path-prefix {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.file-list,
.transfer-list {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.file-list-head,
.file-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 70px 90px 220px;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}

.transfer-head,
.transfer-row {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) 56px 64px 110px 76px minmax(140px, 1.2fr);
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
}

.file-list-head,
.transfer-head {
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 600;
}

.file-row,
.transfer-row {
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 12px;
}

.file-row:hover,
.transfer-row:hover {
  background: var(--el-fill-color-light);
}

.file-name-button {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--el-text-color-primary);
  cursor: default;
  font-size: 13px;
  text-align: left;
}

.file-name-button.folder {
  cursor: pointer;
  color: var(--el-color-primary);
}

.file-name-button span,
.cell-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-muted {
  color: var(--el-text-color-secondary);
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 0;
}

@media (max-width: 1100px) {
  .sftp-grid {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(420px, 1fr) minmax(320px, 0.7fr);
    overflow: auto;
  }
}
</style>
