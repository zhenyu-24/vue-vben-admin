<script setup lang="ts">
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { SysUserResult } from '#/api';

import { watch } from 'vue';

import { EllipsisText, Page, VbenAvatar, VbenButton } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { $t, useI18n } from '@vben/locales';
import { preferences } from '@vben/preferences';

import { ElTag } from 'element-plus';

import { deleteSysUserApi, getUsersApi } from '#/api';

import { pagedQuery, useAdminGrid } from '../shared/useAdminGrid';
import { useDeleteRow } from '../shared/useDeleteRow';
import { useColumns, useQuerySchema } from './data';
import { useUserModals } from './useUserModal';

defineOptions({ name: 'AdminUser' });

const [Grid, gridApi] = useAdminGrid<SysUserResult>({
  columns: () => useColumns(onActionClick),
  schema: useQuerySchema,
  query: pagedQuery(getUsersApi),
  gridOptions: {
    minHeight: 200,
  },
});

const {
  UserForm,
  UserModal,
  userModalApi,
  userModalTitle,
  ResetPwdForm,
  ResetPwdModal,
  resetPwdModalApi,
  updateSchemas,
} = useUserModals(() => gridApi.query());

const deleteRow = useDeleteRow<SysUserResult>(
  gridApi,
  deleteSysUserApi,
  (row) =>
    $t('page.admin.userPage.message.deleteSuccess', { username: row.username }),
);

function onActionClick({ code, row }: OnActionClickParams<SysUserResult>) {
  if (code === 'edit') userModalApi.setData(row).open();
  if (code === 'reset_password') {
    resetPwdModalApi.setData(row).open();
  }
  if (code === 'delete') return deleteRow(row);
}

const { locale } = useI18n();
watch(locale, updateSchemas);
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton class="gap-2" @click="userModalApi.setData({}).open()">
          <Plus class="size-4 shrink-0" aria-hidden="true" />
          {{ $t('page.admin.userPage.modal.add') }}
        </VbenButton>
      </template>
      <template #avatar="{ row }">
        <VbenAvatar
          :alt="row.nickname || row.username"
          :src="row.avatar || preferences.app.defaultAvatar"
          :size="32"
        />
      </template>
      <template #dept="{ row }">
        <ElTag v-if="row.dept" type="success" size="small">
          {{ row.dept.name }}
        </ElTag>
        <span v-else>{{ $t('page.admin.userPage.message.unbound') }}</span>
      </template>
      <template #roles="{ row }">
        <EllipsisText v-if="row.roles.length > 0">
          <template #tooltip>
            {{
              row.roles
                .map((role: SysUserResult['roles'][number]) => role.name)
                .join(', ')
            }}
          </template>
          <ElTag
            v-for="role in row.roles"
            :key="role.id"
            type="primary"
            size="small"
            class="mr-1"
          >
            {{ role.name }}
          </ElTag>
        </EllipsisText>
        <span v-else>{{ $t('page.admin.userPage.message.unbound') }}</span>
      </template>
    </Grid>

    <UserModal :title="userModalTitle">
      <UserForm />
    </UserModal>
    <ResetPwdModal :title="$t('page.admin.userPage.modal.resetPassword')">
      <ResetPwdForm />
    </ResetPwdModal>
  </Page>
</template>
