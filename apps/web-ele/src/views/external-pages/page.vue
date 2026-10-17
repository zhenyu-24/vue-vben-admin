<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { ElAlert, ElButton, ElEmpty } from 'element-plus';

import { useExternalLinksStore } from '#/store/external-links';
import { isSafeExternalUrl } from '#/utils/external-links';

defineOptions({ name: 'ExternalPageView' });
const route = useRoute();
const store = useExternalLinksStore();
const frameKey = ref(0);
const loading = ref(true);
const slow = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
const item = computed(() =>
  store.records.find(
    (record) => String(record.id) === route.meta.externalLinkId,
  ),
);
const safe = computed(() => !!item.value && isSafeExternalUrl(item.value.url));
const mixed = computed(
  () => location.protocol === 'https:' && item.value?.url.startsWith('http:'),
);
function reset() {
  clearTimeout(timer);
  loading.value = item.value?.open_mode === 'iframe' && !mixed.value;
  slow.value = false;
  frameKey.value++;
  if (!loading.value) return;
  timer = setTimeout(() => {
    slow.value = true;
    loading.value = false;
  }, 12_000);
}
function loaded() {
  clearTimeout(timer);
  slow.value = false;
  loading.value = false;
}
function open() {
  if (safe.value) window.open(item.value!.url, '_blank', 'noopener,noreferrer');
}
watch(() => [item.value?.url, item.value?.open_mode], reset, {
  immediate: true,
});
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div v-if="item && safe" class="external-frame">
    <div class="frame-toolbar">
      <strong>{{ item.title }}</strong>
      <ElButton @click="open">
        <IconifyIcon icon="lucide:external-link" class="mr-2" />新窗口打开
      </ElButton>
    </div>
    <ElAlert
      v-if="mixed || slow"
      :title="
        mixed
          ? '浏览器无法在 HTTPS 系统中嵌入 HTTP 网页，请使用新窗口打开'
          : '若页面空白或拒绝连接，请使用新窗口打开；目标网站可能限制了内嵌访问'
      "
      type="warning"
      show-icon
      :closable="false"
    />
    <div v-if="item.open_mode === 'external'" class="external-launch">
      <IconifyIcon icon="lucide:external-link" class="mb-4 size-10" />
      <ElButton type="primary" @click="open">打开 {{ item.title }}</ElButton>
    </div>
    <div v-else-if="!mixed" v-loading="loading" class="frame-body">
      <iframe
        :key="frameKey"
        :src="item.url"
        :title="item.title"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
        referrerpolicy="no-referrer"
        allow="fullscreen; clipboard-write"
        @load="loaded"
      ></iframe>
    </div>
  </div>
  <ElEmpty v-else description="页面不存在或已停用" />
</template>

<style scoped>
.external-frame {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 136px);
  min-height: 360px;
  background: var(--el-bg-color);
}
.frame-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.frame-toolbar strong {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.frame-body {
  flex: 1;
  min-height: 0;
}
iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}
.external-launch {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
@media (width <= 640px) {
  .frame-toolbar {
    flex-wrap: wrap;
  }
  .frame-toolbar strong {
    flex-basis: 100%;
  }
}
</style>
