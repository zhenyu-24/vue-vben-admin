import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeGridProps } from '#/adapter/vxe-table';
import type { TaskResult } from '#/api';

export const querySchema: VbenFormSchema[] = [
  { component: 'Input', fieldName: 'task_id', label: '任务 ID' },
  { component: 'Input', fieldName: 'name', label: '任务名称' },
];

export const statusOptions = [
  { color: 'success', label: 'SUCCESS', value: 'SUCCESS' },
  { color: 'danger', label: 'FAILURE', value: 'FAILURE' },
  { color: 'primary', label: 'PENDING', value: 'PENDING' },
  { color: 'primary', label: 'RECEIVED', value: 'RECEIVED' },
  { color: 'primary', label: 'STARTED', value: 'STARTED' },
  { color: 'warning', label: 'RETRY', value: 'RETRY' },
  { color: 'info', label: 'REVOKED', value: 'REVOKED' },
];

export function displayResult(value: unknown) {
  if (value === undefined || value === null) return '无';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

export function useColumns(
  onActionClick: OnActionClickFn<TaskResult>,
): VxeGridProps['columns'] {
  return [
    { type: 'checkbox', width: 50 },
    { field: 'task_id', title: '任务 ID', minWidth: 240 },
    { field: 'name', title: '任务名称', minWidth: 200 },
    {
      field: 'status',
      title: '状态',
      width: 120,
      cellRender: { name: 'CellTag', options: statusOptions },
    },
    {
      field: 'result',
      title: '执行结果',
      minWidth: 180,
      formatter: ({ cellValue }) => displayResult(cellValue),
    },
    { field: 'retries', title: '重试次数', width: 100 },
    { field: 'date_done', title: '结束时间', width: 168 },
    {
      field: 'operation',
      title: '操作',
      width: 90,
      fixed: 'right',
      align: 'center',
      cellRender: {
        name: 'CellOperation',
        attrs: { onClick: onActionClick },
        options: [{ code: 'details', text: '详情' }],
      },
    },
  ];
}
