<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  SysAddUserParams,
  SysResetPasswordParams,
  SysUpdateUserParams,
} from '#/api';
import type { SysRoleResult, SysUserResult } from '#/api';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal, VbenButton } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';

import { ElAvatar, ElMessage, ElTag, ElTooltip } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createSysUserApi,
  deleteSysUserApi,
  getAllSysRoleApi,
  getUsersApi,
  resetSysUserPasswordApi,
  updateSysUserApi,
} from '#/api';
import {
  querySchema,
  resetPwdSchema,
  useAddSchema,
  useColumns,
  useEditSchema,
} from './data';

const formOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  submitButtonOptions: {
    content: $t('common.query'),
  },
  schema: querySchema,
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
        ElMessage.success(`已删除用户 ${row.username}`);
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

const roleSelectOptions = ref<SysRoleResult[]>([]);
const fetchAllSysRole = async () => {
  try {
    roleSelectOptions.value = await getAllSysRoleApi();
  } catch {
    // ignore
  }
};

// --- 编辑用户 ---
const [EditForm, editFormApi] = useVbenForm({
  showDefaultActions: false,
  schema: useEditSchema(roleSelectOptions),
});

const editUserId = ref<number>(0);

const [editModal, editModalApi] = useVbenModal({
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await editFormApi.validate();
    if (valid) {
      editModalApi.lock();
      const data = await editFormApi.getValues<SysUpdateUserParams>();
      try {
        await updateSysUserApi(editUserId.value, data);
        ElMessage.success('操作成功');
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
        });
      }
    }
  },
});

// --- 添加用户 ---
const [AddForm, addFormApi] = useVbenForm({
  showDefaultActions: false,
  schema: useAddSchema(roleSelectOptions),
});

const [addModal, addModalApi] = useVbenModal({
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await addFormApi.validate();
    if (valid) {
      addModalApi.lock();
      const data = await addFormApi.getValues<SysAddUserParams>();
      try {
        await createSysUserApi(data);
        ElMessage.success('操作成功');
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
  schema: resetPwdSchema,
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
        ElMessage.success('操作成功');
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
  fetchAllSysRole();
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton @click="() => addModalApi.setData(null).open()">
          <IconifyIcon icon="material-symbols:add" class="mr-1 size-5" />
          添加用户
        </VbenButton>
      </template>
      <template #avatar="{ row }">
        <ElAvatar :src="row.avatar || preferences.app.defaultAvatar" :size="32" />
      </template>
      <template #dept="{ row }">
        <ElTag v-if="row.dept" type="success" size="small">
          {{ row.dept.name }}
        </ElTag>
        <span v-else>未绑定</span>
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
        <span v-else>未绑定</span>
      </template>
    </Grid>

    <editModal title="修改用户">
      <EditForm />
    </editModal>
    <addModal title="添加用户">
      <AddForm />
    </addModal>
    <resetPwdModal title="重置密码">
      <ResetPwdForm />
    </resetPwdModal>
  </Page>
</template>
