<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';

import type {
  ExternalLinkInput,
  ExternalLinkNode,
  ExternalLinkRecord,
} from '#/api/core/external-links';
import type { SysId } from '#/types/api';

import { computed, nextTick, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, VbenButton, VbenIconButton } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  ElAlert,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElRadioButton,
  ElRadioGroup,
  ElTag,
  ElTreeSelect,
} from 'element-plus';

import {
  createExternalLinkApi,
  deleteExternalLinkApi,
  getExternalLinksApi,
  updateExternalLinkApi,
} from '#/api/core/external-links';
import { refreshExternalPageRoutes } from '#/router/external-links';
import {
  buildExternalLinkTree,
  isSafeExternalUrl,
} from '#/utils/external-links';
import ExternalLinkIcon from '#/views/external-pages/icon.vue';

import StatusSwitch from '../shared/status-switch.vue';
import { useAdminGrid } from '../shared/useAdminGrid';
import IconPicker from './icon-picker.vue';

defineOptions({ name: 'AdminExternalLinks' });
const router = useRouter();
const rows = ref<ExternalLinkRecord[]>([]);
const failed = ref(false);
const query = ref('');
const status = ref<'' | 'disabled' | 'enabled'>('');
const dialog = ref(false);
const saving = ref(false);
const iconUploading = ref(false);
const toggling = ref(new Set<string>());
const editingId = ref<SysId>();
const formRef = ref<FormInstance>();
const defaults = (): ExternalLinkInput => ({
  title: '',
  kind: 'group',
  parent_id: null,
  url: '',
  open_mode: 'iframe',
  display_mode: 'menu',
  icon: '',
  description: '',
  sort: 0,
  enabled: true,
});
const form = reactive(defaults());
const tree = computed(() => buildExternalLinkTree(rows.value));
const filtered = computed(() => {
  function filter(nodes: ExternalLinkNode[]): ExternalLinkNode[] {
    return nodes.flatMap((node) => {
      const children = filter(node.children);
      const matches =
        `${node.title} ${node.url}`
          .toLowerCase()
          .includes(query.value.toLowerCase()) &&
        (!status.value || node.enabled === (status.value === 'enabled'));
      return matches || children.length ? [{ ...node, children }] : [];
    });
  }
  return filter(tree.value);
});
const parents = computed(() => {
  function options(
    nodes: ExternalLinkNode[],
  ): { children: ReturnType<typeof options>; label: string; value: string }[] {
    return nodes
      .filter(
        (node) =>
          node.kind === 'group' && String(node.id) !== String(editingId.value),
      )
      .map((node) => ({
        value: String(node.id),
        label: node.title,
        children: options(node.children),
      }));
  }
  return options(tree.value);
});
const rules: FormRules<ExternalLinkInput> = {
  title: [
    {
      required: true,
      whitespace: true,
      message: '请输入名称',
      trigger: 'blur',
    },
  ],
  url: [
    {
      validator: (_rule, value, callback) =>
        form.kind === 'group' || isSafeExternalUrl(value)
          ? callback()
          : callback(new Error('请输入有效的 HTTP/HTTPS 地址')),
      trigger: 'blur',
    },
  ],
};

async function load() {
  failed.value = false;
  try {
    rows.value = await getExternalLinksApi(true);
  } catch {
    rows.value = [];
    failed.value = true;
  }
}

async function edit(row?: ExternalLinkRecord, parent?: SysId) {
  editingId.value = row?.id;
  const { id: _id, ...values } = row || { ...defaults(), id: undefined };
  Object.assign(form, values, { parent_id: parent ?? values.parent_id });
  if (form.parent_id !== null) form.parent_id = String(form.parent_id);
  dialog.value = true;
  await nextTick();
  formRef.value?.clearValidate();
}

async function publish() {
  await gridApi.query();
  try {
    await refreshExternalPageRoutes(router);
  } catch {
    ElMessage.warning('配置已保存，菜单刷新失败，请刷新页面重试');
  }
}

async function save() {
  if (iconUploading.value || saving.value) return;
  if (!(await formRef.value?.validate().catch(() => false))) return;
  saving.value = true;
  try {
    const data = {
      ...form,
      title: form.title.trim(),
      url: form.kind === 'link' ? form.url.trim() : '',
    };
    if (editingId.value === undefined) await createExternalLinkApi(data);
    else await updateExternalLinkApi(editingId.value, data);
    dialog.value = false;
    ElMessage.success('配置已保存');
    await publish();
  } finally {
    saving.value = false;
  }
}

async function remove(row: ExternalLinkRecord) {
  try {
    await ElMessageBox.confirm(`确定删除“${row.title}”？`, '删除外部页面', {
      type: 'warning',
    });
  } catch {
    return;
  }
  await deleteExternalLinkApi(row.id);
  ElMessage.success('已删除');
  await publish();
}

async function toggle(row: ExternalLinkRecord) {
  const key = String(row.id);
  if (toggling.value.has(key)) return;
  toggling.value.add(key);
  const { id, ...data } = row;
  try {
    await updateExternalLinkApi(id, { ...data, enabled: !row.enabled });
    await publish();
  } finally {
    toggling.value.delete(key);
  }
}

const [Grid, gridApi] = useAdminGrid<ExternalLinkNode>({
  columns: () => [
    {
      field: 'title',
      title: '名称',
      minWidth: 230,
      treeNode: true,
      align: 'left',
      slots: { default: 'name' },
    },
    { field: 'kind', title: '类型', width: 90, slots: { default: 'kind' } },
    {
      field: 'display_mode',
      title: '展示 / 打开方式',
      width: 155,
      slots: { default: 'mode' },
    },
    { field: 'url', title: '页面地址', minWidth: 230 },
    { field: 'sort', title: '排序', width: 80 },
    {
      field: 'enabled',
      title: '状态',
      width: 90,
      slots: { default: 'status' },
    },
    {
      field: 'operation',
      title: '操作',
      width: 210,
      slots: { default: 'operation' },
    },
  ],
  schema: () => [
    {
      component: 'Input',
      fieldName: 'search',
      label: '名称 / 地址',
      componentProps: { placeholder: '搜索名称或地址', clearable: true },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: {
        clearable: true,
        options: [
          { label: '启用', value: 'enabled' },
          { label: '禁用', value: 'disabled' },
        ],
      },
    },
  ],
  query: async (_, values) => {
    query.value = values.search || '';
    status.value = values.status || '';
    await load();
    return { items: filtered.value };
  },
  gridOptions: {
    sortConfig: { remote: false },
    pagerConfig: { enabled: false },
    treeConfig: { rowField: 'id', childrenField: 'children', expandAll: true },
  },
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton class="gap-2" @click="edit()">
          <IconifyIcon icon="lucide:plus" class="size-4" />新增外部链接
        </VbenButton>
      </template>
      <template #toolbar-tools>
        <VbenIconButton
          tooltip="展开全部"
          aria-label="展开全部"
          @click="gridApi.grid.setAllTreeExpand(true)"
        >
          <IconifyIcon icon="lucide:chevrons-down" class="size-4" />
        </VbenIconButton>
        <VbenIconButton
          tooltip="折叠全部"
          aria-label="折叠全部"
          @click="gridApi.grid.setAllTreeExpand(false)"
        >
          <IconifyIcon icon="lucide:chevrons-up" class="size-4" />
        </VbenIconButton>
      </template>
      <template #name="{ row }">
        <span class="name-cell"><ExternalLinkIcon
          :icon="row.icon"
          class="size-4 shrink-0 object-contain"
        />{{ row.title }}</span>
      </template>
      <template #kind="{ row }">
        <ElTag :type="row.kind === 'group' ? 'info' : 'primary'">
          {{
            row.kind === 'group' ? '分类' : '链接'
          }}
        </ElTag>
      </template>
      <template #mode="{ row }">
        {{
          row.kind === 'group'
            ? row.display_mode === 'buttons'
              ? '分类按钮'
              : '多级菜单'
            : row.open_mode === 'iframe'
              ? '内嵌'
              : '新窗口'
        }}
      </template>
      <template #status="{ row }">
        <StatusSwitch
          :model-value="row.enabled"
          :loading="toggling.has(String(row.id))"
          :aria-label="`${row.title}启用状态`"
          @change="toggle(row)"
        />
      </template>
      <template #operation="{ row }">
        <ElButton link type="primary" @click="edit(row)">编辑</ElButton>
        <ElButton
          v-if="row.kind === 'group'"
          link
          type="primary"
          @click="edit(undefined, row.id)"
        >
          添加子项
        </ElButton>
        <ElButton
          link
          type="danger"
          :disabled="
            rows.some((item) => String(item.parent_id) === String(row.id))
          "
          @click="remove(row)"
        >
          删除
        </ElButton>
      </template>
      <template #table-title>
        <ElAlert
          v-if="failed"
          title="外部链接配置加载失败，请确认插件已启用后重试"
          type="error"
          :closable="false"
          show-icon
        />
      </template>
    </Grid>

    <ElDialog
      v-model="dialog"
      :title="editingId === undefined ? '新增外部页面' : '编辑外部页面'"
      width="620px"
      class="external-link-dialog"
      :close-on-click-modal="false"
      :before-close="(done) => !saving && !iconUploading && done()"
    >
      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="save"
      >
        <div class="form-grid">
          <ElFormItem label="类型" class="full">
            <ElRadioGroup
              v-model="form.kind"
              :disabled="
                editingId !== undefined &&
                  rows.some((row) => String(row.parent_id) === String(editingId))
              "
            >
              <ElRadioButton value="group">分类</ElRadioButton><ElRadioButton value="link">链接</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="名称" prop="title">
            <ElInput
              v-model="form.title"
              aria-label="名称"
              maxlength="100"
              placeholder="例如 Dify、Dify-1"
            />
          </ElFormItem>
          <ElFormItem label="父分类">
            <ElTreeSelect
              v-model="form.parent_id"
              :data="parents"
              check-strictly
              clearable
              filterable
              default-expand-all
              placeholder="顶级分类"
              class="w-full"
              @clear="form.parent_id = null"
            />
          </ElFormItem>
          <ElFormItem
            v-if="form.kind === 'group'"
            label="展示方式"
            class="full"
          >
            <ElRadioGroup v-model="form.display_mode">
              <ElRadioButton value="menu">多级菜单</ElRadioButton><ElRadioButton value="buttons"> 分类按钮 </ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <template v-else>
            <ElFormItem label="页面地址" prop="url" class="full">
              <ElInput
                v-model="form.url"
                maxlength="2048"
                placeholder="https://..."
              />
            </ElFormItem>
            <ElFormItem label="打开方式" class="full">
              <ElRadioGroup v-model="form.open_mode">
                <ElRadioButton value="iframe">内嵌</ElRadioButton><ElRadioButton value="external"> 新窗口 </ElRadioButton>
              </ElRadioGroup>
            </ElFormItem>
            <ElAlert
              v-if="form.open_mode === 'iframe'"
              class="full"
              title="内嵌需要目标网站允许 iframe 访问"
              type="info"
              show-icon
              :closable="false"
            />
          </template>
          <ElFormItem label="图标" class="full">
            <IconPicker
              v-model="form.icon"
              v-model:uploading="iconUploading"
              :disabled="saving"
            />
          </ElFormItem>
          <ElFormItem label="排序">
            <ElInputNumber
              v-model="form.sort"
              :min="0"
              :max="999999"
              controls-position="right"
              class="w-full"
            />
          </ElFormItem>
          <ElFormItem label="描述" class="full">
            <ElInput
              v-model="form.description"
              type="textarea"
              :rows="2"
              maxlength="500"
              show-word-limit
            />
          </ElFormItem>
          <ElFormItem label="状态">
            <StatusSwitch v-model="form.enabled" aria-label="配置状态" />
          </ElFormItem>
        </div>
      </ElForm>
      <template #footer>
        <ElButton :disabled="saving || iconUploading" @click="dialog = false">
          取消
        </ElButton><ElButton
          type="primary"
          :loading="saving"
          :disabled="iconUploading"
          @click="save"
        >
          保存
        </ElButton>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
.name-cell {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  max-width: 100%;
  overflow-wrap: anywhere;
  white-space: normal;
}

.name-cell :deep(svg) {
  flex-shrink: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
}

.full {
  grid-column: 1 / -1;
}

:global(.external-link-dialog) {
  max-width: calc(100vw - 24px);
}

@media (width <= 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
