import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { ComponentPropsMap, ComponentType } from './component';

import { h } from 'vue';

import {
  setupVbenVxeTable,
  useVbenVxeGrid as useGrid,
} from '@vben/plugins/vxe-table';

import { ElButton, ElImage, ElPopconfirm, ElSwitch, ElTag } from 'element-plus';

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
        return h(ElSwitch, switchProps);
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
          ElButton,
          { size: 'small', link: true },
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
          case 'center': {
            justify = 'center';
            break;
          }
          case 'left': {
            justify = 'start';
            break;
          }
          default: {
            justify = 'end';
            break;
          }
        }

        const defaultTextMap: Record<string, string> = {
          edit: '修改',
          delete: '删除',
          detail: '详情',
        };

        const defaultProps = { size: 'small' as const };

        const operations = (options || []).map((opt: any) => {
          if (typeof opt === 'string') {
            return { code: opt, ...defaultProps, text: defaultTextMap[opt] };
          }
          return {
            ...defaultProps,
            ...opt,
            text: opt.text || defaultTextMap[opt.code],
          };
        });

        function resolveDisabled(opt: any): boolean {
          return typeof opt.disabled === 'function'
            ? !!opt.disabled(row)
            : !!opt.disabled;
        }

        function renderBtn(opt: any, listen = true) {
          const { code, text, disabled: _disabled, ...buttonProps } = opt;
          return h(
            ElButton,
            {
              ...buttonProps,
              size: 'small',
              type: code === 'delete' ? 'danger' : 'primary',
              link: true,
              disabled: resolveDisabled(opt),
              onClick: listen
                ? () => attrs?.onClick?.({ code, row })
                : undefined,
            },
            { default: () => text },
          );
        }

        function renderConfirm(opt: any) {
          return h(
            ElPopconfirm,
            {
              title: `确定${opt.text}「${row[attrs?.nameField || 'name']}」吗？`,
              width: 200,
              disabled: resolveDisabled(opt),
              onConfirm: () => attrs?.onClick?.({ code: opt.code, row }),
            },
            {
              reference: () => renderBtn({ ...opt }, false),
            },
          );
        }

        const btns = operations.map((opt: any) =>
          opt.code === 'delete' ? renderConfirm(opt) : renderBtn(opt),
        );

        return h(
          'div',
          {
            class: 'flex',
            style: { justifyContent: justify, gap: '4px' },
          },
          btns,
        );
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
