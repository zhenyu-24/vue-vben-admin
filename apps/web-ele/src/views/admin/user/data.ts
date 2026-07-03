import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeGridProps } from '#/adapter/vxe-table';
import type { SysUserResult } from '#/api';

import { ElMessage } from 'element-plus';

import { updateSysUserPermissionApi } from '#/api';

export const querySchema: VbenFormSchema[] = [
  {
    component: 'Input',
    fieldName: 'username',
    label: '用户名',
  },
  {
    component: 'Input',
    fieldName: 'phone',
    label: '手机号',
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: [
        { label: '正常', value: 1 },
        { label: '停用', value: 0 },
      ],
    },
    fieldName: 'status',
    label: '状态',
  },
];

function createPermissionSwitch(type: string, props?: Record<string, any>) {
  return {
    name: 'CellSwitch',
    attrs: {
      async beforeChange(_checked: any, row: SysUserResult) {
        await updateSysUserPermissionApi(row.id, type);
        ElMessage.success('操作成功');
      },
    },
    props,
  };
}

export function useColumns(
  onActionClick?: OnActionClickFn<SysUserResult>,
): VxeGridProps['columns'] {
  return [
    { field: 'seq', title: '序号', type: 'seq', fixed: 'left', width: 50 },
    { field: 'username', title: '用户名', fixed: 'left', width: 100 },
    { field: 'nickname', title: '昵称', width: 100 },
    {
      field: 'avatar',
      title: '头像',
      width: 80,
      slots: { default: 'avatar' },
    },
    {
      field: 'dept',
      title: '部门',
      width: 120,
      slots: { default: 'dept' },
    },
    {
      field: 'roles',
      title: '角色',
      width: 200,
      showOverflow: 'ellipsis',
      slots: { default: 'roles' },
    },
    {
      field: 'phone',
      title: '手机号',
      width: 150,
      formatter({ cellValue }: any) {
        return cellValue || '暂无';
      },
    },
    {
      field: 'email',
      title: '邮箱',
      width: 150,
      formatter({ cellValue }: any) {
        return cellValue || '暂无';
      },
    },
    {
      field: 'status',
      title: '状态',
      width: 100,
      cellRender: createPermissionSwitch('status'),
    },
    {
      field: 'is_superuser',
      title: '超级管理员',
      width: 100,
      cellRender: createPermissionSwitch('superuser', {
        activeValue: true,
        inactiveValue: false,
      }),
    },
    {
      field: 'is_staff',
      title: '后台登录',
      width: 100,
      cellRender: createPermissionSwitch('staff', {
        activeValue: true,
        inactiveValue: false,
      }),
    },
    {
      field: 'is_multi_login',
      title: '多端登录',
      width: 100,
      cellRender: createPermissionSwitch('multi_login', {
        activeValue: true,
        inactiveValue: false,
      }),
    },
    { field: 'join_time', title: '注册时间', width: 168 },
    { field: 'last_login_time', title: '最后登录时间', width: 168 },
    {
      field: 'operation',
      title: '操作',
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
          'edit',
          {
            code: 'delete',
            disabled: (row: SysUserResult) => row.username === 'admin',
          },
          {
            code: 'reset_password',
            text: '重置密码',
          },
        ],
      },
    },
  ];
}

export function useEditSchema(roleSelectOptions: any): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'username',
      label: '用户名',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'nickname',
      label: '昵称',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'avatar',
      label: '头像地址',
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: '手机号码',
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: '邮箱',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        mode: 'multiple',
        options: roleSelectOptions,
        fieldNames: { label: 'name', value: 'id' },
        filterOption: (input: string, option: any) => {
          return option.name?.toLowerCase()?.includes(input.toLowerCase()) ?? false;
        },
      },
      fieldName: 'roles',
      label: '角色',
      rules: 'selectRequired',
    },
  ];
}

export function useAddSchema(roleSelectOptions: any): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'username',
      label: '用户名',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'nickname',
      label: '昵称',
    },
    {
      component: 'InputPassword',
      fieldName: 'password',
      label: '密码',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: '手机号码',
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: '邮箱',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        mode: 'multiple',
        options: roleSelectOptions,
        fieldNames: { label: 'name', value: 'id' },
        filterOption: (input: string, option: any) => {
          return option.name?.toLowerCase()?.includes(input.toLowerCase()) ?? false;
        },
      },
      fieldName: 'roles',
      label: '角色',
      rules: 'selectRequired',
    },
  ];
}

export const resetPwdSchema: VbenFormSchema[] = [
  {
    component: 'InputPassword',
    fieldName: 'password',
    label: '新密码',
    rules: 'required',
  },
];
