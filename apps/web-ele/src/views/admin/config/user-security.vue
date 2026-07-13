<script setup lang="ts">
import type { ConfigResult } from '#/api';

import { onMounted, ref } from 'vue';

import { VbenButton } from '@vben/common-ui';
import { CircleCheck, Close, Edit } from '@element-plus/icons-vue';
import { $t } from '@vben/locales';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';

import { getAllConfigApi, updateConfigApi } from '#/api';
import { userSecuritySchema } from './data';

const [Form, formApi] = useVbenForm({
  showDefaultActions: false,
  schema: userSecuritySchema,
  commonConfig: {
    controlClass: 'w-full max-w-80',
    disabled: true,
    labelClass: 'justify-start ml-2 self-start',
    labelWidth: 180,
    hideRequiredMark: true,
  },
});

const editButtonShow = ref<boolean>(true);
const loading = ref<boolean>(false);
const saveLoading = ref<boolean>(false);

const userSecurityData = ref<ConfigResult[]>([]);

onMounted(() => {
  fetchConfigList();
});

const fetchConfigList = async () => {
  loading.value = true;
  try {
    userSecurityData.value = await getAllConfigApi({ type: 'USER_SECURITY' });
    userSecurityData.value.forEach((config: any) => {
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

const saveUserSecurityConfig = async () => {
  const { valid } = await formApi.validate();
  if (valid) {
    const data: Record<string, any> = await formApi.getValues();
    userSecurityData.value.forEach((config: any) => {
      if (Object.prototype.hasOwnProperty.call(data, config.key)) {
    config.value = data[config.key];
      }
    });
    saveLoading.value = true;
    try {
      await updateConfigApi(userSecurityData.value);
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
    <Edit class="mr-1 size-5" />
    修改
      </VbenButton>
      <template v-else>
      <VbenButton :loading="saveLoading" @click="saveUserSecurityConfig">
      <CircleCheck class="mr-1 size-5" />
      保存
    </VbenButton>
    <VbenButton
      class="ml-3"
      :disabled="saveLoading"
      variant="outline"
      @click="() => { editButtonShow = true; formApi.setState({ commonConfig: { disabled: true } }); fetchConfigList(); }"
    >
      <Close class="mr-1 size-5" />
      取消
    </VbenButton>
      </template>
    </div>
  </div>
</template>
