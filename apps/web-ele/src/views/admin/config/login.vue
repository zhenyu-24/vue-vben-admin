<script setup lang="ts">
import type { ConfigResult } from '#/api';

import { ref } from 'vue';

import { VbenButton } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';

import { getAllConfigApi, updateConfigApi } from '#/api';
import { loginSchema } from './data';

const [Form, formApi] = useVbenForm({
  showDefaultActions: false,
  schema: loginSchema,
  commonConfig: {
    controlClass: 'w-full max-w-80',
    disabled: true,
    labelClass: 'justify-start ml-2 self-start',
    labelWidth: 120,
    wrapperClass: 'flex-col items-start',
    hideRequiredMark: true,
  },
});

const editButtonShow = ref<boolean>(true);
const loading = ref<boolean>(false);
const saveLoading = ref<boolean>(false);

const loginData = ref<ConfigResult[]>([]);
const fetchConfigList = async () => {
  loading.value = true;
  try {
    loginData.value = await getAllConfigApi({ type: 'LOGIN' });
    loginData.value.forEach((config: any) => {
      formApi.setState((prev: any) => {
    return {
      schema: prev.schema?.map((item: any) => {
        if (item.fieldName === config.key) {
          return {
            ...item,
            label: config.name,
          };
        }
        return item;
      }),
    };
      });
      formApi.setValues({ [config.key]: config.value });
    });
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const saveLoginConfig = async () => {
  const { valid } = await formApi.validate();
  if (valid) {
    const data: Record<string, any> = await formApi.getValues();
    loginData.value.forEach((config: any) => {
      if (Object.prototype.hasOwnProperty.call(data, config.key)) {
    config.value = data[config.key];
      }
    });
    saveLoading.value = true;
    try {
      await updateConfigApi(loginData.value);
      ElMessage.success('操作成功');
      editButtonShow.value = true;
      formApi.setState({ commonConfig: { disabled: true } });
      await fetchConfigList();
    } catch (error) {
      console.error(error);
    } finally {
      saveLoading.value = false;
    }
  }
};

defineExpose({
  fetchConfigList,
});
</script>

<template>
  <div v-loading="loading">
    <Form />
    <div class="ml-1.5 mt-3">
      <VbenButton v-if="editButtonShow" @click="() => { editButtonShow = false; formApi.setState({ commonConfig: { disabled: false } }); }">
    <IconifyIcon icon="material-symbols:edit-outline" class="mr-1" />
    修改
      </VbenButton>
      <template v-else>
    <VbenButton :loading="saveLoading" @click="saveLoginConfig">
      <IconifyIcon icon="material-symbols:save-outline" class="mr-1" />
      保存
    </VbenButton>
    <VbenButton
      class="ml-3"
      :disabled="saveLoading"
      variant="outline"
      @click="() => { editButtonShow = true; formApi.setState({ commonConfig: { disabled: true } }); fetchConfigList(); }"
    >
      <IconifyIcon icon="material-symbols:close" class="mr-1" />
      取消
    </VbenButton>
      </template>
    </div>
  </div>
</template>
