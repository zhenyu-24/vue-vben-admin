import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeGridProps } from '#/adapter/vxe-table';
import type { SysUserResult } from '#/api';

import { ElMessage } from 'element-plus';

import { $t } from '@vben/locales';

import { updateSysUserPermissionApi } from '#/api';

export function useQuerySchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'username',
      label: $t('page.admin.userPage.form.username'),
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: $t('page.admin.userPage.form.phone'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: $t('page.admin.userPage.status.normal'), value: 1 },
          { label: $t('page.admin.userPage.status.disabled'), value: 0 },
        ],
      },
      fieldName: 'status',
      label: $t('page.admin.userPage.form.status'),
    },
  ];
}

function createPermissionSwitch(type: string, props?: Record<string, any>) {
  return {
    name: 'CellSwitch',
    attrs: {
      async beforeChange(_checked: any, row: SysUserResult) {
        await updateSysUserPermissionApi(row.id, type);
        ElMessage.success($t('page.admin.userPage.message.operationSuccess'));
      },
    },
    props,
  };
}

export function useColumns(
  onActionClick?: OnActionClickFn<SysUserResult>,
): VxeGridProps['columns'] {
  return [
    { field: 'seq', title: $t('page.admin.userPage.column.seq'), type: 'seq', fixed: 'left', width: 50 },
    { field: 'username', title: $t('page.admin.userPage.column.username'), fixed: 'left', width: 100 },
    { field: 'nickname', title: $t('page.admin.userPage.column.nickname'), width: 100 },
    {
      field: 'avatar',
      title: $t('page.admin.userPage.column.avatar'),
      width: 80,
      slots: { default: 'avatar' },
    },
    {
      field: 'dept',
      title: $t('page.admin.userPage.column.dept'),
      width: 120,
      slots: { default: 'dept' },
    },
    {
      field: 'roles',
      title: $t('page.admin.userPage.column.roles'),
      width: 200,
      showOverflow: 'ellipsis',
      slots: { default: 'roles' },
    },
    {
      field: 'phone',
      title: $t('page.admin.userPage.column.phone'),
      width: 150,
      formatter({ cellValue }: any) {
        return cellValue || $t('page.admin.userPage.message.noData');
      },
    },
    {
      field: 'email',
      title: $t('page.admin.userPage.column.email'),
      width: 150,
      formatter({ cellValue }: any) {
        return cellValue || $t('page.admin.userPage.message.noData');
      },
    },
    {
      field: 'status',
      title: $t('page.admin.userPage.column.status'),
      width: 100,
      cellRender: createPermissionSwitch('status'),
    },
    {
      field: 'is_superuser',
      title: $t('page.admin.userPage.column.superuser'),
      width: 100,
      cellRender: createPermissionSwitch('superuser', {
        activeValue: true,
        inactiveValue: false,
      }),
    },
    {
      field: 'is_staff',
      title: $t('page.admin.userPage.column.staff'),
      width: 100,
      cellRender: createPermissionSwitch('staff', {
        activeValue: true,
        inactiveValue: false,
      }),
    },
    {
      field: 'is_multi_login',
      title: $t('page.admin.userPage.column.multiLogin'),
      width: 100,
      cellRender: createPermissionSwitch('multi_login', {
        activeValue: true,
        inactiveValue: false,
      }),
    },
    { field: 'join_time', title: $t('page.admin.userPage.column.joinTime'), width: 168 },
    { field: 'last_login_time', title: $t('page.admin.userPage.column.lastLogin'), width: 168 },
    {
      field: 'operation',
      title: $t('page.admin.userPage.column.operation'),
      align: 'center',
      fixed: 'right',
      width: 150,
      cellRender: {
        attrs: {
          nameField: 'username',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { code: 'edit', text: $t('common.edit') },
          {
            code: 'delete',
            text: $t('common.delete'),
            disabled: (row: SysUserResult) => row.username === 'admin',
          },
          {
            code: 'reset_password',
            text: $t('page.admin.userPage.action.resetPassword'),
          },
        ],
      },
    },
  ];
}

export function useEditSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'username',
      label: $t('page.admin.userPage.form.username'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'nickname',
      label: $t('page.admin.userPage.form.nickname'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: $t('page.admin.userPage.form.phoneNumber'),
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: $t('page.admin.userPage.form.email'),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        multiple: true,
        props: { label: 'name', value: 'id' },
        filterOption: (input: string, option: any) => {
          return option.name?.toLowerCase()?.includes(input.toLowerCase()) ?? false;
        },
      },
      fieldName: 'roles',
      label: $t('page.admin.userPage.form.role'),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        clearable: true,
        placeholder: $t('page.admin.userPage.form.placeholder'),
        props: { label: 'name', value: 'id' },
        filterOption: (input: string, option: any) => {
          return option.name?.toLowerCase()?.includes(input.toLowerCase()) ?? false;
        },
      },
      fieldName: 'dept_id',
      label: $t('page.admin.userPage.form.dept'),
    },
  ];
}

export function useAddSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'username',
      label: $t('page.admin.userPage.form.username'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'nickname',
      label: $t('page.admin.userPage.form.nickname'),
    },
    {
      component: 'Input',
      componentProps: {
        type: 'password',
        showPassword: true,
      },
      fieldName: 'password',
      label: $t('page.admin.userPage.form.password'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: $t('page.admin.userPage.form.phoneNumber'),
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: $t('page.admin.userPage.form.email'),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        multiple: true,
        props: { label: 'name', value: 'id' },
        filterOption: (input: string, option: any) => {
          return option.name?.toLowerCase()?.includes(input.toLowerCase()) ?? false;
        },
      },
      fieldName: 'roles',
      label: $t('page.admin.userPage.form.role'),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        clearable: true,
        placeholder: $t('page.admin.userPage.form.placeholder'),
        props: { label: 'name', value: 'id' },
        filterOption: (input: string, option: any) => {
          return option.name?.toLowerCase()?.includes(input.toLowerCase()) ?? false;
        },
      },
      fieldName: 'dept_id',
      label: $t('page.admin.userPage.form.dept'),
    },
  ];
}

export function useResetPwdSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        type: 'password',
        showPassword: true,
      },
      fieldName: 'password',
      label: $t('page.admin.userPage.form.newPassword'),
      rules: 'required',
    },
  ];
}
