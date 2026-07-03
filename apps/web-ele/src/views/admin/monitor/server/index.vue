<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElCard, ElDescriptions, ElDescriptionsItem, ElStatistic } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getServerMonitorApi } from '#/api';

const loading = ref<boolean>(false);

const setServerData = ref<Record<string, any>>({});

const diskData = ref<any[]>([]);

const cpuData = computed(() => {
  return {
    usage: setServerData.value.cpu?.usage,
    current_freq: setServerData.value.cpu?.current_freq,
    max_freq: setServerData.value.cpu?.max_freq,
    min_freq: setServerData.value.cpu?.min_freq,
    logical_num: setServerData.value.cpu?.logical_num,
    physical_num: setServerData.value.cpu?.physical_num,
  };
});

const memData = computed(() => {
  return {
    total: setServerData.value.memory?.total,
    used: setServerData.value.memory?.used,
    free: setServerData.value.memory?.free,
    usage: setServerData.value.memory?.usage,
  };
});

const serviceData = computed(() => {
  const data: any[] = [];
  if (setServerData.value.service) {
    Object.keys(setServerData.value.service).forEach((key) => {
      data.push({
        key,
        label: key,
        content: setServerData.value.service[key],
      });
    });
  }
  return data;
});

const osData = computed(() => {
  const data: any[] = [];
  if (setServerData.value.system) {
    Object.keys(setServerData.value.system).forEach((key) => {
      data.push({
        key,
        label: key,
        content: setServerData.value.system[key],
      });
    });
  }
  return data;
});

const usageStyle = (type: string) => {
  let num = 0;
  if (type === 'cpu') {
    num = cpuData.value.usage;
  } else if (type === 'memory') {
    num = memData.value.usage;
  }
  if (num < 50) {
    return { color: '#32CD32' };
  }
  if (num < 80) {
    return { color: '#FFD700' };
  }
  return { color: '#DC143C' };
};

const fetchServerData = async () => {
  loading.value = true;
  try {
    const res = await getServerMonitorApi();
    setServerData.value.cpu = res.cpu;
    setServerData.value.memory = res.mem;
    setServerData.value.system = res.sys;
    setServerData.value.service = res.service;
    diskData.value = res.disk;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { field: 'dir', title: '目录' },
      { field: 'type', title: '类型' },
      { field: 'device', title: '设备' },
      { field: 'total', title: '总量' },
      { field: 'free', title: '空闲' },
      { field: 'used', title: '已用' },
      { field: 'usage', title: '使用率' },
    ],
    stripe: true,
    pagerConfig: {
      enabled: false,
    },
  },
});

onMounted(async () => {
  await fetchServerData();
  gridApi.setGridOptions({ data: diskData.value });
});
</script>

<template>
  <Page auto-content-height>
    <div class="grid gap-6 xl:grid-cols-2">
      <div class="min-w-0">
        <el-card v-loading="loading">
          <template #header>CPU</template>
          <div class="grid gap-6 px-6 sm:grid-cols-2 xl:grid-cols-4">
            <div class="min-w-0">
              <el-statistic
                title="使用率"
                :value="cpuData.usage"
                suffix="%"
                :value-style="usageStyle('cpu')"
              />
            </div>
            <div class="min-w-0">
              <el-statistic
                title="当前频率"
                :value="cpuData.current_freq"
                suffix=" MHz"
              />
            </div>
            <div class="min-w-0">
              <el-statistic
                title="逻辑核心"
                :value="cpuData.logical_num"
              />
            </div>
            <div class="min-w-0">
              <el-statistic
                title="物理核心"
                :value="cpuData.physical_num"
              />
            </div>
          </div>
        </el-card>
      </div>
      <div class="min-w-0">
        <el-card v-loading="loading">
          <template #header>内存</template>
          <div class="grid gap-6 px-6 sm:grid-cols-2 xl:grid-cols-4">
            <div class="min-w-0">
              <el-statistic
                title="总量"
                :value="memData.total"
                suffix=" GB"
              />
            </div>
            <div class="min-w-0">
              <el-statistic
                title="已用"
                :value="memData.used"
                suffix=" GB"
              />
            </div>
            <div class="min-w-0">
              <el-statistic
                title="空闲"
                :value="memData.free"
                suffix=" GB"
              />
            </div>
            <div class="min-w-0">
              <el-statistic
                title="使用率"
                :value="memData.usage"
                suffix="%"
                :value-style="usageStyle('memory')"
              />
            </div>
          </div>
        </el-card>
      </div>
    </div>
    <div class="mt-6 grid gap-6">
      <el-card v-loading="loading">
        <template #header>服务信息</template>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item
            v-for="item in serviceData"
            :key="item.key"
            :label="item.label"
          >
            {{ item.content }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
      <el-card v-loading="loading">
        <template #header>系统信息</template>
        <el-descriptions :column="4" border size="small">
          <el-descriptions-item
            v-for="item in osData"
            :key="item.key"
            :label="item.label"
          >
            {{ item.content }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
      <el-card v-loading="loading">
        <template #header>磁盘信息</template>
        <Grid />
      </el-card>
    </div>
  </Page>
</template>
