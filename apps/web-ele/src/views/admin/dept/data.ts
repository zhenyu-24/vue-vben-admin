import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeGridProps } from '#/adapter/vxe-table';
import type { SysDeptResult } from '#/api';

import { $t } from '@vben/locales';

import { z } from '#/adapter/form';

import {
  departmentField,
  statusCellRender,
  statusOptions,
} from '../shared/data';

export function useQuerySchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('organization.dept.name'),
    },
    {
      component: 'Input',
      fieldName: 'leader',
      label: $t('organization.dept.leader'),
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: $t('organization.dept.phone'),
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
  onClick: OnActionClickFn<SysDeptResult>,
): VxeGridProps<SysDeptResult>['columns'] {
  return [
    {
      field: 'name',
      title: $t('organization.dept.name'),
      align: 'left',
      treeNode: true,
      minWidth: 220,
    },
    { field: 'leader', title: $t('organization.dept.leader'), minWidth: 110 },
    { field: 'phone', title: $t('organization.dept.phone'), minWidth: 140 },
    { field: 'email', title: $t('organization.dept.email'), minWidth: 180 },
    { field: 'sort', title: $t('organization.dept.sort'), width: 80 },
    {
      field: 'status',
      title: $t('organization.status'),
      width: 90,
      cellRender: statusCellRender(),
    },
    {
      field: 'created_time',
      title: $t('organization.createdTime'),
      width: 168,
    },
    {
      field: 'operation',
      title: $t('organization.operation'),
      fixed: 'right',
      width: 240,
      showOverflow: false,
      cellRender: {
        name: 'CellOperation',
        attrs: { nameField: 'name', onClick },
        options: [
          { code: 'add', text: $t('organization.dept.addChild') },
          { code: 'edit', text: $t('common.edit') },
          { code: 'delete', text: $t('common.delete') },
        ],
      },
    },
  ];
}

export function useSchema(parents: SysDeptResult[] = []): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('organization.dept.name'),
      rules: z.string().trim().min(1, $t('organization.requiredName')),
    },
    departmentField('parent_id', $t('organization.dept.parent'), parents),
    {
      component: 'InputNumber',
      fieldName: 'sort',
      label: $t('organization.dept.sort'),
      defaultValue: 0,
      componentProps: { min: 0, precision: 0, class: 'w-full' },
      rules: z.number().int().nonnegative(),
    },
    {
      component: 'Input',
      fieldName: 'leader',
      label: $t('organization.dept.leader'),
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: $t('organization.dept.phone'),
      rules: z
        .string()
        .nullish()
        .refine(
          (value) => !value?.trim() || /^1[3-9]\d{9}$/.test(value.trim()),
          $t('organization.dept.invalidPhone'),
        ),
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: $t('organization.dept.email'),
      rules: z
        .string()
        .nullish()
        .refine(
          (value) =>
            !value?.trim() ||
            z.string().email().safeParse(value.trim()).success,
          $t('organization.dept.invalidEmail'),
        ),
    },
    {
      component: 'RadioGroup',
      fieldName: 'status',
      label: $t('organization.status'),
      defaultValue: 1,
      rules: 'selectRequired',
      componentProps: { options: statusOptions() },
    },
  ];
}
