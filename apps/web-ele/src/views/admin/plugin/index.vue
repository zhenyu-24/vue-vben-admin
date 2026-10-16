<script setup lang="ts">
import type { PluginInfo } from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import { confirm, Page, VbenButton } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { downloadFileFromBlobPart } from '@vben/utils';

import { ElAlert, ElEmpty, ElMessage, ElSkeleton } from 'element-plus';

import {
  downloadPluginApi,
  getPluginChangedApi,
  getPluginListApi,
  uninstallPluginApi,
  updatePluginStatusApi,
} from '#/api';

import InstallModal from './install-modal.vue';
import PluginCard from './plugin-card.vue';

defineOptions({ name: 'AdminPlugin' });

const plugins = ref<PluginInfo[]>([]);
const loading = ref(false);
const loadFailed = ref(false);
const pluginChanged = ref(false);
const localChanged = ref(false);
const switching = reactive(new Set<string>());
const downloading = reactive(new Set<string>());
const removing = reactive(new Set<string>());
const installModal = ref<InstanceType<typeof InstallModal>>();
const changed = computed(() => pluginChanged.value || localChanged.value);

function busy(name: string) {
  return switching.has(name) || downloading.has(name) || removing.has(name);
}

async function refresh() {
  if (loading.value) return;
  loading.value = true;
  loadFailed.value = false;
  try {
    const [list, changedStatus] = await Promise.all([
      getPluginListApi(),
      getPluginChangedApi(),
    ]);
    plugins.value = list.map((item) => item.plugin);
    pluginChanged.value = changedStatus;
    localChanged.value = false;
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

async function toggle(plugin: PluginInfo) {
  if (busy(plugin.name)) return;
  switching.add(plugin.name);
  try {
    await updatePluginStatusApi(plugin.name);
    plugin.enable = plugin.enable === true || plugin.enable === '1' ? '0' : '1';
    localChanged.value = true;
    ElMessage.success('插件状态已更新');
  } catch {
    // The request interceptor displays API errors; retain the current status.
  } finally {
    switching.delete(plugin.name);
  }
}

async function download(plugin: PluginInfo) {
  if (busy(plugin.name)) return;
  downloading.add(plugin.name);
  try {
    await confirm({
      title: '打包插件',
      content: `确认打包并下载“${plugin.summary}”吗？`,
      confirmText: '打包下载',
      cancelText: '取消',
      icon: 'info',
    });
    const source = await downloadPluginApi(plugin.name);
    downloadFileFromBlobPart({ fileName: `${plugin.name}.zip`, source });
    ElMessage.success('插件包已开始下载');
  } catch {
    // Cancellation requires no message; API errors are shown by the interceptor.
  } finally {
    downloading.delete(plugin.name);
  }
}

async function remove(plugin: PluginInfo) {
  if (busy(plugin.name)) return;
  removing.add(plugin.name);
  try {
    await confirm({
      title: '卸载插件',
      content: `确认卸载“${plugin.summary}”吗？请根据插件说明移除相关配置，并重启服务。`,
      confirmText: '卸载',
      cancelText: '取消',
      icon: 'warning',
    });
    await uninstallPluginApi(plugin.name);
    localChanged.value = true;
    plugins.value = plugins.value.filter((item) => item.name !== plugin.name);
    ElMessage.success('插件已卸载');
    await refresh();
  } catch {
    // Cancellation requires no message; API errors are shown by the interceptor.
  } finally {
    removing.delete(plugin.name);
  }
}

async function installed() {
  await refresh();
  localChanged.value = true;
}

onMounted(refresh);
</script>

<template>
  <Page>
    <div class="mb-4">
      <VbenButton class="gap-2" @click="installModal?.open()">
        <Plus class="size-4 shrink-0" aria-hidden="true" />
        安装插件
      </VbenButton>
    </div>
    <div v-if="changed" class="mb-4">
      <ElAlert
        title="插件配置已变更，请根据插件说明完成配置并重启服务后生效。"
        type="warning"
        show-icon
        :closable="false"
      />
    </div>
    <div v-if="loadFailed" class="mb-4">
      <ElAlert
        title="插件列表加载失败，请重试。"
        type="error"
        show-icon
        :closable="false"
      >
        <VbenButton variant="link" class="h-8 px-0" @click="refresh">
          重新加载
        </VbenButton>
      </ElAlert>
    </div>
    <ElSkeleton :loading="loading && plugins.length === 0" :rows="5" animated>
      <ElEmpty
        v-if="plugins.length === 0 && !loadFailed"
        description="暂无插件"
      />
      <div
        v-else
        class="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      >
        <PluginCard
          v-for="plugin in plugins"
          :key="plugin.name"
          :plugin="plugin"
          :busy="busy(plugin.name)"
          :switching="switching.has(plugin.name)"
          :downloading="downloading.has(plugin.name)"
          :removing="removing.has(plugin.name)"
          @toggle="toggle(plugin)"
          @download="download(plugin)"
          @remove="remove(plugin)"
        />
      </div>
    </ElSkeleton>
    <InstallModal ref="installModal" @installed="installed" />
  </Page>
</template>
