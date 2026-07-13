<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  SysAddUserParams,
  SysResetPasswordParams,
  SysUpdateUserParams,
} from '#/api';
import type { SysUserResult } from '#/api';

import { onMounted, ref, watch } from 'vue';

import { Page, useVbenModal, VbenButton } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t, useI18n } from '@vben/locales';
import { preferences } from '@vben/preferences';

import { ElAvatar, ElMessage, ElTag, ElTooltip } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createSysUserApi,
  deleteSysUserApi,
  getAllSysDeptApi,
  getAllSysRoleApi,
  getUsersApi,
  resetSysUserPasswordApi,
  updateSysUserApi,
} from '#/api';
import {
  useAddSchema,
  useColumns,
  useEditSchema,
  useQuerySchema,
  useResetPwdSchema,
} from './data';

const formOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  submitButtonOptions: {
    content: $t('common.query'),
  },
  schema: useQuerySchema(),
};

const gridOptions: VxeTableGridOptions<SysUserResult> = {
  rowConfig: {
    keyField: 'id',
  },
  checkboxConfig: {
    highlight: true,
  },
  height: 'auto',
  exportConfig: {},
  printConfig: {},
  toolbarConfig: {
    export: true,
    print: false,
    refresh: true,
    refreshOptions: {
      code: 'query',
    },
    custom: true,
    zoom: true,
  },
  columns: useColumns(onActionClick),
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        return await getUsersApi({
          page: page.currentPage,
          size: page.pageSize,
          ...formValues,
        });
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

function onRefresh() {
  gridApi.query();
}

async function onActionClick({ code, row }: any) {
  switch (code) {
    case 'delete': {
      gridApi.setLoading(true);
      try {
        await deleteSysUserApi(row.id);
        ElMessage.success($t('page.admin.userPage.message.deleteSuccess', { username: row.username }));
        onRefresh();
      } finally {
        gridApi.setLoading(false);
      }
      break;
    }
    case 'edit': {
      editUserId.value = row.id;
      editModalApi.setData(row).open();
      break;
    }
    case 'reset_password': {
      editUserId.value = row.id;
      resetPwdModalApi.setData(null).open();
      break;
    }
  }
}

const loadFormOptions = async () => {
  const [roles, depts] = await Promise.all([
    getAllSysRoleApi(),
    getAllSysDeptApi(),
  ]);
  const setOpts = (api: typeof editFormApi) => {
    const cur = [...(api.state?.schema ?? [])];
    cur.forEach((item, idx) => {
      if (item.fieldName === 'roles') {
        cur[idx] = { ...item, componentProps: { ...item.componentProps, options: roles } };
      } else if (item.fieldName === 'dept_id') {
        cur[idx] = { ...item, componentProps: { ...item.componentProps, options: depts } };
      }
    });
    api.setState({ schema: cur });
  };
  setOpts(editFormApi);
  setOpts(addFormApi);
};

// --- 编辑用户 ---
const [EditForm, editFormApi] = useVbenForm({
  showDefaultActions: false,
  schema: useEditSchema(),
});

const editUserId = ref<number>(0);

const [editModal, editModalApi] = useVbenModal({
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await editFormApi.validate();
    if (valid) {
      editModalApi.lock();
      const data = await editFormApi.getValues<SysUpdateUserParams>();
      data.dept_id = data.dept_id ?? null;
      try {
        await updateSysUserApi(editUserId.value, data);
        ElMessage.success($t('page.admin.userPage.message.operationSuccess'));
        await editModalApi.close();
        onRefresh();
      } finally {
        editModalApi.unlock();
      }
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = editModalApi.getData<any>();
      editFormApi.resetForm();
      if (data) {
        editFormApi.setValues({
          ...data,
          roles: data.roles?.map((item: any) => item.id) || [],
          dept_id: data.dept?.id ?? undefined,
        });
      }
    }
  },
});

// --- 添加用户 ---
const [AddForm, addFormApi] = useVbenForm({
  showDefaultActions: false,
  schema: useAddSchema(),
});

const [addModal, addModalApi] = useVbenModal({
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await addFormApi.validate();
    if (valid) {
      addModalApi.lock();
      const data = await addFormApi.getValues<SysAddUserParams>();
      data.dept_id = data.dept_id ?? null;
      try {
        await createSysUserApi(data);
        ElMessage.success($t('page.admin.userPage.message.operationSuccess'));
        await addModalApi.close();
        onRefresh();
      } finally {
        addModalApi.unlock();
      }
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      addFormApi.resetForm();
    }
  },
});

// --- 重置密码 ---
const [ResetPwdForm, resetPwdFormApi] = useVbenForm({
  layout: 'vertical',
  showDefaultActions: false,
  schema: useResetPwdSchema(),
});

const [resetPwdModal, resetPwdModalApi] = useVbenModal({
  destroyOnClose: true,
  centered: true,
  async onConfirm() {
    const { valid } = await resetPwdFormApi.validate();
    if (valid) {
      resetPwdModalApi.lock();
      const data = await resetPwdFormApi.getValues<SysResetPasswordParams>();
      try {
        await resetSysUserPasswordApi(editUserId.value, data);
        ElMessage.success($t('page.admin.userPage.message.operationSuccess'));
        await resetPwdModalApi.close();
      } finally {
        resetPwdModalApi.unlock();
      }
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      resetPwdFormApi.resetForm();
    }
  },
});

onMounted(() => {
  loadFormOptions();
});

const { locale } = useI18n();

watch(locale, () => {
  // Grid columns & operation buttons
  gridApi.setGridOptions({ columns: useColumns(onActionClick) });

  // Query form schema + submit button
  gridApi.formApi.setState({
    schema: useQuerySchema(),
    submitButtonOptions: { content: $t('common.query') },
  });

  // Edit form
  editFormApi.setState({ schema: useEditSchema() });

  // Add form
  addFormApi.setState({ schema: useAddSchema() });

  // Reset password form
  resetPwdFormApi.setState({ schema: useResetPwdSchema() });
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton @click="() => addModalApi.setData(null).open()">
          <IconifyIcon icon="material-symbols:add" class="mr-1 size-5" />
          {{ $t('page.admin.userPage.modal.add') }}
        </VbenButton>
      </template>
      <template #avatar="{ row }">
        <ElAvatar :src="row.avatar || preferences.app.defaultAvatar" :size="32" />
      </template>
      <template #dept="{ row }">
        <ElTag v-if="row.dept" type="success" size="small">
          {{ row.dept.name }}
        </ElTag>
        <span v-else>{{ $t('page.admin.userPage.message.unbound') }}</span>
      </template>
      <template #roles="{ row }">
        <template v-if="row.roles.length === 1">
          <ElTag type="primary" size="small">
            {{ row.roles[0]?.name }}
          </ElTag>
        </template>
        <template v-else-if="row.roles.length > 1">
          <ElTooltip placement="top" :content="row.roles.map((r: any) => r.name).join(', ')" :width="300">
            <ElTag v-for="role in row.roles" :key="role.name" type="primary" size="small" class="mr-1">
              {{ role.name }}
            </ElTag>
          </ElTooltip>
        </template>
        <span v-else>{{ $t('page.admin.userPage.message.unbound') }}</span>
      </template>
    </Grid>

    <editModal :title="$t('page.admin.userPage.modal.edit')">
      <EditForm />
    </editModal>
    <addModal :title="$t('page.admin.userPage.modal.add')">
      <AddForm />
    </addModal>
    <resetPwdModal :title="$t('page.admin.userPage.modal.resetPassword')">
      <ResetPwdForm />
    </resetPwdModal>
  </Page>
</template>
