<script lang="ts" setup>
import type { VbenFormProps } from '@vben/common-ui';

import type {
  CreateNoticeParams,
  NoticeResult,
  UpdateNoticeParams,
} from '#/api';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { computed, nextTick, ref } from 'vue';

import { Page, useVbenModal, VbenButton } from '@vben/common-ui';
import { marked } from 'marked';
import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';

import {
  createNoticeApi,
  deleteNoticeApi,
  getNoticeListApi,
  updateNoticeApi,
} from '#/api';
import { querySchema, schema, useColumns } from './data';

const formOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  submitButtonOptions: {
    content: $t('common.query'),
  },
  schema: querySchema,
};

const gridOptions: VxeTableGridOptions<NoticeResult> = {
  rowConfig: {
    keyField: 'id',
  },
  checkboxConfig: {
    highlight: true,
  },
  height: 'auto',
  exportConfig: {},
  printConfig: {},
  toolbarConfig: {
    export: true,
    print: true,
    refresh: true,
    refreshOptions: {
      code: 'query',
    },
    custom: true,
    zoom: true,
  },
  columns: useColumns(onActionClick),
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        return await getNoticeListApi({
          page: page.currentPage,
          size: page.pageSize,
          ...formValues,
        });
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

function onActionClick({ code, row }: OnActionClickParams<NoticeResult>) {
  switch (code) {
    case 'delete': {
      deleteNoticeApi([row.id]).then(() => {
        ElMessage.success(`已删除 ${row.title}`);
        onRefresh();
      });
      break;
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

function onRefresh() {
  gridApi.query();
}

// --- 新增/编辑弹窗 ---
const [Form, formApi] = useVbenForm({
  wrapperClass: 'md:grid-cols-2',
  layout: 'vertical',
  showDefaultActions: false,
  schema,
});

interface formNoticeParams extends UpdateNoticeParams {
  id?: number;
}

const formData = ref<formNoticeParams>();

const modalTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', ['通知公告'])
    : $t('ui.actionTitle.create', ['通知公告']);
});

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  class: 'w-5/12',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (valid) {
      modalApi.lock();
      const data = await formApi.getValues<CreateNoticeParams>();
      try {
        await (formData.value?.id
          ? updateNoticeApi(formData.value?.id, data)
          : createNoticeApi(data));
        ElMessage.success('操作成功');
        await modalApi.close();
        onRefresh();
      } finally {
        modalApi.unlock();
      }
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<formNoticeParams>();
      formApi.resetForm();
      if (data) {
        formData.value = data;
        formApi.setValues(data);
      }
    }
  },
});

// --- 预览弹窗 ---
const preViewTitle = ref<string>('');
const preViewContent = ref<string>('');
const preViewHtml = ref<string>('');

const [PreviewModal, previewModalApi] = useVbenModal({
  title: '通知公告预览',
  class: 'w-5/12',
  footer: false,
  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = previewModalApi.getData<formNoticeParams>();
      if (data) {
        preViewTitle.value = data.title;
        preViewContent.value = data.content;
        await nextTick();
        preViewHtml.value = marked.parse(data.content || '', { breaks: true }) as string;
      }
    }
  },
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton @click="() => modalApi.setData(null).open()">
          <IconifyIcon icon="material-symbols:add" class="mr-1 size-5" />
          新增通知公告
        </VbenButton>
      </template>
    </Grid>
    <Modal :title="modalTitle">
      <Form />
    </Modal>
    <PreviewModal>
      <div class="mb-3 text-center text-2xl font-bold">{{ preViewTitle }}</div>
      <div class="prose prose-sm dark:prose-invert max-w-none break-words rounded border bg-gray-50 p-4 dark:bg-gray-900" v-html="preViewHtml"></div>
    </PreviewModal>
  </Page>
</template>
