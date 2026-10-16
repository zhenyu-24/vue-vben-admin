<script setup lang="ts">
import type { PluginInfo } from '#/api';

import { computed, ref, watch } from 'vue';

import { EllipsisText, VbenButton } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { ElTag } from 'element-plus';

import StatusSwitch from '../shared/status-switch.vue';

const props = defineProps<{
  busy: boolean;
  downloading: boolean;
  plugin: PluginInfo;
  removing: boolean;
  switching: boolean;
}>();

const emit = defineEmits<{
  download: [];
  remove: [];
  toggle: [];
}>();

const imageFailed = ref(false);
const imageIcon = computed(() =>
  /^(?:https?:\/\/|data:)|\.(?:svg|png|jpe?g|webp|gif|ico)(?:\?.*)?$/i.test(
    props.plugin.icon ?? '',
  ),
);
const enabled = computed(
  () => props.plugin.enable === true || props.plugin.enable === '1',
);
const author = computed(() => `@${props.plugin.author.replace(/^@/, '')}`);

watch(
  () => props.plugin.icon,
  () => (imageFailed.value = false),
);
</script>

<template>
  <article
    class="flex min-w-0 flex-col rounded-lg border bg-card p-5 text-card-foreground"
    :aria-label="plugin.summary"
  >
    <div class="flex items-start gap-3">
      <div
        class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"
      >
        <img
          v-if="imageIcon && !imageFailed"
          :src="plugin.icon"
          alt=""
          class="size-full object-contain p-1"
          @error="imageFailed = true"
        />
        <IconifyIcon
          v-else
          :icon="imageIcon || !plugin.icon ? 'lucide:puzzle' : plugin.icon"
          class="size-6 text-muted-foreground"
        />
      </div>
      <div class="min-w-0 flex-1">
        <div class="plugin-text truncate font-medium leading-6">
          {{ plugin.summary }}
        </div>
        <div
          class="plugin-text truncate text-xs leading-5 text-muted-foreground"
        >
          {{ author }}
        </div>
      </div>
      <StatusSwitch
        class="-mt-1 shrink-0"
        :model-value="enabled"
        :aria-label="`${plugin.summary}状态`"
        :loading="switching"
        :disabled="busy"
        @change="emit('toggle')"
      />
    </div>
    <div class="mt-3 min-h-10 flex-1">
      <EllipsisText
        :line="2"
        :tooltip-max-width="360"
        class="plugin-text break-words text-sm leading-5 text-muted-foreground"
      >
        {{ plugin.description }}
      </EllipsisText>
    </div>
    <div class="mt-3 flex min-h-6 flex-wrap items-start gap-1">
      <ElTag
        v-for="tag in plugin.tags"
        :key="tag"
        class="plugin-tag max-w-full"
        type="info"
        size="small"
        effect="light"
      >
        <EllipsisText :tooltip-max-width="360">{{ tag }}</EllipsisText>
      </ElTag>
    </div>
    <div class="mt-4 flex items-center justify-between gap-3">
      <div class="min-w-0 flex-1">
        <EllipsisText
          :tooltip-max-width="360"
          class="plugin-text text-xs text-muted-foreground"
        >
          v{{ plugin.version }}
        </EllipsisText>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <VbenButton
          class="min-w-[76px] gap-1.5 border-destructive/30 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
          variant="outline"
          :loading="removing"
          :disabled="busy"
          @click="emit('remove')"
        >
          <IconifyIcon v-if="!removing" icon="lucide:trash-2" class="size-4" />
          卸载
        </VbenButton>
        <VbenButton
          class="min-w-[76px] gap-1.5 px-3"
          variant="outline"
          :loading="downloading"
          :disabled="busy"
          @click="emit('download')"
        >
          <IconifyIcon
            v-if="!downloading"
            icon="lucide:package"
            class="size-4"
          />
          打包
        </VbenButton>
      </div>
    </div>
  </article>
</template>

<style scoped>
.plugin-tag :deep(.el-tag__content) {
  min-width: 0;
}
</style>
