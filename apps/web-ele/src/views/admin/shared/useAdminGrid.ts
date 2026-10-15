import type { VbenFormSchema } from '#/adapter/form';
import type {
  VxeGridListeners,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { watch } from 'vue';

import { $t, useI18n } from '@vben/locales';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

type GridQuery<T> = NonNullable<
  NonNullable<
    NonNullable<VxeTableGridOptions<T>['proxyConfig']>['ajax']
  >['query']
>;

interface AdminGridOptions<T> {
  columns: () => VxeTableGridOptions<T>['columns'];
  schema: () => VbenFormSchema[];
  query: GridQuery<T>;
  onQuery?: () => Promise<unknown> | void;
  gridOptions?: VxeTableGridOptions<T>;
  gridEvents?: VxeGridListeners<T>;
  tableTitle?: string;
}

interface QueryPage {
  page: { currentPage: number; pageSize: number };
}

export function pagedQuery<P extends { page?: number; size?: number }, R>(
  request: (params: P) => Promise<R>,
) {
  return ({ page }: QueryPage, values: P) =>
    request({ ...values, page: page.currentPage, size: page.pageSize });
}

export function useAdminGrid<T extends Record<string, any>>({
  columns,
  schema,
  query,
  onQuery,
  gridOptions,
  ...options
}: AdminGridOptions<T>) {
  const buildColumns = () =>
    columns()?.map((column) =>
      column.field === 'operation'
        ? { ...column, showOverflow: false }
        : column,
    );
  const formOptions = () => ({
    schema: schema(),
    collapsed: true,
    showCollapseButton: true,
    submitButtonOptions: { content: $t('common.query') },
  });
  const [Grid, gridApi] = useVbenVxeGrid<T>({
    ...options,
    formOptions: formOptions(),
    gridOptions: {
      height: 'auto',
      keepSource: true,
      exportConfig: {},
      ...gridOptions,
      rowConfig: { keyField: 'id', ...gridOptions?.rowConfig },
      columns: buildColumns(),
      toolbarConfig: {
        export: true,
        refresh: true,
        refreshOptions: { code: 'query' },
        custom: true,
        zoom: true,
        ...gridOptions?.toolbarConfig,
      },
      proxyConfig: {
        ...gridOptions?.proxyConfig,
        ajax: {
          ...gridOptions?.proxyConfig?.ajax,
          query: async (...args: Parameters<GridQuery<T>>) => {
            await onQuery?.();
            return query(...args);
          },
        },
      },
    } as NonNullable<Parameters<typeof useVbenVxeGrid<T>>[0]['gridOptions']>,
  });

  const { locale } = useI18n();
  watch(locale, () => {
    gridApi.setGridOptions({ columns: buildColumns() });
    gridApi.formApi.setState(formOptions());
  });

  return [Grid, gridApi] as const;
}

export type AdminGridApi<T extends Record<string, any>> = ReturnType<
  typeof useVbenVxeGrid<T>
>[1];
