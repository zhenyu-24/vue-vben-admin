<script lang="ts" setup>
import type { AdminGridApi } from '../../shared/useAdminGrid';

import type { LoginLogResult } from '#/api';

import { Page, VbenButton } from '@vben/common-ui';

import { Delete } from '@element-plus/icons-vue';

import { deleteLoginLogApi, getLoginLogListApi } from '#/api';

import { pagedQuery, useAdminGrid } from '../../shared/useAdminGrid';
import { useBatchDelete } from '../../shared/useBatchDelete';
import { columns, querySchema } from './data';

defineOptions({ name: 'LoginLog' });

const { gridEvents, disabled, loading, deleteSelected, onQuery } =
  useBatchDelete<LoginLogResult>(
    (): AdminGridApi<LoginLogResult> => gridApi,
    deleteLoginLogApi,
  );
const [Grid, gridApi] = useAdminGrid<LoginLogResult>({
  columns: () => columns,
  schema: () => querySchema,
  query: pagedQuery(getLoginLogListApi),
  gridEvents,
  onQuery,
  gridOptions: { checkboxConfig: { highlight: true } },
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton
          variant="destructive"
          :disabled="disabled"
          :loading="loading"
          @click="deleteSelected"
        >
          <Delete class="size-5" />
          删除日志
        </VbenButton>
      </template>
    </Grid>
  </Page>
</template>
