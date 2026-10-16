<script lang="ts" setup>
import type { RedisMonitorResult } from '#/api';

import { computed, onMounted } from 'vue';

import { AnalysisChartCard, Page, VbenButton } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { useMediaQuery } from '@vueuse/core';
import {
  ElAlert,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
} from 'element-plus';

import { getRedisMonitorApi } from '#/api';

import { useAsyncResource } from '../../shared/useAsyncResource';
import { formatDuration } from '../format';
import ActiveSeries from './components/active-series.vue';
import CommandsSeries from './components/commands-series.vue';

defineOptions({ name: 'Redis' });

const { data, loading, failed, refresh } = useAsyncResource(getRedisMonitorApi);
const redisInfo = computed(() => data.value?.info);
const isMobile = useMediaQuery('(max-width: 767px)');

const fields = [
  ['redis_version', 'Redis 版本'],
  ['redis_mode', '运行模式'],
  ['role', '角色'],
  ['tcp_port', '端口'],
  ['uptime', '运行时间'],
  ['connected_clients', '已连接客户端'],
  ['blocked_clients', '阻塞客户端'],
  ['used_memory_human', '已用内存'],
  ['used_memory_rss_human', 'RSS 内存'],
  ['maxmemory_human', '最大内存'],
  ['mem_fragmentation_ratio', '内存碎片率'],
  ['total_commands_processed', '总命令数'],
  ['instantaneous_ops_per_sec', '每秒命令数'],
  ['rejected_connections', '拒绝连接数'],
  ['keys_num', 'Key 数量'],
] satisfies [keyof RedisMonitorResult['info'], string][];
const redisDescriptionItems = computed(() =>
  fields.map(([key, label]) => ({
    key,
    label,
    content:
      key === 'uptime'
        ? formatDuration(redisInfo.value?.[key] ?? '--')
        : (redisInfo.value?.[key] ?? '--'),
  })),
);

onMounted(refresh);
</script>

<template>
  <Page>
    <ElAlert
      v-if="failed"
      class="mb-5"
      title="Redis 监控加载失败"
      type="error"
      :closable="false"
      show-icon
    >
      <VbenButton class="h-8 gap-1 px-0" variant="link" @click="refresh">
        <IconifyIcon icon="lucide:rotate-cw" class="size-4" />
        重新加载
      </VbenButton>
    </ElAlert>
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
        <CommandsSeries :stats="data?.stats ?? []" />
      </AnalysisChartCard>
      <AnalysisChartCard v-loading="loading" class="min-w-0" title="内存使用">
        <ActiveSeries
          :used-memory="redisInfo?.used_memory_human ?? '0B'"
          :rss-memory="redisInfo?.used_memory_rss_human ?? '0B'"
          :max-memory="redisInfo?.maxmemory_human ?? '0B'"
        />
      </AnalysisChartCard>
    </div>
  </Page>
</template>
