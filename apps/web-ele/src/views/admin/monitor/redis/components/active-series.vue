<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { parseMemoryBytes } from '../../format';

const props = defineProps<{
  maxMemory: string;
  rssMemory: string;
  usedMemory: string;
}>();
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const memory = computed(() => ({
  used: parseMemoryBytes(props.usedMemory),
  rss: parseMemoryBytes(props.rssMemory),
  max: parseMemoryBytes(props.maxMemory),
}));

function renderChart() {
  const largest = Math.max(memory.value.used, memory.value.rss);
  const divisor = largest >= 1024 ** 3 ? 1024 ** 3 : 1024 ** 2;
  const unit = divisor === 1024 ** 3 ? 'GB' : 'MB';
  void renderEcharts({
    grid: { top: 40, right: 16, bottom: 32, left: 12, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['已用内存', 'RSS 内存'],
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { margin: 14 },
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameTextStyle: { align: 'left', padding: [0, 0, 0, 12] },
      splitLine: { lineStyle: { type: 'dashed', opacity: 0.35 } },
    },
    series: [
      {
        name: '内存使用',
        type: 'bar',
        barMaxWidth: 48,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: [
          {
            value: Number((memory.value.used / divisor).toFixed(4)),
            itemStyle: { color: '#5ab1ef' },
          },
          {
            value: Number((memory.value.rss / divisor).toFixed(4)),
            itemStyle: { color: '#67e0e3' },
          },
        ],
        label: {
          show: true,
          position: 'top',
          formatter: ({ value }) => `${Number(value).toFixed(2)} ${unit}`,
        },
      },
    ],
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'shadow' },
      valueFormatter: (value) => `${Number(value).toFixed(2)} ${unit}`,
    },
  });
}

onMounted(renderChart);
watch(memory, renderChart);
</script>

<template>
  <div>
    <p
      class="mb-1 flex items-center justify-between text-sm text-muted-foreground"
    >
      <span>内存上限</span>
      <span class="tabular-nums">
        {{ memory.max > 0 ? maxMemory : '未设置上限' }}
      </span>
    </p>
    <EchartsUI ref="chartRef" height="276px" />
  </div>
</template>
