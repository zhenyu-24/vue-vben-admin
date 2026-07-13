<script setup lang="ts">
import { h, nextTick, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import { ElCard, ElTabs } from 'element-plus';

import UserSecurity from './user-security.vue';
import Login from './login.vue';
import Email from './email.vue';

const activeKey = ref('user-security');

const userSecurityRef = ref();
const loginRef = ref();
const emailRef = ref();

const tabItems = [
  {
    key: 'user-security',
    label: '安全配置',
    icon: 'icon-[carbon--security]',
  },
  {
    key: 'login',
    label: '登录配置',
    icon: 'icon-[majesticons--lock-line]',
  },
  {
    key: 'email',
    label: '邮件配置',
    icon: 'icon-[ic--outline-email]',
  },
];

watch(activeKey, async (newValue) => {
  await nextTick();
  if (newValue === 'user-security' && userSecurityRef.value) {
    await userSecurityRef.value.fetchConfigList();
  }
  if (newValue === 'login' && loginRef.value) {
    await loginRef.value.fetchConfigList();
  }
  if (newValue === 'email' && emailRef.value) {
    await emailRef.value.fetchConfigList();
  }
});

onMounted(async () => {
  await nextTick();
  if (userSecurityRef.value) {
    await userSecurityRef.value.fetchConfigList();
  }
});
</script>

<template>
  <Page auto-content-height>
    <ElCard class="h-full overflow-y-auto" shadow="never">
      <ElTabs
        v-model="activeKey"
        tab-position="left"
        :style="{ height: '100%' }"
      >
        <ElTabsPane
          v-for="item in tabItems"
          :key="item.key"
          :label="item.label"
          :name="item.key"
        >
          <UserSecurity v-if="item.key === 'user-security'" ref="userSecurityRef" />
          <Login v-else-if="item.key === 'login'" ref="loginRef" />
          <Email v-else-if="item.key === 'email'" ref="emailRef" />
        </ElTabsPane>
      </ElTabs>
    </ElCard>
  </Page>
</template>

<style lang="scss" scoped>
:deep(.el-card__body) {
  height: 100%;
  min-height: 100%;
}
</style>
