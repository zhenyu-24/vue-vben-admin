<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { RedisCommandStat } from '#/api';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const props = defineProps<{ stats: RedisCommandStat[] }>();
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const commands = computed(() =>
  props.stats
    .map((item) => ({ name: String(item.name), value: Number(item.value) }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .toSorted((a, b) => b.value - a.value),
);

function renderChart() {
  const total = commands.value.reduce((sum, item) => sum + item.value, 0);
  void renderEcharts({
    color: ['#5ab1ef', '#b6a2de', '#67e0e3', '#2ec7c9'],
    title: {
      text: total ? total.toLocaleString('zh-CN') : '暂无命令统计',
      subtext: total ? '调用次数' : '',
      left: 'center',
      top: '32%',
      textStyle: { fontSize: total ? 24 : 14, fontWeight: 500 },
      subtextStyle: { fontSize: 12 },
      itemGap: 8,
    },
    legend: {
      show: total > 0,
      type: 'scroll',
      bottom: 0,
      left: 'center',
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 18,
      textStyle: { fontSize: 12 },
    },
    series: [
      {
        name: '命令调用',
        type: 'pie',
        center: ['50%', '42%'],
        radius: ['45%', '65%'],
        data: commands.value,
        itemStyle: { borderRadius: 6, borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scaleSize: 5 },
        animationEasing: 'exponentialInOut',
        animationType: 'scale',
      },
    ],
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: '{b}<br/>{c} 次（{d}%）',
    },
  });
}

onMounted(renderChart);
watch(commands, renderChart);
</script>

<template>
  <EchartsUI ref="chartRef" height="300px" />
</template>
