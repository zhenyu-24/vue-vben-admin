<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ServerMonitorResult } from '#/api';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Refresh } from '@element-plus/icons-vue';
import { ElAlert, ElButton, ElCard, ElProgress } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getServerMonitorApi } from '#/api';

import DetailTable from '../../components/detail-table.vue';
import { formatDuration } from '../format';

interface DetailItem {
  fullWidth?: boolean;
  key: string;
  label: string;
  value: string;
}

const loading = ref(true);
const loadFailed = ref(false);
const server = ref<ServerMonitorResult>();
const numberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

function formatNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? numberFormatter.format(value)
    : '--';
}

const cpuStats = computed(() => [
  { label: '使用率', value: server.value?.cpu.usage, unit: '%', usage: true },
  { label: '当前频率', value: server.value?.cpu.current_freq, unit: 'MHz' },
  { label: '逻辑核心', value: server.value?.cpu.logical_num, unit: '个' },
  { label: '物理核心', value: server.value?.cpu.physical_num, unit: '个' },
]);
const memoryStats = computed(() => [
  { label: '总容量', value: server.value?.mem.total, unit: 'GB' },
  { label: '已用内存', value: server.value?.mem.used, unit: 'GB' },
  { label: '可用内存', value: server.value?.mem.free, unit: 'GB' },
  { label: '使用率', value: server.value?.mem.usage, unit: '%', usage: true },
]);

const serviceFields = [
  ['name', '服务名称'],
  ['version', '运行版本'],
  ['home', '程序路径'],
  ['startup', '启动时间'],
  ['elapsed', '运行时长'],
  ['cpu_usage', 'CPU 使用率'],
  ['mem_vms', '虚拟内存'],
  ['mem_rss', '物理内存（RSS）'],
  ['mem_free', '可用内存'],
] as const;
const systemFields = [
  ['name', '主机名称'],
  ['os', '操作系统'],
  ['ip', 'IP 地址'],
  ['arch', '系统架构'],
] as const;

function createDetails(
  fields: ReadonlyArray<readonly [string, string]>,
  data?: Record<string, unknown>,
): DetailItem[] {
  if (!data) return [];
  return fields.map(([key, label]) => ({
    key,
    label,
    fullWidth: key === 'home',
    value:
      key === 'elapsed'
        ? formatDuration(String(data[key] ?? '--'))
        : String(data[key] ?? '--'),
  }));
}

const serviceRows = computed(() =>
  createDetails(serviceFields, server.value?.service),
);
const systemRows = computed(() =>
  createDetails(systemFields, server.value?.sys),
);
const diskOptions: VxeTableGridOptions = {
  align: 'left',
  columns: [
    { field: 'dir', title: '挂载目录', minWidth: 120 },
    { field: 'type', title: '文件系统', minWidth: 110 },
    { field: 'device', title: '设备名称', minWidth: 120 },
    { field: 'total', title: '总容量', minWidth: 120, align: 'right' },
    { field: 'used', title: '已用容量', minWidth: 120, align: 'right' },
    { field: 'free', title: '可用容量', minWidth: 120, align: 'right' },
    {
      field: 'usage',
      title: '使用率',
      minWidth: 200,
      slots: { default: 'usage' },
    },
  ],
  minHeight: 0,
  pagerConfig: { enabled: false },
  rowConfig: { isHover: true },
  size: 'medium',
};
const [DiskGrid] = useVbenVxeGrid({});

function usageColor(value: unknown) {
  const usage = Number(value);
  if (!Number.isFinite(usage)) return undefined;
  if (usage >= 90) return 'var(--el-color-danger)';
  if (usage >= 80) return 'var(--el-color-warning)';
  return 'var(--el-color-primary)';
}

function diskPercentage(value: unknown) {
  const usage = Number.parseFloat(String(value));
  return Number.isFinite(usage) ? Math.min(100, Math.max(0, usage)) : 0;
}

async function fetchServerData() {
  loading.value = true;
  loadFailed.value = false;
  try {
    server.value = await getServerMonitorApi();
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchServerData);
</script>

<template>
  <Page>
    <div class="flex flex-col gap-5">
      <ElAlert
        v-if="loadFailed"
        title="服务器监控加载失败"
        type="error"
        :closable="false"
        show-icon
      >
        <ElButton :icon="Refresh" link type="primary" @click="fetchServerData">
          重新加载
        </ElButton>
      </ElAlert>
      <div class="grid min-w-0 gap-5 xl:grid-cols-2">
        <ElCard v-loading="loading" class="min-w-0" shadow="never">
          <template #header>
            <h2 class="text-base font-semibold">CPU 信息</h2>
          </template>
          <div class="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
            <div v-for="item in cpuStats" :key="item.label" class="min-w-0">
              <p class="mb-2 text-sm text-muted-foreground">{{ item.label }}</p>
              <p class="flex flex-wrap items-baseline gap-1.5">
                <span
                  class="text-2xl font-medium tabular-nums"
                  :style="{
                    color: item.usage ? usageColor(item.value) : undefined,
                  }"
                >
                  {{ formatNumber(item.value) }}
                </span>
                <span class="text-sm text-muted-foreground">{{
                  item.unit
                }}</span>
              </p>
            </div>
          </div>
        </ElCard>
        <ElCard v-loading="loading" class="min-w-0" shadow="never">
          <template #header>
            <h2 class="text-base font-semibold">内存信息</h2>
          </template>
          <div class="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
            <div v-for="item in memoryStats" :key="item.label" class="min-w-0">
              <p class="mb-2 text-sm text-muted-foreground">{{ item.label }}</p>
              <p class="flex flex-wrap items-baseline gap-1.5">
                <span
                  class="text-2xl font-medium tabular-nums"
                  :style="{
                    color: item.usage ? usageColor(item.value) : undefined,
                  }"
                >
                  {{ formatNumber(item.value) }}
                </span>
                <span class="text-sm text-muted-foreground">{{
                  item.unit
                }}</span>
              </p>
            </div>
          </div>
        </ElCard>
      </div>
      <ElCard class="min-w-0" shadow="never">
        <template #header>
          <h2 class="text-base font-semibold">服务信息</h2>
        </template>
        <DetailTable :items="serviceRows" :loading="loading" />
      </ElCard>
      <ElCard class="min-w-0" shadow="never">
        <template #header>
          <h2 class="text-base font-semibold">系统信息</h2>
        </template>
        <DetailTable :items="systemRows" :loading="loading" />
      </ElCard>
      <ElCard class="min-w-0" shadow="never">
        <template #header>
          <h2 class="text-base font-semibold">磁盘信息</h2>
        </template>
        <DiskGrid
          class="h-auto min-w-0"
          grid-class="p-0"
          :grid-options="{ ...diskOptions, data: server?.disk ?? [], loading }"
        >
          <template #usage="{ row }">
            <ElProgress
              :percentage="diskPercentage(row.usage)"
              :color="usageColor(diskPercentage(row.usage))"
              :stroke-width="6"
              :format="() => row.usage"
            />
          </template>
        </DiskGrid>
      </ElCard>
    </div>
  </Page>
</template>
