<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { CreateNoticeParams, NoticeResult } from '#/api';

import { computed, ref } from 'vue';

import { Page, useVbenModal, VbenButton } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { $t } from '@vben/locales';

import { useVbenForm } from '#/adapter/form';
import {
  createNoticeApi,
  deleteNoticeApi,
  getNoticeListApi,
  updateNoticeApi,
} from '#/api';
import NoticeContent from '#/components/notice-content.vue';
import { noticeContentHtml } from '#/utils/notice-content';

import { pagedQuery, useAdminGrid } from '../shared/useAdminGrid';
import { useDeleteRow } from '../shared/useDeleteRow';
import { useFormSubmit } from '../shared/useFormSubmit';
import { noticeValues, querySchema, schema, useColumns } from './data';

defineOptions({ name: 'AdminNotice' });

const [Grid, gridApi] = useAdminGrid<NoticeResult>({
  columns: () => useColumns(onActionClick),
  schema: () => querySchema,
  query: pagedQuery(getNoticeListApi),
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
  class: 'w-[1080px] max-w-[calc(100vw-2rem)]',
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
    const values = noticeValues(editing.value);
    await formApi.setValues({
      ...values,
      content: noticeContentHtml(values.content),
    });
  },
});

const preview = ref<NoticeResult>();

const [PreviewModal, previewModalApi] = useVbenModal({
  title: '通知公告预览',
  class: 'w-[1080px] max-w-[calc(100vw-2rem)]',
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
        <VbenButton class="gap-2" @click="modalApi.setData({}).open()">
          <Plus class="size-4 shrink-0" aria-hidden="true" />
          新增通知公告
        </VbenButton>
      </template>
    </Grid>
    <Modal :title="modalTitle">
      <Form />
    </Modal>
    <PreviewModal>
      <NoticeContent :title="preview?.title" :content="preview?.content" />
    </PreviewModal>
  </Page>
</template>
