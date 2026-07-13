<script setup lang="ts">
import { Page } from '@vben/common-ui';

import { ElCard } from 'element-plus';

import UserSecurity from './user-security.vue';
import Login from './login.vue';
import Email from './email.vue';
</script>

<template>
  <Page>
    <div class="config-grid">
      <ElCard header="安全配置" shadow="never">
        <UserSecurity />
      </ElCard>
      <ElCard header="登录配置" shadow="never">
        <Login />
      </ElCard>
      <ElCard header="邮件配置" shadow="never">
        <Email />
      </ElCard>
    </div>
  </Page>
</template>

<style lang="scss" scoped>
.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
  height: 100%;
  overflow-y: auto;

  .el-card:nth-child(3) {
    grid-column: 1 / -1;
  }
}
</style>
