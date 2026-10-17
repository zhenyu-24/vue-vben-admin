<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import { ElEmpty } from 'element-plus';

import { useExternalLinksStore } from '#/store/external-links';

import Category from './category.vue';

defineOptions({ name: 'ExternalPagesDirectory' });
const store = useExternalLinksStore();
const route = useRoute();
const current = computed(() =>
  store.records.find((item) => String(item.id) === route.meta.externalLinkId),
);
const nodes = computed(() => {
  if (!current.value) return store.tree;
  function find(items: typeof store.tree): typeof store.tree {
    for (const item of items) {
      if (String(item.id) === String(current.value?.id)) return item.children;
      const found = find(item.children);
      if (found.length) return found;
    }
    return [];
  }
  return find(store.tree);
});
</script>

<template>
  <Page :title="current?.title || '外部页面'">
    <div class="directory">
      <p v-if="current?.description" class="directory-description">
        {{ current.description }}
      </p>
      <Category v-if="nodes.length" :nodes="nodes" />
      <ElEmpty
        v-else
        :description="store.available ? '暂无外部页面' : '外部页面插件未启用'"
      />
    </div>
  </Page>
</template>

<style scoped>
.directory {
  min-height: 320px;
  padding: 24px;
  background: var(--el-bg-color);
}
.directory-description {
  margin-bottom: 24px;
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--el-text-color-secondary);
}
@media (width <= 640px) {
  .directory {
    padding: 16px;
  }
}
</style>
