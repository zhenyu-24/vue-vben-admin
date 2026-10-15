import type { OnActionClickFn, VxeGridProps } from '#/adapter/vxe-table';
import type { OperaLogResult } from '#/api';

import { createLogQuerySchema, logStatusOptions } from '../data';

export const querySchema = createLogQuerySchema(['正常', '异常']);

export function useColumns(
  onActionClick?: OnActionClickFn<OperaLogResult>,
): VxeGridProps['columns'] {
  return [
    { field: 'checkbox', type: 'checkbox', align: 'left', width: 50 },
    {
      field: 'seq',
      title: '序号',
      type: 'seq',
      width: 50,
    },
    { field: 'username', title: '用户名' },
    {
      field: 'method',
      title: '请求方法',
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'processing', label: 'GET', value: 'GET' },
          { color: 'success', label: 'POST', value: 'POST' },
          { color: 'cyan', label: 'PUT', value: 'PUT' },
          { color: 'error', label: 'DELETE', value: 'DELETE' },
        ],
      },
    },
    { field: 'title', title: '操作标题', align: 'left', width: 200 },
    { field: 'path', title: '请求路径', align: 'left', width: 250 },
    {
      field: 'status',
      title: '状态',
      cellRender: {
        name: 'CellTag',
        options: logStatusOptions,
      },
    },
    { field: 'cost_time', title: '耗时（ms）' },
    { field: 'opera_time', title: '操作时间' },
    {
      field: 'operation',
      title: '操作',
      align: 'center',
      fixed: 'right',
      width: 100,
      cellRender: {
        attrs: {
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            code: 'details',
            text: '详情',
          },
        ],
      },
    },
  ];
}
