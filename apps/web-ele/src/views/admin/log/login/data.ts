import type { VxeGridProps } from '#/adapter/vxe-table';

import { createLogQuerySchema, logStatusOptions } from '../data';

export const querySchema = createLogQuerySchema();

export const columns: VxeGridProps['columns'] = [
  { field: 'checkbox', type: 'checkbox', align: 'left', width: 50 },
  {
    field: 'seq',
    title: '序号',
    type: 'seq',
    width: 50,
  },
  { field: 'username', title: '用户名' },
  {
    field: 'status',
    title: '状态',
    cellRender: {
      name: 'CellTag',
      options: logStatusOptions,
    },
  },
  { field: 'ip', title: 'IP 地址' },
  { field: 'country', title: '国家' },
  { field: 'region', title: '地区' },
  { field: 'os', title: '操作系统' },
  { field: 'browser', title: '浏览器' },
  { field: 'device', title: '设备' },
  { field: 'msg', title: '消息', width: 150 },
  { field: 'login_time', title: '登录时间', width: 168 },
  {
    field: 'created_time',
    title: '创建时间',
    width: 168,
  },
];
