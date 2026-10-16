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
    :width="60"
    v-bind="$attrs"
  />
</template>

<style scoped>
.admin-status-switch :deep(.el-switch__core) {
  height: 26px;
  border-radius: 13px;
}

.admin-status-switch :deep(.el-switch__action) {
  width: 20px;
  height: 20px;
}

.admin-status-switch.is-checked :deep(.el-switch__action) {
  left: calc(100% - 21px);
}
</style>
