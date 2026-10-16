<script lang="ts" setup>
import type { AdminGridApi } from '../../shared/useAdminGrid';

import type { LoginLogResult } from '#/api';

import { Page, VbenButton } from '@vben/common-ui';
import { Trash2 } from '@vben/icons';

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
          class="gap-2"
          variant="destructive"
          :disabled="disabled"
          :loading="loading"
          @click="deleteSelected"
        >
          <Trash2 v-if="!loading" class="size-4 shrink-0" aria-hidden="true" />
          删除日志
        </VbenButton>
      </template>
    </Grid>
  </Page>
</template>
