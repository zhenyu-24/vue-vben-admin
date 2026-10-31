<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { Plus, Refresh, VideoPause, VideoPlay } from '@element-plus/icons-vue';
import { ElAlert, ElButton, ElDialog, ElInput, ElMessage, ElOption, ElSelect, ElTag } from 'element-plus';

import { useOpenSandbox } from '../shared/useOpenSandbox';

const {
  action,
  actionLoading,
  create,
  initialize,
  loading,
  refresh,
  selectedId,
  selectedSandbox,
  service,
  stateLabel,
  stateType,
  sandboxes,
} = useOpenSandbox();

const createOpen = ref(false);
const createName = ref('');

onMounted(initialize);

async function submitCreate() {
  await create(createName.value);
  createOpen.value = false;
  createName.value = '';
}

async function testConnection() {
  await refresh();
  ElMessage.success('已刷新服务状态');
}

</script>

<template>
  <div class="osb-toolbar">
    <div class="osb-toolbar-main">
      <div class="osb-title-wrap">
        <h2 class="osb-title">在线编程</h2>
        <span class="osb-subtitle">OpenSandbox 隔离开发环境</span>
      </div>
      <div class="osb-toolbar-actions">
        <el-select
          v-if="sandboxes.length > 0"
          v-model="selectedId"
          class="osb-select"
          :loading="loading"
          placeholder="选择沙盒"
        >
          <el-option
            v-for="item in sandboxes"
            :key="item.sandbox_id"
            :label="`${item.name} · ${stateLabel(item.state)}`"
            :value="item.sandbox_id"
          />
        </el-select>
        <el-tag v-if="selectedSandbox" :type="stateType(selectedSandbox.state)" effect="light">
          {{ stateLabel(selectedSandbox.state) }}
        </el-tag>
        <el-button
          :icon="selectedSandbox?.state === 'Paused' ? VideoPlay : VideoPause"
          :loading="actionLoading"
          :disabled="!selectedSandbox"
          @click="action(selectedSandbox?.state === 'Paused' ? 'resume' : 'pause')"
        >
          {{ selectedSandbox?.state === 'Paused' ? '启动' : '停止' }}
        </el-button>
        <el-button :icon="Refresh" :loading="loading" @click="testConnection">
          刷新
        </el-button>
        <el-button type="primary" :icon="Plus" :disabled="!service?.available" @click="createOpen = true">
          创建沙盒
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="service && (!service.configured || !service.available)"
      class="mt-2"
      :title="service.message"
      :type="service.configured ? 'warning' : 'info'"
      show-icon
      :closable="false"
    />
    <div v-else-if="service" class="osb-service-line">
      <span class="osb-service-dot" :class="{ offline: !service.available }" />
      {{ service.available ? '沙盒服务可用' : '沙盒服务不可用' }}
      <span v-if="service.version">v{{ service.version }}</span>
    </div>

    <el-dialog v-model="createOpen" title="创建沙盒" width="440px">
      <el-input v-model="createName" placeholder="沙盒名称，例如 my-python" clearable />
      <template #footer>
        <el-button @click="createOpen = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.osb-toolbar {
  margin-bottom: 14px;
}

.osb-toolbar-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.osb-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.osb-title {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
}

.osb-subtitle {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.osb-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.osb-select {
  width: 260px;
}

.osb-service-line {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.osb-service-dot {
  height: 7px;
  width: 7px;
  border-radius: 999px;
  background: var(--el-color-success);
}

.osb-service-dot.offline {
  background: var(--el-color-danger);
}

</style>
