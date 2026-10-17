<script setup lang="ts">
import type { ExternalLinkNode } from '#/api/core/external-links';

import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { externalLinkPath, isSafeExternalUrl } from '#/utils/external-links';

import ExternalLinkIcon from './icon.vue';

defineOptions({ name: 'ExternalLinkCategory' });
defineProps<{ depth?: number; nodes: ExternalLinkNode[] }>();
const router = useRouter();

function open(node: ExternalLinkNode) {
  if (!isSafeExternalUrl(node.url)) return;
  if (node.open_mode === 'external') {
    window.open(node.url, '_blank', 'noopener,noreferrer');
  } else {
    void router.push(externalLinkPath(node.id));
  }
}
</script>

<template>
  <div class="categories">
    <div v-if="nodes.some((node) => node.kind === 'link')" class="link-grid">
      <button
        v-for="node in nodes.filter((item) => item.kind === 'link')"
        :key="String(node.id)"
        type="button"
        class="link-button"
        :disabled="!isSafeExternalUrl(node.url)"
        @click="open(node)"
      >
        <ExternalLinkIcon :icon="node.icon" class="link-icon" />
        <span class="link-copy">
          <strong>{{ node.title }}</strong>
          <span v-if="node.description">{{ node.description }}</span>
        </span>
        <IconifyIcon
          :icon="
            node.open_mode === 'external'
              ? 'lucide:external-link'
              : 'lucide:arrow-right'
          "
          class="shrink-0"
        />
      </button>
    </div>
    <section
      v-for="node in nodes.filter((item) => item.kind === 'group')"
      :key="String(node.id)"
      class="category"
    >
      <h2>
        <ExternalLinkIcon
          :icon="node.icon"
          class="size-4 shrink-0 object-contain"
        />
        {{ node.title }}
      </h2>
      <p v-if="node.description">{{ node.description }}</p>
      <ExternalLinkCategory
        v-if="node.children.length"
        :nodes="node.children"
        :depth="(depth || 0) + 1"
      />
      <p v-else class="empty-category">暂无链接</p>
    </section>
  </div>
</template>

<style scoped>
.categories {
  display: grid;
  gap: 28px;
  min-width: 0;
}
.category {
  min-width: 0;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}
h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
p {
  margin-bottom: 16px;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
}
.link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: 12px;
}
.link-button {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 16px;
  text-align: left;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
}
.link-button:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.link-button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 3px;
}
.link-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: var(--el-color-primary);
  object-fit: contain;
}
.link-copy {
  display: grid;
  flex: 1;
  gap: 4px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.link-copy span,
.empty-category {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
