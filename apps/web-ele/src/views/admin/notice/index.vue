<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { CreateNoticeParams, NoticeResult } from '#/api';

import { computed, ref } from 'vue';

import { Page, useVbenModal, VbenButton } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Plus } from '@element-plus/icons-vue';
import { marked } from 'marked';

import { useVbenForm } from '#/adapter/form';
import {
  createNoticeApi,
  deleteNoticeApi,
  getNoticeListApi,
  updateNoticeApi,
} from '#/api';

import { pagedQuery, useAdminGrid } from '../shared/useAdminGrid';
import { useDeleteRow } from '../shared/useDeleteRow';
import { useFormSubmit } from '../shared/useFormSubmit';
import { noticeValues, querySchema, schema, useColumns } from './data';

defineOptions({ name: 'AdminNotice' });

const [Grid, gridApi] = useAdminGrid<NoticeResult>({
  columns: () => useColumns(onActionClick),
  schema: () => querySchema,
  query: pagedQuery(getNoticeListApi),
  gridOptions: { printConfig: {}, toolbarConfig: { print: true } },
});
const deleteRow = useDeleteRow<NoticeResult>(
  gridApi,
  (id) => deleteNoticeApi([id]),
  (row) => `已删除 ${row.title}`,
);

function onActionClick({ code, row }: OnActionClickParams<NoticeResult>) {
  switch (code) {
    case 'delete': {
      return deleteRow(row);
    }
    case 'edit': {
      modalApi.setData(row).open();
      break;
    }
    case 'preview': {
      previewModalApi.setData(row).open();
      break;
    }
  }
}

const [Form, formApi] = useVbenForm({
  wrapperClass: 'md:grid-cols-2',
  layout: 'vertical',
  showDefaultActions: false,
  schema,
});

const editing = ref<NoticeResult>();

const modalTitle = computed(() => {
  return editing.value
    ? $t('ui.actionTitle.edit', ['通知公告'])
    : $t('ui.actionTitle.create', ['通知公告']);
});

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  class: 'w-[640px] max-w-[calc(100vw-2rem)]',
  onConfirm: useFormSubmit<CreateNoticeParams>({
    form: () => formApi,
    modal: (): ReturnType<typeof useVbenModal>[1] => modalApi,
    save: (values) =>
      editing.value
        ? updateNoticeApi(editing.value.id, noticeValues(values))
        : createNoticeApi(noticeValues(values)),
    successMessage: () => '操作成功',
    onSuccess: () => gridApi.query(),
  }),
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData<Partial<NoticeResult>>();
    editing.value = data.id === undefined ? undefined : (data as NoticeResult);
    await formApi.resetForm();
    await formApi.setValues(noticeValues(editing.value));
  },
});

const preview = ref<NoticeResult>();
const previewHtml = computed(() =>
  marked.parse(preview.value?.content ?? '', { async: false, breaks: true }),
);

const [PreviewModal, previewModalApi] = useVbenModal({
  title: '通知公告预览',
  class: 'w-[640px] max-w-[calc(100vw-2rem)]',
  footer: false,
  onOpenChange(isOpen) {
    preview.value = isOpen
      ? previewModalApi.getData<NoticeResult>()
      : undefined;
  },
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton @click="() => modalApi.setData(null).open()">
          <Plus class="mr-1 size-5" />
          新增通知公告
        </VbenButton>
      </template>
    </Grid>
    <Modal :title="modalTitle">
      <Form />
    </Modal>
    <PreviewModal>
      <div class="mb-3 text-center text-xl font-bold">{{ preview?.title }}</div>
      <div
        class="prose prose-sm dark:prose-invert max-w-none break-words rounded border bg-gray-50 p-4 dark:bg-gray-900"
        v-html="previewHtml"
      ></div>
    </PreviewModal>
  </Page>
</template>
