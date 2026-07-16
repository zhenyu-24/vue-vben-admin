<script setup lang="ts">
import { ref } from 'vue';

import { Profile, VCropper, VbenModal, useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { ElMessage } from 'element-plus';

import { uploadAvatarApi } from '#/api';

import ProfileBase from './base-setting.vue';
import ProfileNotificationSetting from './notification-setting.vue';
import ProfilePasswordSetting from './password-setting.vue';
// import ProfileSecuritySetting from './security-setting.vue';

const userStore = useUserStore();

const tabsValue = ref<string>('basic');
const avatarUploading = ref(false);

// 裁剪弹窗
const cropperImageUrl = ref('');
const cropperRef = ref<InstanceType<typeof VCropper> | null>(null);
let pendingFile: File | null = null;

const [cropperModal, cropperModalApi] = useVbenModal({
  destroyOnClose: true,
  closeOnClickModal: false,
  title: '裁剪头像',
  async onConfirm() {
    if (!cropperRef.value || !pendingFile) return;
    cropperModalApi.lock();
    try {
      const outputFormat = pendingFile.type === 'image/webp' ? 'image/webp' as const
        : pendingFile.type === 'image/png' ? 'image/png' as const
        : 'image/jpeg' as const;
      const outputExt = outputFormat === 'image/jpeg' ? 'jpg' : outputFormat.split('/')[1];
      const croppedBlob = await cropperRef.value.getCropImage(outputFormat, 0.92, 'blob');
      if (!croppedBlob) throw new Error('裁剪失败，请重试');
      const croppedFile = new File(
        [croppedBlob as Blob],
        pendingFile.name.replace(/\.[^.]+$/, `.${outputExt}`),
        { type: outputFormat },
      );
      const result = await uploadAvatarApi(croppedFile);
      if (userStore.userInfo) userStore.userInfo.avatar = result.url;
      ElMessage.success('头像更新成功');
      await cropperModalApi.close();
    } catch (error: any) {
      const msg = error?.response?.data?.msg || error?.message || '头像上传失败';
      ElMessage.error(msg);
      cropperModalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      if (cropperImageUrl.value) URL.revokeObjectURL(cropperImageUrl.value);
      pendingFile = null;
      cropperImageUrl.value = '';
    }
  },
});

const tabs = ref([
  {
    label: '基本设置',
    value: 'basic',
  },
  // {
  //   label: '安全设置',
  //   value: 'security',
  // },
  {
    label: '修改密码',
    value: 'password',
  },
  {
    label: '新消息提醒',
    value: 'notice',
  },
]);

/** 检测 WebP/GIF 是否为动图 */
async function checkIsAnimated(file: File): Promise<boolean> {
  if (file.type === 'image/gif') return true;
  if (file.type !== 'image/webp') return false;

  // WebP 动图头部包含 'ANIM' chunk
  const buffer = await file.slice(0, 50).arrayBuffer();
  const text = new TextDecoder().decode(buffer);
  return text.includes('ANIM');
}

async function handleAvatarChange(file: File) {
  // 验证文件大小
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('头像文件不能超过 5MB');
    return;
  }
  // 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('仅支持 JPG/PNG/GIF/WEBP/SVG 格式');
    return;
  }

  // 动图（GIF / 动画 WebP）→ 跳过裁剪，直接上传
  if (await checkIsAnimated(file)) {
    try {
      avatarUploading.value = true;
      const result = await uploadAvatarApi(file);
      if (userStore.userInfo) {
        userStore.userInfo.avatar = result.url;
      }
      ElMessage.success('动图已直接上传（裁剪仅支持静态图片）');
    } catch (error: any) {
      const msg = error?.response?.data?.msg || error?.message || '头像上传失败';
      ElMessage.error(msg);
    } finally {
      avatarUploading.value = false;
    }
    return;
  }

  // 静态图片 → 打开裁剪弹窗
  pendingFile = file;
  cropperImageUrl.value = URL.createObjectURL(file);
  cropperModalApi.open();
}

</script>
<template>
  <Profile
    v-model:model-value="tabsValue"
    title="个人中心"
    :user-info="userStore.userInfo"
    :tabs="tabs"
    :avatar-upload="true"
    :avatar-uploading="avatarUploading"
    @avatar-change="handleAvatarChange"
  >
    <template #content>
      <ProfileBase v-if="tabsValue === 'basic'" />
      <!-- <ProfileSecuritySetting v-if="tabsValue === 'security'" /> -->
      <ProfilePasswordSetting v-if="tabsValue === 'password'" />
      <ProfileNotificationSetting v-if="tabsValue === 'notice'" />
    </template>
  </Profile>

  <!-- 头像裁剪弹窗 -->
  <VbenModal :modal-api="cropperModalApi">
    <div class="flex justify-center">
      <VCropper
        ref="cropperRef"
        :img="cropperImageUrl"
        aspect-ratio="1:1"
        :width="480"
        :height="420"
      />
    </div>
  </VbenModal>
</template>
