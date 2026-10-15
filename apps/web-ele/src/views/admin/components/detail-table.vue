<script setup lang="ts">
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed } from 'vue';

import { useMediaQuery } from '@vueuse/core';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

interface DetailItem {
  fullWidth?: boolean;
  key: string;
  label: string;
  value?: unknown;
}

interface DetailRow {
  key: string;
  left: DetailItem;
  right?: DetailItem;
}

const props = defineProps<{
  items: DetailItem[];
  loading?: boolean;
}>();

const twoColumns = useMediaQuery('(min-width: 1024px)');
const rows = computed<DetailRow[]>(() => {
  const result: DetailRow[] = [];
  for (let index = 0; index < props.items.length; index++) {
    const left = props.items[index]!;
    const next = props.items[index + 1];
    const right =
      twoColumns.value && !left.fullWidth && !next?.fullWidth
        ? next
        : undefined;
    result.push({ key: left.key, left, right });
    if (right) index++;
  }
  return result;
});

const gridOptions = computed<VxeTableGridOptions<DetailRow>>(() => ({
  align: 'left',
  columns: [
    { field: 'left.label', title: '参数', width: twoColumns.value ? 150 : 140 },
    {
      field: 'left.value',
      title: '当前值',
      minWidth: 150,
      slots: { default: 'leftValue' },
    },
    ...(twoColumns.value
      ? [
          { field: 'right.label', title: '参数', width: 150 },
          {
            field: 'right.value',
            title: '当前值',
            minWidth: 150,
            slots: { default: 'rightValue' },
          },
        ]
      : []),
  ],
  data: rows.value,
  loading: props.loading,
  minHeight: 0,
  pagerConfig: { enabled: false },
  rowConfig: { keyField: 'key', isHover: true },
  showOverflow: false,
  size: 'medium',
  spanMethod: ({ row, columnIndex }) => {
    if (twoColumns.value && !row.right) {
      if (columnIndex === 1) return { rowspan: 1, colspan: 3 };
      if (columnIndex > 1) return { rowspan: 0, colspan: 0 };
    }
  },
}));

const [Grid] = useVbenVxeGrid({});
</script>

<template>
  <Grid class="h-auto min-w-0" grid-class="p-0" :grid-options="gridOptions">
    <template #leftValue="{ row }">
      <div class="min-w-0 break-all text-sm leading-6">
        <slot :name="row.left.key" :item="row.left">
          {{ row.left.value ?? '--' }}
        </slot>
      </div>
    </template>
    <template #rightValue="{ row }">
      <div v-if="row.right" class="min-w-0 break-all text-sm leading-6">
        <slot :name="row.right.key" :item="row.right">
          {{ row.right.value ?? '--' }}
        </slot>
      </div>
    </template>
  </Grid>
</template>
