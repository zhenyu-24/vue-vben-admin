<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, onMounted } from 'vue';

import { Page, VbenButton } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { ElAlert, ElCard, ElProgress } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getServerMonitorApi } from '#/api';

import DetailTable from '../../components/detail-table.vue';
import MetricSection from '../../components/metric-section.vue';
import { useAsyncResource } from '../../shared/useAsyncResource';
import { diskPercentage, formatDuration, usageColor } from '../format';

interface DetailItem {
  fullWidth?: boolean;
  key: string;
  label: string;
  value: string;
}

defineOptions({ name: 'Server' });

const {
  data: server,
  loading,
  failed: loadFailed,
  refresh: fetchServerData,
} = useAsyncResource(getServerMonitorApi);

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

function createDetails<T extends object>(
  fields: ReadonlyArray<readonly [keyof T, string]>,
  data?: T,
): DetailItem[] {
  if (!data) return [];
  return fields.map(([key, label]) => ({
    key: String(key),
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
        <VbenButton class="h-8 gap-1 px-0" variant="link" @click="fetchServerData">
          <IconifyIcon icon="lucide:rotate-cw" class="size-4" />
          重新加载
        </VbenButton>
      </ElAlert>
      <div class="grid min-w-0 gap-5 xl:grid-cols-2">
        <MetricSection title="CPU 信息" :loading="loading" :items="cpuStats" />
        <MetricSection
          title="内存信息"
          :loading="loading"
          :items="memoryStats"
        />
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
