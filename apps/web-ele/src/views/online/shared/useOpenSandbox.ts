import type { Overview, SandboxItem } from '#/api/opensandbox';

import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

import { ElMessage } from 'element-plus';

import {
  createSandboxApi,
  getOverviewApi,
  getSandboxApi,
  getSandboxesApi,
  pauseSandboxApi,
  resumeSandboxApi,
} from '#/api/opensandbox';

type TagType = 'danger' | 'info' | 'primary' | 'success' | 'warning';

const overview = ref<null | Overview>(null);
const sandboxes = ref<SandboxItem[]>([]);
const selectedId = ref('');
const loading = ref(false);
const actionLoading = ref(false);
const queryId = ref('');
let loaded = false;
let loadingPromise: null | Promise<void> = null;

const selectedSandbox = computed(
  () => sandboxes.value.find((item) => item.sandbox_id === selectedId.value) || null,
);
const service = computed(() => overview.value?.service);
const workspaceRoot = computed(
  () => selectedSandbox.value?.workspace_root || overview.value?.workspace_root || '/workspace',
);

function setSelected(id: string) {
  selectedId.value = id;
  if (id) localStorage.setItem('vben:opensandbox:selected', id);
}

async function load(force = false) {
  if (loaded && !force) return;
  if (loadingPromise && !force) return loadingPromise;
  loadingPromise = (async () => {
    loading.value = true;
    try {
      overview.value = await getOverviewApi();
      sandboxes.value = await getSandboxesApi();
      if (queryId.value && !sandboxes.value.some((item) => item.sandbox_id === queryId.value)) {
        try {
          const item = await getSandboxApi(queryId.value);
          sandboxes.value.push(item);
        } catch {
          // 普通用户不能通过 URL 访问他人的沙盒
        }
      }
      const saved = localStorage.getItem('vben:opensandbox:selected');
      setSelected(
        (queryId.value && sandboxes.value.some((item) => item.sandbox_id === queryId.value)
          ? queryId.value
          : saved && sandboxes.value.some((item) => item.sandbox_id === saved)
            ? saved
            : sandboxes.value[0]?.sandbox_id) || '',
      );
      loaded = true;
    } catch (error: any) {
      ElMessage.error(error?.message || String(error));
    } finally {
      loading.value = false;
      loadingPromise = null;
    }
  })();
  return loadingPromise;
}

async function refresh() {
  return load(true);
}

async function create(name?: string) {
  if (!service.value?.available) {
    ElMessage.warning('OpenSandbox 服务不可用');
    return;
  }
  actionLoading.value = true;
  try {
    const item = await createSandboxApi({
      name: name?.trim() || `sandbox-${Date.now().toString(36)}`,
    });
    sandboxes.value.unshift(item);
    setSelected(item.sandbox_id);
    ElMessage.success('沙盒创建成功');
  } catch (error: any) {
    ElMessage.error(error?.message || String(error));
  } finally {
    actionLoading.value = false;
  }
}

async function action(kind: 'pause' | 'resume') {
  if (!selectedSandbox.value) return;
  actionLoading.value = true;
  try {
    await (kind === 'pause'
      ? pauseSandboxApi(selectedSandbox.value.sandbox_id)
      : resumeSandboxApi(selectedSandbox.value.sandbox_id));
    await refresh();
    ElMessage.success(kind === 'pause' ? '沙盒已停止' : '沙盒已启动');
  } catch (error: any) {
    ElMessage.error(error?.message || String(error));
  } finally {
    actionLoading.value = false;
  }
}

function stateLabel(state?: string) {
  const map: Record<string, string> = {
    Failed: '失败',
    Paused: '已停止',
    Pending: '创建中',
    Running: '运行中',
    Terminated: '已删除',
  };
  return map[state || ''] || state || '-';
}

function stateType(state?: string): TagType {
  const map: Record<string, string> = {
    Failed: 'danger',
    Paused: 'warning',
    Pending: 'info',
    Running: 'success',
    Terminated: 'info',
  };
  return (map[state || ''] || 'info') as TagType;
}

export function useOpenSandbox() {
  const route = useRoute();
  const rawQuery = route.query.sandbox_id;
  queryId.value = Array.isArray(rawQuery) ? rawQuery[0] || '' : rawQuery || '';
  if (queryId.value) {
    if (sandboxes.value.some((item) => item.sandbox_id === queryId.value)) {
      setSelected(queryId.value);
    } else if (loaded && !loadingPromise) {
      loaded = false;
      void load(true);
    }
  }
  return {
    action,
    actionLoading,
    create,
    initialize: load,
    loading,
    overview,
    refresh,
    selectedId,
    selectedSandbox,
    service,
    setSelected,
    sandboxes,
    stateLabel,
    stateType,
    workspaceRoot,
  };
}
