<script setup lang="ts">
import { ElSwitch } from 'element-plus';

import { $t } from '#/locales';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <ElSwitch
    class="admin-status-switch"
    inline-prompt
    :active-text="$t('page.admin.userPage.status.enabledText')"
    :inactive-text="$t('page.admin.userPage.status.disabledText')"
    :width="56"
    v-bind="$attrs"
  />
</template>

<style scoped>
.admin-status-switch {
  --el-switch-on-color: hsl(var(--primary));
  --el-switch-off-color: #cfd0d1;
  --el-switch-border-color: var(--el-switch-off-color);
}

.admin-status-switch :deep(.el-switch__core) {
  height: 22px;
  border-radius: 11px;
}

.admin-status-switch :deep(.el-switch__inner) {
  padding: 0 5px 0 20px;
}

.admin-status-switch :deep(.el-switch__inner-wrapper) {
  color: #fff;
  font-weight: 500;
}

.admin-status-switch :deep(.el-switch__action) {
  width: 18px;
  height: 18px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
}

.admin-status-switch.is-checked {
  --el-switch-border-color: hsl(var(--primary));
}

.admin-status-switch.is-checked :deep(.el-switch__inner) {
  padding: 0 20px 0 5px;
}

.admin-status-switch.is-checked :deep(.el-switch__inner-wrapper) {
  color: hsl(var(--primary-foreground));
}

.admin-status-switch.is-checked :deep(.el-switch__action) {
  left: calc(100% - 19px);
}
</style>
