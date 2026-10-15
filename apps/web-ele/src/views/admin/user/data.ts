import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeGridProps } from '#/adapter/vxe-table';
import type { SysDeptResult, SysRoleResult, SysUserResult } from '#/api';

import { $t } from '@vben/locales';

import { ElMessage } from 'element-plus';

import { updateSysUserPermissionApi } from '#/api';

import { departmentField } from '../shared/data';

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
        clearable: true,
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

function createPermissionSwitch(
  type: string,
  props?: { activeValue: boolean; inactiveValue: boolean },
) {
  return {
    name: 'CellSwitch',
    attrs: {
      async beforeChange(_checked: boolean | number, row: SysUserResult) {
        await updateSysUserPermissionApi(row.id, type);
        ElMessage.success($t('page.admin.userPage.message.operationSuccess'));
      },
    },
    props: {
      inlinePrompt: true,
      activeText: $t('page.admin.userPage.status.enabledText'),
      inactiveText: $t('page.admin.userPage.status.disabledText'),
      width: 76,
      ...props,
    },
  };
}

export function useColumns(
  onActionClick?: OnActionClickFn<SysUserResult>,
): VxeGridProps<SysUserResult>['columns'] {
  return [
    {
      field: 'seq',
      title: $t('page.admin.userPage.column.seq'),
      type: 'seq',
      fixed: 'left',
      width: 50,
    },
    {
      field: 'username',
      title: $t('page.admin.userPage.column.username'),
      fixed: 'left',
      sortable: true,
      width: 100,
    },
    {
      field: 'nickname',
      title: $t('page.admin.userPage.column.nickname'),
      sortable: true,
      width: 100,
    },
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
      formatter({ cellValue }) {
        return cellValue || $t('page.admin.userPage.message.noData');
      },
    },
    {
      field: 'email',
      title: $t('page.admin.userPage.column.email'),
      width: 150,
      formatter({ cellValue }) {
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
    {
      field: 'join_time',
      title: $t('page.admin.userPage.column.joinTime'),
      width: 168,
    },
    {
      field: 'last_login_time',
      title: $t('page.admin.userPage.column.lastLogin'),
      width: 168,
    },
    {
      field: 'operation',
      title: $t('page.admin.userPage.column.operation'),
      align: 'center',
      fixed: 'right',
      width: 150,
      showOverflow: false,
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

function roleField(roles: SysRoleResult[]): VbenFormSchema {
  return {
    component: 'Select',
    componentProps: {
      class: 'w-full',
      multiple: true,
      filterable: true,
      options: roles.map((role) => ({
        ...role,
        disabled: role.status !== 1,
      })),
      props: { label: 'name', value: 'id' },
    },
    fieldName: 'roles',
    label: $t('page.admin.userPage.form.role'),
  };
}

function useUserSchema(
  editing: boolean,
  roles: SysRoleResult[] = [],
  departments: SysDeptResult[] = [],
): VbenFormSchema[] {
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
      rules: editing ? 'required' : undefined,
    },
    ...(editing
      ? []
      : [passwordField($t('page.admin.userPage.form.password'))]),
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
    roleField(roles),
    departmentField(
      'dept_id',
      $t('page.admin.userPage.form.dept'),
      departments,
      true,
    ),
  ];
}

export function useEditSchema(
  roles: SysRoleResult[] = [],
  departments: SysDeptResult[] = [],
) {
  return useUserSchema(true, roles, departments);
}

export function useAddSchema(
  roles: SysRoleResult[] = [],
  departments: SysDeptResult[] = [],
) {
  return useUserSchema(false, roles, departments);
}

function passwordField(label: string): VbenFormSchema {
  return {
    component: 'Input',
    componentProps: {
      type: 'password',
      showPassword: true,
    },
    fieldName: 'password',
    label,
    rules: 'required',
  };
}

export function useResetPwdSchema(): VbenFormSchema[] {
  return [passwordField($t('page.admin.userPage.form.newPassword'))];
}
