<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { ElAlert, ElButton, ElMessage } from 'element-plus';

import { getLoginCaptchaApi } from '#/api';
import { useAuthStore } from '#/store';

import CaptchaInput from './captcha-input.vue';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const loginRef = ref<InstanceType<typeof AuthenticationLogin>>();
const captchaEnabled = ref(false);
const captchaImage = ref('');
const captchaUuid = ref('');
const captchaLoading = ref(false);
const captchaReady = ref(false);
const captchaFailed = ref(false);
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let expiresAt = 0;
let disposed = false;

async function refreshCaptcha() {
  if (captchaLoading.value || authStore.loginLoading || disposed) return;
  clearTimeout(refreshTimer);
  captchaLoading.value = true;
  captchaReady.value = false;
  captchaFailed.value = false;
  try {
    const result = await getLoginCaptchaApi();
    if (disposed) return;
    captchaEnabled.value = result.is_enabled;
    captchaUuid.value = result.uuid;
    captchaImage.value = `data:image/png;base64,${result.image}`;
    expiresAt = Date.now() + result.expire_seconds * 1000;
    await loginRef.value?.getFormApi().setFieldValue('captcha', '', false);
    captchaReady.value = true;
    if (result.is_enabled && result.expire_seconds > 0) {
      refreshTimer = setTimeout(
        () => void refreshCaptcha(),
        Math.max((result.expire_seconds - 3) * 1000, 1000),
      );
    }
  } catch {
    if (!disposed) captchaFailed.value = true;
  } finally {
    captchaLoading.value = false;
  }
}

function handleFocus() {
  if (
    !captchaLoading.value &&
    (!captchaEnabled.value || Date.now() >= expiresAt)
  ) {
    void refreshCaptcha();
  }
}

async function handleSubmit(values: Recordable<any>) {
  if (authStore.loginLoading || captchaLoading.value) return;
  if (!captchaReady.value) {
    ElMessage.warning('请先重新加载登录验证');
    return;
  }
  if (captchaEnabled.value && expiresAt > 0 && Date.now() >= expiresAt) {
    ElMessage.warning('验证码已过期，请重新输入');
    await refreshCaptcha();
    return;
  }
  clearTimeout(refreshTimer);
  try {
    await authStore.authLogin({
      username: values.username,
      password: values.password,
      ...(captchaEnabled.value
        ? { captcha: values.captcha.trim(), uuid: captchaUuid.value }
        : {}),
    });
  } catch {
    await refreshCaptcha();
  }
}

onMounted(() => {
  void refreshCaptcha();
  window.addEventListener('focus', handleFocus);
});

onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(refreshTimer);
  window.removeEventListener('focus', handleFocus);
});

const formSchema = computed((): VbenFormSchema[] => {
  const fields: VbenFormSchema[] = [
    {
      component: 'VbenInput',
      componentProps: {
        autocomplete: 'username',
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        autocomplete: 'current-password',
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  ];
  if (captchaEnabled.value) {
    fields.push({
      component: CaptchaInput,
      componentProps: {
        image: captchaImage.value,
        loading: captchaLoading.value,
        disabled: authStore.loginLoading,
        onRefresh: refreshCaptcha,
      },
      fieldName: 'captcha',
      label: '验证码',
      rules: z.string().trim().min(1, { message: '请输入验证码' }),
    });
  }
  return fields;
});
</script>

<!--
  AuthenticationLogin props 说明：

  显示开关（false=隐藏，true=显示）：
    showCodeLogin       false   手机号/验证码登录按钮
    showForgetPassword  true    忘记密码链接
    showQrcodeLogin     false   扫码登录按钮
    showRegister        true    注册账号链接
    showRememberMe      false   记住我复选框
    showThirdPartyLogin false   第三方登录 (GitHub/Google等)

  路由路径：
    codeLoginPath       /auth/code-login          验证码登录页路径
    forgetPasswordPath  /auth/forget-password     忘记密码页路径
    qrCodeLoginPath     /auth/qrcode-login        扫码登录页路径
    registerPath        /auth/register            注册页路径

  自定义文案：
    title               ''    标题，默认"欢迎回来 👋🏻"
    subTitle            ''    副标题，默认国际化文案
    submitButtonText    ''    登录按钮文字，默认"登录"
-->
<template>
  <div class="login-content">
    <ElAlert
      v-if="captchaFailed"
      title="登录验证加载失败，请重试"
      type="error"
      :closable="false"
      show-icon
      class="mb-4"
    >
      <ElButton link type="primary" @click="refreshCaptcha">重新加载</ElButton>
    </ElAlert>
    <AuthenticationLogin
      ref="loginRef"
      :form-schema="formSchema"
      :loading="authStore.loginLoading || captchaLoading"
      :show-forget-password="true"
      :show-register="true"
      :show-code-login="false"
      :show-qrcode-login="false"
      :show-third-party-login="false"
      @submit="handleSubmit"
    >
      <template #title>
        <div class="mb-8">
          <h1 class="mb-3 text-3xl font-bold text-foreground lg:text-4xl">
            欢迎回来 👋🏻
          </h1>
          <p class="text-sm text-muted-foreground">请使用您的账号密码登录</p>
        </div>
      </template>
    </AuthenticationLogin>
  </div>
</template>

<style scoped>
.login-content {
  width: 100%;
  max-width: 488px;
}
</style>
