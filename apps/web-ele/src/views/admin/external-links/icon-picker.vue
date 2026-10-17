<script setup lang="ts">
import type { UploadFile } from 'element-plus';

import { ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { ElButton, ElMessage, ElPopover, ElUpload } from 'element-plus';

import { uploadExternalLinkIconApi } from '#/api/core/external-links';
import ExternalLinkIcon from '#/views/external-pages/icon.vue';

defineProps<{ disabled?: boolean }>();
const model = defineModel<string>({ default: '' });
const uploading = defineModel<boolean>('uploading', { default: false });
const visible = ref(false);
const icons = [
  { icon: 'lucide:globe', title: '网页' },
  { icon: 'lucide:layout-grid', title: '应用' },
  { icon: 'lucide:panels-top-left', title: '页面' },
  { icon: 'lucide:link', title: '链接' },
  { icon: 'lucide:bot', title: '智能助手' },
  { icon: 'lucide:message-square', title: '对话' },
  { icon: 'lucide:wrench', title: '工具' },
  { icon: 'lucide:code', title: '开发' },
  { icon: 'lucide:book-open', title: '文档' },
  { icon: 'lucide:chart-no-axes-combined', title: '图表' },
  { icon: 'lucide:database', title: '数据库' },
  { icon: 'lucide:cloud', title: '云服务' },
  { icon: 'lucide:image', title: '图片' },
  { icon: 'lucide:video', title: '视频' },
  { icon: 'lucide:mail', title: '邮件' },
  { icon: 'lucide:calendar', title: '日历' },
  { icon: 'lucide:star', title: '收藏' },
  { icon: 'lucide:rocket', title: '启动' },
  { icon: 'lucide:briefcase-business', title: '工作' },
  { icon: 'lucide:graduation-cap', title: '学习' },
  { icon: 'lucide:shield-check', title: '安全' },
  { icon: 'lucide:search', title: '搜索' },
  { icon: 'lucide:house', title: '首页' },
  { icon: 'lucide:settings', title: '设置' },
];

function select(icon: string) {
  model.value = icon;
  visible.value = false;
}

async function upload(file: UploadFile) {
  if (!file.raw || uploading.value) return;
  if (!/\.(?:png|jpe?g|gif|webp)$/i.test(file.name)) {
    ElMessage.error('请选择 PNG、JPG、GIF 或 WebP 图片');
    return;
  }
  if (file.raw.size > 5 * 1024 * 1024) {
    ElMessage.error('图标图片不能超过 5MB');
    return;
  }
  uploading.value = true;
  try {
    model.value = await uploadExternalLinkIconApi(file.raw);
    ElMessage.success('图标已上传');
  } catch {
    ElMessage.error('图标上传失败，请确认文件上传插件已启用后重试');
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="icon-field">
    <ElPopover
      v-model:visible="visible"
      trigger="click"
      :width="280"
      :disabled="disabled || uploading"
    >
      <template #reference>
        <ElButton
          class="icon-selector"
          :disabled="disabled || uploading"
          aria-label="选择图标"
        >
          <ExternalLinkIcon :icon="model" class="icon-preview" />
          <span>{{
            icons.find((item) => item.icon === model)?.title ||
            (model ? '当前图标' : '默认图标')
          }}</span>
          <IconifyIcon icon="lucide:chevron-down" class="ml-auto" />
        </ElButton>
      </template>
      <div class="icon-grid" role="group" aria-label="内置图标">
        <button
          v-for="item in icons"
          :key="item.icon"
          type="button"
          :title="item.title"
          :aria-label="item.title"
          :aria-pressed="model === item.icon"
          class="icon-option"
          @click="select(item.icon)"
        >
          <IconifyIcon :icon="item.icon" />
          <span>{{ item.title }}</span>
        </button>
      </div>
    </ElPopover>
    <ElUpload
      accept=".png,.jpg,.jpeg,.gif,.webp"
      :auto-upload="false"
      :show-file-list="false"
      :disabled="disabled || uploading"
      :on-change="upload"
    >
      <ElButton :loading="uploading" :disabled="disabled">
        <IconifyIcon
          v-if="!uploading"
          icon="lucide:upload"
          class="mr-2"
        />上传图片
      </ElButton>
    </ElUpload>
    <ElButton
      v-if="model"
      text
      :disabled="disabled || uploading"
      title="恢复默认图标"
      aria-label="恢复默认图标"
      @click="model = ''"
    >
      <IconifyIcon icon="lucide:x" />
    </ElButton>
  </div>
</template>

<style scoped>
.icon-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.icon-selector {
  flex: 1;
  min-width: 130px;
}
.icon-selector :deep(> span) {
  display: flex;
  gap: 8px;
  width: 100%;
}
.icon-preview {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  object-fit: contain;
}
.icon-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
}
.icon-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 58px;
  font-size: 12px;
  border: 1px solid transparent;
  border-radius: 4px;
}
.icon-option svg {
  width: 20px;
  height: 20px;
}
.icon-option:hover,
.icon-option[aria-pressed='true'] {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.icon-option:focus-visible {
  outline: 2px solid var(--el-color-primary);
}
</style>
