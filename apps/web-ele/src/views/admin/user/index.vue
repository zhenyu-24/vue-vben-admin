<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { SysUserResult } from '#/api';

import { onMounted, watch } from 'vue';

import { Page, VbenButton, VbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t, useI18n } from '@vben/locales';
import { preferences } from '@vben/preferences';

import { ElAvatar, ElMessage, ElTag, ElTooltip } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteSysUserApi, getAllSysDeptApi, getAllSysRoleApi, getUsersApi } from '#/api';
import { useColumns, useQuerySchema } from './data';

import { useUserModals } from './useUserModal';

// --- 查询表格 ---
const formOptions: VbenFormProps = {
  collapsed: true,  // 默认折叠
  showCollapseButton: true, // 默认折叠
  submitButtonOptions: { content: $t('common.query') }, // 查询按钮文案
  schema: useQuerySchema(), // 查询表单
};

// 表格设置
const gridOptions: VxeGridProps<SysUserResult> = {
  // 行唯一标识
  rowConfig: { keyField: 'id' },
  // 表头
  columns: useColumns(onActionClick),
  // 导出、打印
  exportConfig: {},
  printConfig: {},
  // 表格高度
  height: 'auto',
  minHeight: 200,
  // 保留原始数据，方便导出
  keepSource: true,
  // 加载数据
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
  // 排序
  sortConfig: {},
  // 工具栏
  toolbarConfig: {
    export: true,
    print: false,
    refresh: true,
    refreshOptions: { code: 'query' },
    custom: true,
    zoom: true,
  },
};

// 使用设置
const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

// 刷新表格
function onRefresh() {
  gridApi.query();
}

// --- 模态框（抽取到 composable） ---
const {
  EditForm, editModalApi, editUserId,
  AddForm, addModalApi,
  ResetPwdForm, resetPwdModalApi,
  setFormSelectOptions,
  updateSchemas,
} = useUserModals(onRefresh);

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

// --- 初始化 ---
onMounted(async () => {
  const [roles, depts] = await Promise.all([getAllSysRoleApi(), getAllSysDeptApi()]);
  setFormSelectOptions(roles, depts);
});

const { locale } = useI18n();
watch(locale, () => {
  gridApi.setGridOptions({ columns: useColumns(onActionClick) });
  gridApi.formApi.setState({
    schema: useQuerySchema(),
    submitButtonOptions: { content: $t('common.query') },
  });
  updateSchemas();
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

    <VbenModal :modal-api="editModalApi" :title="$t('page.admin.userPage.modal.edit')">
      <EditForm />
    </VbenModal>
    <VbenModal :modal-api="addModalApi" :title="$t('page.admin.userPage.modal.add')">
      <AddForm />
    </VbenModal>
    <VbenModal :modal-api="resetPwdModalApi" :title="$t('page.admin.userPage.modal.resetPassword')">
      <ResetPwdForm />
    </VbenModal>
  </Page>
</template>
