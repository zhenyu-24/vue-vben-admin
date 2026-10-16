import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { ComponentPropsMap, ComponentType } from './component';

import { h } from 'vue';

import { confirm, VbenButton, VbenTableAction } from '@vben/common-ui';
import { $t } from '@vben/locales';
import {
  setupVbenVxeTable,
  useVbenVxeGrid as useGrid,
} from '@vben/plugins/vxe-table';

import { ElImage, ElTag } from 'element-plus';

import StatusSwitch from '#/views/admin/shared/status-switch.vue';

import { useVbenForm } from './form';

setupVbenVxeTable({
  configVxeTable: (vxeUI) => {
    vxeUI.setConfig({
      grid: {
        align: 'center',
        border: false,
        columnConfig: {
          resizable: true,
        },
        minHeight: 180,
        formConfig: {
          // 全局禁用vxe-table的表单配置，使用formOptions
          enabled: false,
        },
        proxyConfig: {
          autoLoad: true,
          response: {
            result: 'items',
            total: 'total',
            list: 'items',
          },
          showActiveMsg: true,
          showResponseMsg: false,
        },
        round: true,
        showOverflow: true,
        size: 'small',
        tooltipConfig: {
          enterDelay: 300,
          theme: 'light',
        },
      } as VxeTableGridOptions,
    });

    // 表格标签渲染器
    const colorTypeMap: Record<string, string> = {
      processing: 'primary',
      success: 'success',
      error: 'danger',
      cyan: 'info',
      warning: 'warning',
    };
    vxeUI.renderer.add('CellTag', {
      renderTableDefault({ options, props }, { column, row }) {
        const value = row[column.field];
        const tagOptions = options ?? [
          { color: 'success', label: '启用', value: 1 },
          { color: 'error', label: '禁用', value: 0 },
        ];
        const tagItem = tagOptions.find((item: any) => item.value === value);
        if (!tagItem) {
          return value ?? '';
        }
        return h(
          ElTag,
          {
            ...props,
            type: colorTypeMap[tagItem.color] || tagItem.color,
            size: 'small',
          },
          { default: () => tagItem.label ?? value },
        );
      },
    });

    // 表格开关渲染器（状态切换）
    // 使用 ElSwitch 的 before-change（只在用户交互时触发，不做初始化时误触发）
    // 配合 onUpdate:modelValue 做值同步，避免 VxeTable 初始化时误调用 API
    vxeUI.renderer.add('CellSwitch', {
      renderTableDefault({ attrs, props }, { column, row }) {
        // 注意：ElSwitch 的 prop 为 active-value / inactive-value，不是 checkedValue
        const actVal = props?.activeValue ?? 1;
        const inactVal = props?.inactiveValue ?? 0;
        const switchProps = {
          activeValue: actVal,
          inactiveValue: inactVal,
          ...props,
          modelValue: row[column.field],
          'onUpdate:modelValue': (val: any) => {
            row[column.field] = val;
          },
          async beforeChange() {
            const newVal =
              row[column.field] === switchProps.activeValue
                ? switchProps.inactiveValue
                : switchProps.activeValue;
            try {
              await attrs?.beforeChange?.(newVal, row);
              return true;
            } catch {
              return false;
            }
          },
        };
        return h(StatusSwitch, switchProps);
      },
    });

    // 表格配置项可以用 cellRender: { name: 'CellImage' },
    vxeUI.renderer.add('CellImage', {
      renderTableDefault(renderOpts, params) {
        const { props } = renderOpts;
        const { column, row } = params;
        const src = row[column.field];
        return h(ElImage, { src, previewSrcList: [src], ...props });
      },
    });

    // 表格配置项可以用 cellRender: { name: 'CellLink' },
    vxeUI.renderer.add('CellLink', {
      renderTableDefault(renderOpts) {
        const { props } = renderOpts;
        return h(
          VbenButton,
          { size: 'sm', variant: 'link' },
          { default: () => props?.text },
        );
      },
    });

    // 表格操作按钮渲染器
    vxeUI.renderer.add('CellOperation', {
      renderTableDefault({ attrs, options }, { column, row }) {
        // 列对齐方式
        let justify: string;
        switch (column.align) {
          case 'right': {
            justify = 'end';
            break;
          }
          case 'left': {
            justify = 'start';
            break;
          }
          default: {
            justify = 'center';
            break;
          }
        }

        const defaultTextMap: Record<string, string> = {
          edit: '修改',
          delete: '删除',
          detail: '详情',
        };

        const operations = (options || []).map((opt: any) => {
          if (typeof opt === 'string') {
            return { code: opt, text: defaultTextMap[opt] };
          }
          return {
            ...opt,
            text: opt.text || defaultTextMap[opt.code],
          };
        });

        function resolveDisabled(opt: any): boolean {
          return typeof opt.disabled === 'function'
            ? !!opt.disabled(row)
            : !!opt.disabled;
        }

        const actions = operations.map((opt: any) => {
          const { code, text, disabled: _disabled, ...buttonProps } = opt;
          return {
            ...buttonProps,
            text,
            size: 'sm' as const,
            variant: 'link' as const,
            class: 'h-8 p-0 text-base font-normal',
            danger: code === 'delete',
            disabled: resolveDisabled(opt),
            onClick: async () => {
              if (code === 'delete') {
                try {
                  await confirm({
                    title: opt.text,
                    content: `确定${opt.text}「${row[attrs?.nameField || 'name']}」吗？`,
                    confirmText: $t('common.confirm'),
                    cancelText: $t('common.cancel'),
                    icon: 'warning',
                  });
                } catch {
                  return;
                }
              }
              return attrs?.onClick?.({ code, row });
            },
          };
        });

        return h(VbenTableAction, {
          actions,
          align: justify as 'center' | 'end' | 'start',
          class: 'gap-4 whitespace-nowrap',
        });
      },
    });

    // 这里可以自行扩展 vxe-table 的全局配置，比如自定义格式化
    // vxeUI.formats.add
  },
  useVbenForm,
});

// 创建表格组件
export const useVbenVxeGrid = <T extends Record<string, any>>(
  ...rest: Parameters<typeof useGrid<T, ComponentType, ComponentPropsMap>>
) => useGrid<T, ComponentType, ComponentPropsMap>(...rest);

// 定义泛型函数

// ============================================================
// OnActionClickParams - 操作点击参数的类型
// ============================================================
// 描述操作按钮（如“编辑/删除”）被点击时，回调函数接收的参数格式。
export type OnActionClickParams<T = Record<string, any>> = {
  code: string;
  row: T;
};

// ============================================================
// 3. OnActionClickFn - 操作点击函数的类型
// ============================================================
// 它是一个函数类型，接收一个 OnActionClickParams 参数，没有返回值。
// 当你写 onActionClick 回调时，可以用这个类型来约束它。
export type OnActionClickFn<T = Record<string, any>> = (
  params: OnActionClickParams<T>,
) => void;

export type * from '@vben/plugins/vxe-table';
