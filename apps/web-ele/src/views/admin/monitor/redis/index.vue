<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { ElCard, ElDescriptions, ElDescriptionsItem } from 'element-plus';

import { getRedisMonitorApi } from '#/api';
import ActiveSeries from './components/active-series.vue';
import CommandsSeries from './components/commands-series.vue';

const loading = ref<boolean>(false);
const redisInfo = ref<Record<string, any>>({});
const redisStats = ref<Record<string, any>[]>([]);
const usedMemory = ref<number>(0);
const redisUsedMemory = computed(() => [
  {
    name: '已用内存',
    value: usedMemory.value,
  },
]);

const fetchRedisData = async () => {
  loading.value = true;
  try {
    const res = await getRedisMonitorApi();
    redisInfo.value = res.info;
    redisStats.value = res.stats;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
};
fetchRedisData();

const redisDescriptionItems = computed(() => [
  {
    key: 'redis_version',
    label: 'Redis 版本',
    content: redisInfo.value?.redis_version,
  },
  {
    key: 'redis_mode',
    label: '运行模式',
    content: redisInfo.value?.redis_mode,
  },
  {
    key: 'role',
    label: '角色',
    content: redisInfo.value?.role,
  },
  {
    key: 'tcp_port',
    label: '端口',
    content: redisInfo.value?.tcp_port,
  },
  {
    key: 'uptime',
    label: '运行时间',
    content: redisInfo.value?.uptime,
  },
  {
    key: 'connected_clients',
    label: '已连接客户端',
    content: redisInfo.value?.connected_clients,
  },
  {
    key: 'blocked_clients',
    label: '阻塞客户端',
    content: redisInfo.value?.blocked_clients,
  },
  {
    key: 'used_memory_human',
    label: '已用内存',
    content: redisInfo.value?.used_memory_human,
  },
  {
    key: 'used_memory_rss_human',
    label: 'RSS 内存',
    content: redisInfo.value?.used_memory_rss_human,
  },
  {
    key: 'maxmemory_human',
    label: '最大内存',
    content: redisInfo.value?.maxmemory_human,
  },
  {
    key: 'mem_fragmentation_ratio',
    label: '内存碎片率',
    content: redisInfo.value?.mem_fragmentation_ratio,
  },
  {
    key: 'total_commands_processed',
    label: '总命令数',
    content: redisInfo.value?.total_commands_processed,
  },
  {
    key: 'instantaneous_ops_per_sec',
    label: '每秒命令数',
    content: redisInfo.value?.instantaneous_ops_per_sec,
  },
  {
    key: 'rejected_connections',
    label: '拒绝连接数',
    content: redisInfo.value?.rejected_connections,
  },
  {
    key: 'keys_num',
    label: 'Key 数量',
    content: redisInfo.value?.keys_num,
  },
]);

const parseMemoryToMB = (memStr: string): number => {
  if (!memStr) return 0;
  const match = memStr.match(/^([\d.]+)([BKMG]?)$/i);
  if (!match || !match[1]) return 0;
  const value = Number.parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  switch (unit) {
    case 'G': {
      return value * 1024;
    }
    case 'K': {
      return value / 1024;
    }
    case 'M': {
      return value;
    }
    default: {
      return value / 1024 / 1024;
    }
  }
};

watch(redisInfo, (val) => {
  usedMemory.value = Number.parseFloat(
    parseMemoryToMB(val.used_memory_human).toFixed(2),
  );
});
</script>

<template>
  <Page auto-content-height content-class="flex flex-col">
    <el-card v-loading="loading">
      <template #header>服务器信息</template>
      <el-descriptions :column="3" size="small">
        <el-descriptions-item
          v-for="item in redisDescriptionItems"
          :key="item.key"
          :label="item.label"
        >
          {{ item.content }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
    <div class="mt-4 flex min-h-0 flex-1 space-x-4">
      <div class="flex min-h-0 flex-1 flex-col">
        <el-card
          class="flex flex-1 flex-col"
          v-loading="loading"
        >
          <template #header>命令统计</template>
          <CommandsSeries class="min-h-0 flex-1" :stats="redisStats" />
        </el-card>
      </div>
      <div class="flex min-h-0 flex-1 flex-col">
        <el-card
          class="flex flex-1 flex-col"
          v-loading="loading"
        >
          <template #header>内存使用</template>
          <ActiveSeries class="min-h-0 flex-1" :memory="redisUsedMemory" />
        </el-card>
      </div>
    </div>
  </Page>
</template>
