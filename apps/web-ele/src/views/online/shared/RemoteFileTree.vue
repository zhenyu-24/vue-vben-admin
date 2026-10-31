<script setup lang="ts">
import type { FileEntry } from '#/api/opensandbox';

import { ref } from 'vue';

import { Document, Folder, Refresh } from '@element-plus/icons-vue';
import { ElButton, ElIcon, ElTree } from 'element-plus';

import { listFilesApi } from '#/api/opensandbox';

const props = defineProps<{
  sandboxId: string;
  workspaceRoot: string;
}>();

const emit = defineEmits<{
  open: [path: string];
}>();

const treeKey = ref(0);
const treeProps = { children: 'children', isLeaf: 'leaf', label: 'name' };

interface TreeNode {
  children?: TreeNode[];
  leaf: boolean;
  name: string;
  path: string;
  type: 'directory' | 'file';
}

function toNode(entry: FileEntry): TreeNode {
  return {
    leaf: entry.type === 'file',
    name: entry.name,
    path: entry.path,
    type: entry.type,
  };
}

async function loadNode(node: any, resolve: (data: TreeNode[]) => void) {
  if (!props.sandboxId) {
    resolve([]);
    return;
  }
  try {
    const path = node.level === 0 ? props.workspaceRoot : node.data?.path;
    const entries = await listFilesApi(props.sandboxId, path);
    resolve(entries.map(toNode));
  } catch {
    resolve([]);
  }
}

function onNodeClick(data: TreeNode) {
  if (data.type === 'file') emit('open', data.path);
}

function refresh() {
  treeKey.value += 1;
}
</script>

<template>
  <div class="remote-tree-wrap">
    <div class="remote-tree-header">
      <span class="remote-tree-title">资源管理器</span>
      <el-button size="small" text :icon="Refresh" @click="refresh" />
    </div>
    <el-tree
      :key="`${sandboxId}-${treeKey}`"
      :load="loadNode"
      :props="treeProps"
      class="remote-tree"
      highlight-current
      lazy
      node-key="path"
      @node-click="onNodeClick"
    >
      <template #default="{ data }">
        <span class="remote-tree-node">
          <el-icon>
            <Folder v-if="data.type === 'directory'" />
            <Document v-else />
          </el-icon>
          <span class="remote-tree-label">{{ data.name }}</span>
        </span>
      </template>
    </el-tree>
    <div class="remote-tree-hint">{{ workspaceRoot }}</div>
  </div>
</template>

<style scoped>
.remote-tree-wrap {
  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: var(--el-fill-color-lighter);
}

.remote-tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 0 10px;
}

.remote-tree-title {
  color: var(--el-text-color-primary);
  font-size: 12px;
  font-weight: 600;
}

.remote-tree {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 5px 4px;
  --el-tree-node-hover-bg-color: var(--el-fill-color);
  background: transparent;
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.remote-tree :deep(.el-tree-node__content) {
  height: 28px;
  border-radius: 5px;
}

.remote-tree-node {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.remote-tree-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remote-tree-hint {
  border-top: 1px solid var(--el-border-color-lighter);
  padding: 6px 10px;
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}
</style>
