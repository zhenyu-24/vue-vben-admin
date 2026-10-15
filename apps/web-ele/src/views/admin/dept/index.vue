<script setup lang="ts">
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { SysDeptParams, SysDeptResult, SysDeptTreeParams } from '#/api';
import type { SysId } from '#/types/api';

import { computed, ref, watch } from 'vue';

import { Page, useVbenModal, VbenButton } from '@vben/common-ui';
import { $t, useI18n } from '@vben/locales';

import { ArrowDown, ArrowUp, Plus } from '@element-plus/icons-vue';
import { ElButton, ElTooltip } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import {
  createSysDeptApi,
  deleteSysDeptApi,
  getSysDeptDetailApi,
  getSysDeptTreeApi,
  updateSysDeptApi,
} from '#/api';

import { useAdminGrid } from '../shared/useAdminGrid';
import { useDeleteRow } from '../shared/useDeleteRow';
import { useFormSubmit } from '../shared/useFormSubmit';
import { useColumns, useQuerySchema, useSchema } from './data';
import { findParentId, getParentOptions, toDeptPayload } from './helpers';

defineOptions({ name: 'AdminDept' });

const [Grid, gridApi] = useAdminGrid<SysDeptResult>({
  columns: () => useColumns(onActionClick),
  schema: useQuerySchema,
  query: async (_: unknown, values: SysDeptTreeParams) => ({
    items: await getSysDeptTreeApi(values),
  }),
  gridOptions: {
    pagerConfig: { enabled: false },
    treeConfig: { rowField: 'id', parentField: 'parent_id', expandAll: true },
  },
});

type DeptFormData = Partial<SysDeptParams> & { id?: SysId };
const editingId = ref<SysId>();
const parents = ref<SysDeptResult[]>([]);
const ready = ref(false);
let openVersion = 0;
const title = computed(() =>
  $t(
    editingId.value === undefined
      ? 'organization.dept.add'
      : 'organization.dept.edit',
  ),
);
const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
  showDefaultActions: false,
  schema: useSchema(),
});
const [Modal, modalApi] = useVbenModal({
  class: 'w-[640px] max-w-[calc(100vw-2rem)]',
  destroyOnClose: true,
  async onOpenChange(isOpen) {
    const version = ++openVersion;
    if (!isOpen) return;
    const data = modalApi.getData<DeptFormData>();
    editingId.value = data.id;
    ready.value = false;
    parents.value = [];
    modalApi.setState({ loading: true, confirmDisabled: true });
    try {
      await formApi.resetForm();
      const [tree, detail] = await Promise.all([
        getSysDeptTreeApi(),
        data.id === undefined
          ? Promise.resolve(data)
          : getSysDeptDetailApi(data.id),
      ]);
      if (version !== openVersion) return;
      parents.value = getParentOptions(tree, data.id);
      formApi.setState({ schema: useSchema(parents.value) });
      // Resolve from tree links: numeric foreign keys may have lost Snowflake precision.
      const parentId =
        data.id === undefined ? data.parent_id : findParentId(tree, data.id);
      await formApi.setValues({
        name: '',
        sort: 0,
        status: 1,
        leader: '',
        phone: '',
        email: '',
        ...detail,
        parent_id:
          parentId === undefined ? (detail.parent_id ?? null) : parentId,
      });
      ready.value = true;
      modalApi.setState({ confirmDisabled: false });
    } catch {
      if (version === openVersion) await modalApi.close();
    } finally {
      if (version === openVersion) modalApi.setState({ loading: false });
    }
  },
  onConfirm: useFormSubmit<SysDeptParams>({
    form: () => formApi,
    modal: (): ReturnType<typeof useVbenModal>[1] => modalApi,
    canSubmit: () => ready.value,
    async save(values) {
      const data = toDeptPayload(values);
      await (editingId.value === undefined
        ? createSysDeptApi(data)
        : updateSysDeptApi(editingId.value, data));
    },
    successMessage: () => $t('organization.saved'),
    onSuccess: () => gridApi.query(),
  }),
});

const deleteRow = useDeleteRow<SysDeptResult>(
  gridApi,
  deleteSysDeptApi,
  (row) => $t('organization.deleted', { name: row.name }),
);

function onActionClick({ code, row }: OnActionClickParams<SysDeptResult>) {
  if (code === 'add') modalApi.setData({ parent_id: row.id }).open();
  if (code === 'edit') modalApi.setData({ id: row.id }).open();
  if (code === 'delete') return deleteRow(row);
}

const { locale } = useI18n();
watch(locale, () => {
  formApi.setState({ schema: useSchema(parents.value) });
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton @click="modalApi.setData({}).open()">
          <Plus class="mr-1 size-4" />
          {{ $t('organization.dept.add') }}
        </VbenButton>
      </template>
      <template #toolbar-tools>
        <ElTooltip :content="$t('organization.expandAll')">
          <ElButton
            :icon="ArrowDown"
            :aria-label="$t('organization.expandAll')"
            @click="gridApi.grid.setAllTreeExpand(true)"
          />
        </ElTooltip>
        <ElTooltip :content="$t('organization.collapseAll')">
          <ElButton
            :icon="ArrowUp"
            :aria-label="$t('organization.collapseAll')"
            @click="gridApi.grid.setAllTreeExpand(false)"
          />
        </ElTooltip>
      </template>
    </Grid>
    <Modal :title="title"><Form /></Modal>
  </Page>
</template>
