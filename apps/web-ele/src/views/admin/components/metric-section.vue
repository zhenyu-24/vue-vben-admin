<script setup lang="ts">
import { ElCard } from 'element-plus';

import { formatNumber, usageColor } from '../monitor/format';

defineProps<{
  items: { label: string; unit: string; usage?: boolean; value?: number }[];
  loading: boolean;
  title: string;
}>();
</script>

<template>
  <ElCard v-loading="loading" class="min-w-0" shadow="never">
    <template #header>
      <h2 class="text-base font-semibold">{{ title }}</h2>
    </template>
    <div class="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
      <div v-for="item in items" :key="item.label" class="min-w-0">
        <p class="mb-2 text-sm text-muted-foreground">{{ item.label }}</p>
        <p class="flex flex-wrap items-baseline gap-1.5">
          <span
            class="text-2xl font-medium tabular-nums"
            :style="{ color: item.usage ? usageColor(item.value) : undefined }"
          >
            {{ formatNumber(item.value) }}
          </span>
          <span class="text-sm text-muted-foreground">{{ item.unit }}</span>
        </p>
      </div>
    </div>
  </ElCard>
</template>
