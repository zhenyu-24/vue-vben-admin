<script setup lang="ts">
import { computed } from 'vue';

import { VbenTiptapPreview } from '@vben/plugins/tiptap';

import { noticeContentHtml } from '#/utils/notice-content';

const props = defineProps<{ content?: string; title?: string }>();
const html = computed(() => noticeContentHtml(props.content));
</script>

<template>
  <div class="mb-3 text-center text-xl font-bold">{{ title }}</div>
  <VbenTiptapPreview
    :content="html"
    :min-height="360"
    class="min-w-0 break-words [overflow-wrap:anywhere]"
  />
</template>
