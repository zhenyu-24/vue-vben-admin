import type { VbenFormSchema } from '#/adapter/form';
import type { SysDeptResult } from '#/api';

import { $t } from '@vben/locales';

export function statusOptions() {
  return [
    { label: $t('organization.enabled'), value: 1 },
    { label: $t('organization.disabled'), value: 0 },
  ];
}

export function statusCellRender() {
  return {
    name: 'CellTag',
    options: statusOptions().map((item) => ({
      ...item,
      color: item.value ? 'success' : 'error',
    })),
  };
}

export function departmentField(
  fieldName: string,
  label: string,
  departments: SysDeptResult[],
  disableInactive = false,
): VbenFormSchema {
  return {
    component: 'TreeSelect',
    fieldName,
    label,
    componentProps: {
      class: 'w-full',
      data: departments,
      nodeKey: 'id',
      props: {
        label: 'name',
        children: 'children',
        ...(disableInactive
          ? { disabled: (department: SysDeptResult) => department.status !== 1 }
          : {}),
      },
      clearable: true,
      filterable: true,
      checkStrictly: true,
      defaultExpandAll: true,
    },
  };
}
