<script lang="ts" setup>
import { computed, ref } from 'vue';

import { AnalysisChartCard, Page } from '@vben/common-ui';

import { useMediaQuery } from '@vueuse/core';
import { ElCard, ElDescriptions, ElDescriptionsItem } from 'element-plus';

import { getRedisMonitorApi } from '#/api';

import { formatDuration } from '../format';
import ActiveSeries from './components/active-series.vue';
import CommandsSeries from './components/commands-series.vue';

const loading = ref<boolean>(false);
const redisInfo = ref<Record<string, any>>({});
const redisStats = ref<Record<string, any>[]>([]);
const isMobile = useMediaQuery('(max-width: 767px)');

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
    content: formatDuration(String(redisInfo.value?.uptime ?? '--')),
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
</script>

<template>
  <Page>
    <ElCard v-loading="loading" shadow="never">
      <template #header>服务器信息</template>
      <ElDescriptions :column="isMobile ? 1 : 3">
        <ElDescriptionsItem
          v-for="item in redisDescriptionItems"
          :key="item.key"
          :label="item.label"
        >
          {{ item.content }}
        </ElDescriptionsItem>
      </ElDescriptions>
    </ElCard>
    <div class="mt-5 grid min-w-0 gap-5 lg:grid-cols-2">
      <AnalysisChartCard v-loading="loading" class="min-w-0" title="命令统计">
        <CommandsSeries :stats="redisStats" />
      </AnalysisChartCard>
      <AnalysisChartCard v-loading="loading" class="min-w-0" title="内存使用">
        <ActiveSeries
          :used-memory="redisInfo.used_memory_human ?? '0B'"
          :rss-memory="redisInfo.used_memory_rss_human ?? '0B'"
          :max-memory="redisInfo.maxmemory_human ?? '0B'"
        />
      </AnalysisChartCard>
    </div>
  </Page>
</template>
