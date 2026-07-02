<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { getUserInfoApi } from '#/api';

const profileBaseSettingRef = ref();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'realName',
      component: 'Input',
      label: '姓名',
      dynamicDisabled: () => true,
    },
    {
      fieldName: 'username',
      component: 'Input',
      label: '用户名',
      dynamicDisabled: () => true,
    },
    {
      fieldName: 'email',
      component: 'Input',
      label: '邮箱',
      dynamicDisabled: () => true,
    },
    {
      fieldName: 'phone',
      component: 'Input',
      label: '手机号',
      dynamicDisabled: () => true,
    },
  ];
});

onMounted(async () => {
  const data = await getUserInfoApi();
  // 将 fba 后端字段映射为表单显示
  profileBaseSettingRef.value.getFormApi().setValues({
    realName: data.nickname ?? data.realName ?? '',
    username: data.username ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
  });
});

function handleSubmit() {
  ElMessage.info('基本信息为只读，请在系统管理页面修改');
}
</script>
<template>
  <ProfileBaseSetting
    ref="profileBaseSettingRef"
    :form-schema="formSchema"
    @submit="handleSubmit"
  />
</template>
