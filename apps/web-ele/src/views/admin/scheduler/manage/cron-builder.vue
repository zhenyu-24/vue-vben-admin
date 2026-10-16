<script setup lang="ts">
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  ElAlert,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
} from 'element-plus';

import { cronPresets, nextRuns, schedulerValues, validCron } from './schedule';

const emit = defineEmits<{ confirm: [value: string] }>();
const fields = ref(['*', '*', '*', '*', '*']);
const labels = ['分钟', '小时', '日期', '月份', '星期'];
const expression = computed(() =>
  fields.value.map((field) => field.trim()).join(' '),
);
const valid = computed(() => validCron(expression.value));
const preview = computed(() =>
  valid.value
    ? nextRuns({
        ...schedulerValues(),
        id: '',
        status: 1,
        total_run_count: 0,
        last_run_time: null,
        created_time: '',
        crontab: expression.value,
      })
    : [],
);
function setExpression(value: string) {
  fields.value = validCron(value)
    ? value.trim().split(/\s+/)
    : ['*', '*', '*', '*', '*'];
}
const [Modal, modalApi] = useVbenModal({
  title: '配置执行计划',
  class: 'w-[640px] max-w-[calc(100vw-2rem)]',
  onOpenChange(open) {
    if (open)
      setExpression(
        modalApi.getData<{ value: string }>()?.value ?? '* * * * *',
      );
  },
  onConfirm() {
    if (!valid.value) return;
    emit('confirm', expression.value);
    modalApi.close();
  },
});
defineExpose({ open: (value: string) => modalApi.setData({ value }).open() });
</script>

<template>
  <Modal :confirm-disabled="!valid">
    <ElForm label-position="top">
      <ElFormItem label="常用计划">
        <ElSelect
          class="w-full"
          :model-value="expression"
          @update:model-value="setExpression"
        >
          <ElOption
            v-for="preset in cronPresets"
            :key="preset.value"
            :label="preset.label"
            :value="preset.value"
          />
        </ElSelect>
      </ElFormItem>
      <div class="grid grid-cols-2 gap-x-3 md:grid-cols-5">
        <ElFormItem
          v-for="(label, index) in labels"
          :key="label"
          :label="label"
        >
          <ElInput v-model="fields[index]" />
        </ElFormItem>
      </div>
    </ElForm>
    <ElAlert
      v-if="!valid"
      title="请输入合法的五段 Cron 表达式（星期为 0–6）"
      type="error"
      :closable="false"
    />
    <div v-else class="space-y-3">
      <code class="block rounded border p-3">{{ expression }}</code>
      <div class="text-sm font-medium">预计执行时间（浏览器本地时区）</div>
      <ol class="space-y-1 font-mono text-sm">
        <li v-for="(time, index) in preview" :key="index">{{ time }}</li>
      </ol>
    </div>
  </Modal>
</template>
