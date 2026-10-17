<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { externalLinkIcon } from '#/utils/external-links';

const props = defineProps<{ icon: string }>();
const failed = ref(false);
const source = computed(() => externalLinkIcon(props.icon));
const image = computed(() => /^https?:\/\//i.test(source.value));
watch(source, () => (failed.value = false));
</script>

<template>
  <img v-if="image && !failed" :src="source" alt="" @error="failed = true" />
  <IconifyIcon v-else :icon="image ? 'lucide:globe' : source" />
</template>
