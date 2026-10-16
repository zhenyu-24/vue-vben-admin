<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { getUserInfoApi, updateMyInfoApi } from '#/api';

const profileBaseSettingRef = ref();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'realName',
      component: 'Input',
      label: '昵称',
    },
    {
      fieldName: 'email',
      component: 'Input',
      label: '邮箱',
    },
    {
      fieldName: 'phone',
      component: 'Input',
      label: '手机号',
    },
  ];
});

onMounted(async () => {
  const data = await getUserInfoApi();
  profileBaseSettingRef.value.getFormApi().setValues({
    realName: data.nickname ?? data.realName ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
  });
});

async function handleSubmit(values: Record<string, any>) {
  try {
    const updateData: Record<string, any> = {};
    if (values.realName) updateData.nickname = values.realName;
    if (values.email) updateData.email = values.email;
    if (values.phone) updateData.phone = values.phone;
    if (Object.keys(updateData).length === 0) return;
    await updateMyInfoApi(updateData);
    ElMessage.success('基本信息更新成功');
  } catch (error: any) {
    const msg = error?.response?.data?.msg || error?.message || '更新失败';
    ElMessage.error(msg);
  }
}
</script>
<template>
  <ProfileBaseSetting
    ref="profileBaseSettingRef"
    :form-schema="formSchema"
    @submit="handleSubmit"
  />
</template>
