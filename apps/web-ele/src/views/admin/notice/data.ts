import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeGridProps } from '#/adapter/vxe-table';
import type { CreateNoticeParams, NoticeResult } from '#/api';

const typeOptions = [
  { color: 'success', label: '通知', value: 0 },
  { color: 'warning', label: '公告', value: 1 },
];
const statusOptions = [
  { color: 'success', label: '显示', value: 1 },
  { color: 'info', label: '隐藏', value: 0 },
];

export function noticeValues(
  data?: null | Partial<CreateNoticeParams>,
): CreateNoticeParams {
  return {
    title: data?.title ?? '',
    type: data?.type ?? 0,
    status: data?.status ?? 1,
    content: data?.content ?? '',
  };
}

export const querySchema: VbenFormSchema[] = [
  {
    component: 'Input',
    fieldName: 'title',
    label: '标题',
  },
  {
    component: 'Select',
    componentProps: {
      clearable: true,
      options: typeOptions,
    },
    fieldName: 'type',
    label: '类型',
  },
  {
    component: 'Select',
    componentProps: {
      clearable: true,
      options: statusOptions,
    },
    fieldName: 'status',
    label: '状态',
  },
];

export function useColumns(
  onActionClick?: OnActionClickFn<NoticeResult>,
): VxeGridProps['columns'] {
  return [
    {
      field: 'seq',
      title: '序号',
      type: 'seq',
      width: 50,
    },
    { field: 'title', title: '标题' },
    {
      field: 'type',
      title: '类型',
      cellRender: {
        name: 'CellTag',
        options: typeOptions,
      },
    },
    {
      field: 'status',
      title: '状态',
      cellRender: {
        name: 'CellTag',
        options: statusOptions,
      },
    },
    {
      field: 'created_time',
      title: '创建时间',
      width: 168,
    },
    {
      field: 'operation',
      title: '操作',
      align: 'center',
      fixed: 'right',
      width: 150,
      cellRender: {
        attrs: {
          nameField: 'title',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            code: 'preview',
            text: '预览',
          },
          'edit',
          'delete',
        ],
      },
    },
  ];
}

export const schema: VbenFormSchema[] = [
  {
    component: 'Input',
    formItemClass: 'md:col-span-2',
    fieldName: 'title',
    label: '标题',
    rules: 'required',
  },
  {
    component: 'RadioGroup',
    formItemClass: 'col-span-1 md:col-span-1',
    componentProps: {
      buttonStyle: 'solid',
      options: typeOptions,
      optionType: 'button',
    },
    defaultValue: 0,
    fieldName: 'type',
    label: '类型',
    rules: 'required',
  },
  {
    component: 'RadioGroup',
    componentProps: {
      buttonStyle: 'solid',
      options: statusOptions,
      optionType: 'button',
    },
    defaultValue: 1,
    fieldName: 'status',
    label: '状态',
    rules: 'required',
  },
  {
    component: 'Input',
    componentProps: {
      type: 'textarea',
      rows: 6,
      placeholder: '支持 Markdown 语法',
    },
    formItemClass: 'md:col-span-2',
    fieldName: 'content',
    label: '内容',
    rules: 'required',
  },
];
