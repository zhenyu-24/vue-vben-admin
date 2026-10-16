<script setup lang="ts">
import type {
  FormInstance,
  UploadInstance,
  UploadProps,
  UploadRawFile,
  UploadUserFile,
} from 'element-plus';

import { reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElRadioButton,
  ElRadioGroup,
  ElUpload,
  genFileId,
} from 'element-plus';

import { installGitPluginApi, installZipPluginApi } from '#/api';

const emit = defineEmits<{ installed: [] }>();
const form = ref<FormInstance>();
const upload = ref<UploadInstance>();
const fileList = ref<UploadUserFile[]>([]);
const values = reactive({ type: 'zip', repoUrl: '' });
const submitting = ref(false);
const gitRules = [
  { required: true, message: '请输入 Git 仓库地址', trigger: 'blur' },
  {
    pattern: /^https?:\/\/[^/\s]+\/[^\s]+$/i,
    message: '请输入有效的 HTTP 或 HTTPS 仓库地址',
    trigger: 'blur',
  },
];

const onFileChange: UploadProps['onChange'] = (file) => {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    fileList.value = [];
    ElMessage.warning('只能上传 ZIP 插件包');
  }
};

const onExceed: UploadProps['onExceed'] = (files) => {
  const file = files[0] as undefined | UploadRawFile;
  if (!file) return;
  upload.value?.clearFiles();
  file.uid = genFileId();
  upload.value?.handleStart(file);
};

const [Modal, modalApi] = useVbenModal({
  title: '安装插件',
  class: 'w-[520px] max-w-[calc(100vw-2rem)]',
  confirmText: '安装',
  destroyOnClose: true,
  onOpenChange(isOpen) {
    if (!isOpen) return;
    values.type = 'zip';
    values.repoUrl = '';
    fileList.value = [];
    form.value?.clearValidate();
  },
  async onConfirm() {
    if (submitting.value) return;
    const file = fileList.value[0]?.raw;
    if (values.type === 'zip') {
      if (!file || !file.name.toLowerCase().endsWith('.zip')) {
        ElMessage.warning('请选择 ZIP 插件包');
        return;
      }
    } else if (!(await form.value?.validate().catch(() => false))) {
      return;
    }
    submitting.value = true;
    modalApi.lock();
    try {
      if (values.type === 'zip' && file) {
        await installZipPluginApi(file);
      } else {
        await installGitPluginApi(values.repoUrl.trim());
      }
      ElMessage.success('插件安装成功，请完成相关配置并重启服务');
      await modalApi.close();
      emit('installed');
    } catch {
      // Keep the selected file or repository URL available for retry.
    } finally {
      submitting.value = false;
      modalApi.unlock();
    }
  },
});

defineExpose({ open: () => modalApi.open() });
</script>

<template>
  <Modal>
    <ElForm
      ref="form"
      :model="values"
      label-position="top"
      @submit.prevent="modalApi.onConfirm()"
    >
      <ElFormItem label="安装方式">
        <ElRadioGroup v-model="values.type" :disabled="submitting">
          <ElRadioButton value="zip">ZIP 压缩包</ElRadioButton>
          <ElRadioButton value="git">Git 仓库</ElRadioButton>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem v-if="values.type === 'zip'" label="ZIP 压缩包" required>
        <ElUpload
          ref="upload"
          v-model:file-list="fileList"
          class="w-full"
          drag
          accept=".zip,application/zip,application/x-zip-compressed"
          :auto-upload="false"
          :disabled="submitting"
          :limit="1"
          :on-change="onFileChange"
          :on-exceed="onExceed"
        >
          <IconifyIcon
            icon="lucide:upload-cloud"
            class="mx-auto mb-3 size-9 text-muted-foreground"
          />
          <div class="el-upload__text">选择或拖拽 ZIP 插件包</div>
        </ElUpload>
      </ElFormItem>
      <ElFormItem v-else label="Git 仓库地址" prop="repoUrl" :rules="gitRules">
        <ElInput
          v-model.trim="values.repoUrl"
          :disabled="submitting"
          placeholder="https://github.com/org/plugin.git"
          clearable
        />
      </ElFormItem>
    </ElForm>
  </Modal>
</template>
