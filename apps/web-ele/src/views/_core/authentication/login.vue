<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    // 选择账号类型组件
    // {
    //   component: 'VbenSelect',
    //   componentProps: {
    //     options: MOCK_USER_OPTIONS,
    //     placeholder: $t('authentication.selectAccount'),
    //   },
    //   fieldName: 'selectAccount',
    //   label: $t('authentication.selectAccount'),
    //   rules: z
    //     .string()
    //     .min(1, { message: $t('authentication.selectAccount') })
    //     .optional()
    //     .default('vben'),
    // },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  ];
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
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-forget-password="true"
    :show-register="true"
    :show-code-login="false"
    :show-qrcode-login="false"
    :show-third-party-login="false"
    title="欢迎回来 👋🏻"
    sub-title="请使用您的账号密码登录"
    @submit="authStore.authLogin"
  />
</template>
