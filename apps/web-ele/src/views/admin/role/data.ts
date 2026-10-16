import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeGridProps } from '#/adapter/vxe-table';
import type { SysRoleResult } from '#/api';

import { $t } from '@vben/locales';

import { z } from '#/adapter/form';

import { statusCellRender, statusOptions } from '../shared/data';

export function useQuerySchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('organization.role.name'),
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: $t('organization.status'),
      componentProps: { clearable: true, options: statusOptions() },
    },
  ];
}

export function useColumns(
  onClick: OnActionClickFn<SysRoleResult>,
): VxeGridProps<SysRoleResult>['columns'] {
  return [
    { type: 'seq', width: 60 },
    { field: 'name', title: $t('organization.role.name'), minWidth: 140 },
    {
      field: 'status',
      title: $t('organization.status'),
      width: 100,
      cellRender: statusCellRender(),
    },
    { field: 'remark', title: $t('organization.remark'), minWidth: 160 },
    {
      field: 'created_time',
      title: $t('organization.createdTime'),
      width: 168,
    },
    {
      field: 'updated_time',
      title: $t('organization.updatedTime'),
      width: 168,
    },
    {
      field: 'operation',
      title: $t('organization.operation'),
      align: 'center',
      fixed: 'right',
      width: 150,
      showOverflow: false,
      cellRender: {
        name: 'CellOperation',
        attrs: { nameField: 'name', onClick },
        options: [
          { code: 'edit', text: $t('common.edit') },
          { code: 'delete', text: $t('common.delete') },
        ],
      },
    },
  ];
}

export function useSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('organization.role.name'),
      rules: z.string().trim().min(1, $t('organization.requiredName')),
    },
    {
      component: 'RadioGroup',
      fieldName: 'status',
      label: $t('organization.status'),
      defaultValue: 1,
      rules: 'selectRequired',
      componentProps: { options: statusOptions() },
    },
    {
      component: 'Input',
      fieldName: 'remark',
      label: $t('organization.remark'),
      componentProps: { type: 'textarea', rows: 3 },
    },
  ];
}
