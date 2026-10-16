<script setup lang="ts">
import type { ConfigType } from './data';

import { reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

import { confirm, Page } from '@vben/common-ui';

import { CircleCheck, Lock, Message } from '@element-plus/icons-vue';
import { useMediaQuery } from '@vueuse/core';
import { ElIcon, ElTabPane, ElTabs } from 'element-plus';

import ConfigSection from './config-section.vue';

defineOptions({ name: 'AdminConfig' });

const activeTab = ref<ConfigType>('USER_SECURITY');
const isNarrowScreen = useMediaQuery('(max-width: 760px)');
const dirtyGroups = reactive<Partial<Record<ConfigType, boolean>>>({});
const tabs = [
  { type: 'USER_SECURITY', label: '安全配置', icon: CircleCheck },
  { type: 'LOGIN', label: '登录配置', icon: Lock },
  { type: 'EMAIL', label: '邮件配置', icon: Message },
] as const;

onBeforeRouteLeave(async () => {
  if (!Object.values(dirtyGroups).some(Boolean)) return true;
  try {
    await confirm({
      title: '离开参数配置',
      content: '尚有未保存的配置，离开将丢失修改。',
      confirmText: '离开',
      cancelText: '继续编辑',
      icon: 'warning',
    });
    return true;
  } catch {
    return false;
  }
});
</script>

<template>
  <Page title="参数配置">
    <div class="config-layout">
      <ElTabs
        v-model="activeTab"
        :tab-position="isNarrowScreen ? 'top' : 'left'"
        class="config-tabs"
        aria-label="参数配置分类"
      >
        <ElTabPane v-for="tab in tabs" :key="tab.type" :name="tab.type" lazy>
          <template #label>
            <span class="tab-label">
              <ElIcon :size="18"><component :is="tab.icon" /></ElIcon>
              {{ tab.label }}
              <span
                v-if="dirtyGroups[tab.type]"
                class="dirty-indicator"
                aria-label="未保存"
              ></span>
            </span>
          </template>
          <ConfigSection
            :type="tab.type"
            @dirty-change="dirtyGroups[tab.type] = $event"
          />
        </ElTabPane>
      </ElTabs>
    </div>
  </Page>
</template>

<style scoped>
.config-layout {
  min-height: 100%;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.config-tabs {
  min-height: 620px;
}

.config-tabs :deep(.el-tabs__header.is-left) {
  width: 200px;
  margin-right: 0;
  padding-top: 20px;
}

.config-tabs :deep(.el-tabs__item.is-left) {
  height: 54px;
  padding: 0 24px;
  text-align: left;
}

.config-tabs :deep(.el-tabs__content) {
  min-width: 0;
  padding: 28px 36px 0;
}

.config-tabs :deep(.el-tab-pane) {
  max-width: 1000px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.dirty-indicator {
  width: 6px;
  height: 6px;
  margin-left: auto;
  background: var(--el-color-warning);
  border-radius: 50%;
}

@media (width <= 760px) {
  .config-tabs :deep(.el-tabs__header.is-top) {
    width: 100%;
    margin-bottom: 0;
    padding: 0;
  }

  .config-tabs :deep(.el-tabs__nav-wrap.is-top) {
    margin-right: 0;
  }

  .config-tabs :deep(.el-tabs__nav-wrap.is-top::after) {
    inset: auto 0 0;
    width: auto;
    height: 1px;
  }

  .config-tabs :deep(.el-tabs__nav.is-top) {
    display: flex;
    float: none;
    width: 100%;
  }

  .config-tabs :deep(.el-tabs__item.is-top) {
    flex: 1;
    height: 54px;
    justify-content: center;
    padding: 0 8px;
  }

  .config-tabs :deep(.el-tabs__active-bar) {
    display: none;
  }

  .config-tabs :deep(.el-tabs__item.is-active) {
    background: var(--el-color-primary-light-9);
  }

  .config-tabs :deep(.el-tabs__content) {
    padding: 24px 20px 0;
  }

  .tab-label {
    justify-content: center;
    gap: 8px;
    font-size: 13px;
  }
}
</style>
