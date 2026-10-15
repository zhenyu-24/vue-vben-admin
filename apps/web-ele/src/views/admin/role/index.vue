<script setup lang="ts">
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { SysRoleForm, SysRoleResult } from '#/api';

import { computed, ref, watch } from 'vue';

import { Page, useVbenModal, VbenButton } from '@vben/common-ui';
import { $t, useI18n } from '@vben/locales';

import { Plus } from '@element-plus/icons-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createSysRoleApi,
  deleteSysRoleApi,
  getSysRoleListApi,
  updateSysRoleApi,
} from '#/api';

import { pagedQuery, useAdminGrid } from '../shared/useAdminGrid';
import { useDeleteRow } from '../shared/useDeleteRow';
import { useFormSubmit } from '../shared/useFormSubmit';
import { useColumns, useQuerySchema, useSchema } from './data';

defineOptions({ name: 'AdminRole' });

const [Grid, gridApi] = useAdminGrid<SysRoleResult>({
  columns: () => useColumns(onActionClick),
  schema: useQuerySchema,
  query: pagedQuery(getSysRoleListApi),
});

const editing = ref<SysRoleResult>();
const title = computed(() =>
  $t(editing.value ? 'organization.role.edit' : 'organization.role.add'),
);
const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  showDefaultActions: false,
  schema: useSchema(),
});
const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  class: 'w-[520px] max-w-[calc(100vw-2rem)]',
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData<Partial<SysRoleResult>>();
    editing.value = data.id === undefined ? undefined : (data as SysRoleResult);
    await formApi.resetForm();
    await formApi.setValues({
      name: data.name ?? '',
      status: data.status ?? 1,
      remark: data.remark ?? '',
    });
  },
  onConfirm: useFormSubmit<SysRoleForm>({
    form: () => formApi,
    modal: (): ReturnType<typeof useVbenModal>[1] => modalApi,
    async save(values) {
      const data: SysRoleForm = {
        name: values.name.trim(),
        status: values.status,
        is_filter_scopes: editing.value?.is_filter_scopes ?? false,
        remark: values.remark?.trim() || null,
      };
      await (editing.value
        ? updateSysRoleApi(editing.value.id, data)
        : createSysRoleApi(data));
    },
    successMessage: () => $t('organization.saved'),
    onSuccess: () => gridApi.query(),
  }),
});

const deleteRow = useDeleteRow<SysRoleResult>(
  gridApi,
  (id) => deleteSysRoleApi([id]),
  (row) => $t('organization.deleted', { name: row.name }),
);

function onActionClick({ code, row }: OnActionClickParams<SysRoleResult>) {
  if (code === 'edit') modalApi.setData(row).open();
  if (code === 'delete') return deleteRow(row);
}

const { locale } = useI18n();
watch(locale, () => {
  formApi.setState({ schema: useSchema() });
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton @click="modalApi.setData({}).open()">
          <Plus class="mr-1 size-4" />
          {{ $t('organization.role.add') }}
        </VbenButton>
      </template>
    </Grid>
    <Modal :title="title"><Form /></Modal>
  </Page>
</template>
