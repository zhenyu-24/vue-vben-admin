import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeGridProps } from '#/adapter/vxe-table';
import type { TaskSchedulerResult } from '#/api';

import { h } from 'vue';

import { VbenIconButton } from '@vben/common-ui';
import { Settings } from '@vben/icons';

import { z } from '#/adapter/form';
import { getTaskRegisteredApi } from '#/api';

import {
  jsonParam,
  periodOptions,
  strategyOptions,
  validCron,
} from './schedule';

export const querySchema: VbenFormSchema[] = [
  { component: 'Input', fieldName: 'name', label: '任务名称' },
  {
    component: 'Select',
    fieldName: 'type',
    label: '策略类型',
    componentProps: { clearable: true, options: strategyOptions },
  },
];

export function useColumns(
  onActionClick: OnActionClickFn<TaskSchedulerResult>,
): VxeGridProps['columns'] {
  return [
    { type: 'seq', width: 50, title: '序号' },
    { field: 'name', title: '任务名称', minWidth: 160 },
    { field: 'task', title: 'Celery 任务', minWidth: 220 },
    {
      field: 'type',
      title: '策略类型',
      width: 110,
      cellRender: { name: 'CellTag', options: strategyOptions },
    },
    {
      field: 'schedule',
      sortable: false,
      title: '触发策略',
      minWidth: 160,
      slots: { default: 'schedule', header: 'scheduleHeader' },
    },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    { field: 'total_run_count', title: '执行总计', width: 100 },
    { field: 'last_run_time', title: '最近执行', width: 168 },
    {
      field: 'execute',
      sortable: false,
      title: '手动执行',
      width: 90,
      fixed: 'right',
      slots: { default: 'execute' },
    },
    {
      field: 'operation',
      title: '操作',
      width: 210,
      minWidth: 200,
      maxWidth: 260,
      fixed: 'right',
      align: 'center',
      cellRender: {
        name: 'CellOperation',
        attrs: { nameField: 'name', onClick: onActionClick },
        options: [{ code: 'log', text: '日志' }, 'edit', 'delete'],
      },
    },
  ];
}

function jsonRule(array: boolean) {
  return z
    .string()
    .optional()
    .refine(
      (value) => {
        try {
          jsonParam(value, array);
          return true;
        } catch {
          return false;
        }
      },
      array ? '请输入合法的 JSON 数组' : '请输入合法的 JSON 对象',
    );
}

const intervalDependency = {
  show: (values: Record<string, unknown>) => values.type === 0,
  required: (values: Record<string, unknown>) => values.type === 0,
  triggerFields: ['type'],
};

export function createSchema(openCronBuilder: () => void): VbenFormSchema[] {
  return [
    {
      component: 'RadioGroup',
      fieldName: 'type',
      label: '策略类型',
      defaultValue: 1,
      formItemClass: 'md:col-span-2',
      componentProps: { options: strategyOptions, optionType: 'button' },
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: '任务名称',
      componentProps: { maxlength: 64 },
      rules: z.string().trim().min(1, '请输入任务名称'),
    },
    {
      component: 'ApiSelect',
      fieldName: 'task',
      label: 'Celery 任务',
      componentProps: {
        api: getTaskRegisteredApi,
        labelField: 'name',
        valueField: 'task',
        filterable: true,
        allowCreate: true,
      },
      rules: z.string().trim().min(1, '请选择或输入 Celery 任务'),
    },
    {
      component: 'Input',
      fieldName: 'args',
      label: '位置参数',
      componentProps: {
        type: 'textarea',
        rows: 3,
        placeholder: '[1, "hello", true]',
      },
      rules: jsonRule(true),
    },
    {
      component: 'Input',
      fieldName: 'kwargs',
      label: '关键字参数',
      componentProps: {
        type: 'textarea',
        rows: 3,
        placeholder: '{"key": "value"}',
      },
      rules: jsonRule(false),
    },
    { component: 'Input', fieldName: 'queue', label: '执行队列' },
    { component: 'Input', fieldName: 'exchange', label: '消息交换机' },
    { component: 'Input', fieldName: 'routing_key', label: '路由密钥' },
    {
      component: 'DatePicker',
      fieldName: 'start_time',
      label: '开始执行时间',
      componentProps: {
        type: 'datetime',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        class: 'w-full',
        clearable: true,
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'expire_time',
      label: '过期时间',
      componentProps: {
        type: 'datetime',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        class: 'w-full',
        clearable: true,
      },
      dependencies: {
        disabled: (values) =>
          values.expire_seconds !== null && values.expire_seconds !== undefined,
        triggerFields: ['expire_seconds'],
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'expire_seconds',
      label: '过期秒数',
      componentProps: { min: 1, precision: 0, class: 'w-full' },
      dependencies: {
        disabled: (values) => !!values.expire_time,
        triggerFields: ['expire_time'],
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'interval_every',
      label: '执行周期',
      componentProps: { min: 1, precision: 0, class: 'w-full' },
      dependencies: intervalDependency,
    },
    {
      component: 'Select',
      fieldName: 'interval_period',
      label: '周期单位',
      componentProps: { options: periodOptions },
      dependencies: intervalDependency,
    },
    {
      component: 'Input',
      fieldName: 'crontab',
      label: '执行计划',
      dependencies: {
        show: (values) => values.type === 1,
        triggerFields: ['type'],
      },
      rules: z
        .string()
        .refine(validCron, '请输入合法的五段 Cron 表达式（星期为 0–6）'),
      renderComponentContent: () => ({
        suffix: () =>
          h(
            VbenIconButton,
            {
              class: 'size-6 rounded-sm',
              tooltip: '配置执行计划',
              'aria-label': '配置执行计划',
              onClick: openCronBuilder,
            },
            () => h(Settings, { class: 'size-4' }),
          ),
      }),
    },
    {
      component: 'RadioGroup',
      fieldName: 'one_off',
      label: '只执行一次',
      componentProps: {
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
      },
    },
    {
      component: 'Input',
      fieldName: 'remark',
      label: '备注',
      formItemClass: 'md:col-span-2',
      componentProps: { type: 'textarea', rows: 2 },
    },
  ];
}
