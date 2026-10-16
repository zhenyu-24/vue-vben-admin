<script setup lang="ts">
import { VbenTooltip } from '@vben/common-ui';

import { Refresh } from '@element-plus/icons-vue';
import { ElIcon, ElInput } from 'element-plus';

defineOptions({ inheritAttrs: false });
defineProps<{ disabled: boolean; image: string; loading: boolean }>();
const emit = defineEmits<{ refresh: [] }>();
const model = defineModel<string>();
</script>

<template>
  <div class="captcha-control">
    <ElInput
      v-bind="$attrs"
      v-model="model"
      :disabled="disabled || loading"
      placeholder="请输入验证码"
      aria-label="验证码"
      autocomplete="off"
      autocapitalize="off"
      :spellcheck="false"
    />
    <VbenTooltip side="top" :disabled="disabled || loading">
      刷新验证码
      <template #trigger>
        <button
          type="button"
          class="captcha-image"
          aria-label="刷新验证码"
          :disabled="disabled || loading"
          @click.stop="emit('refresh')"
          @keydown.enter.stop.prevent="emit('refresh')"
        >
          <ElIcon v-if="loading" class="is-loading" :size="20">
            <Refresh />
          </ElIcon>
          <img v-else :src="image" alt="图形验证码" width="120" height="40" />
        </button>
      </template>
    </VbenTooltip>
  </div>
</template>

<style scoped>
.captcha-control {
  display: flex;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.captcha-control .el-input {
  flex: 1;
  min-width: 0;
}

.captcha-control :deep(.el-input__wrapper) {
  height: 40px;
  border-radius: 6px;
}

.captcha-image {
  display: flex;
  flex: 0 0 120px;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 40px;
  overflow: hidden;
  cursor: pointer;
  background: white;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
}

.captcha-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.captcha-image:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.captcha-image:disabled {
  cursor: wait;
  opacity: 0.6;
}
</style>
