import type { VbenFormSchema } from '#/adapter/form';

export const logStatusOptions = [
  { color: 'success', label: '成功', value: 1 },
  { color: 'error', label: '失败', value: 0 },
];

export function createLogQuerySchema(
  labels: [string, string] = ['成功', '失败'],
): VbenFormSchema[] {
  return [
    { component: 'Input', fieldName: 'username', label: '用户名' },
    { component: 'Input', fieldName: 'ip', label: 'IP 地址' },
    {
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: {
        clearable: true,
        options: labels.map((label, index) => ({ label, value: 1 - index })),
      },
    },
  ];
}
