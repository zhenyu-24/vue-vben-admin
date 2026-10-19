<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, h, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { AuthenticationRegister, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { ElAlert, ElButton } from 'element-plus';

import { getPasswordPolicyApi } from '#/api';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Register' });

const authStore = useAuthStore();
const registerRef = ref<InstanceType<typeof AuthenticationRegister>>();
const policy = ref<Awaited<ReturnType<typeof getPasswordPolicyApi>>>();
const policyLoading = ref(false);
const policyFailed = ref(false);
let disposed = false;

async function refreshPolicy() {
  if (policyLoading.value || disposed) return false;
  policyLoading.value = true;
  policyFailed.value = false;
  try {
    const result = await getPasswordPolicyApi();
    if (disposed) return false;
    policy.value = result;
    return true;
  } catch {
    if (!disposed) {
      policy.value = undefined;
      policyFailed.value = true;
    }
    return false;
  } finally {
    policyLoading.value = false;
  }
}

function handleFocus() {
  if (!authStore.registerLoading) void refreshPolicy();
}

onMounted(() => {
  void refreshPolicy();
  window.addEventListener('focus', handleFocus);
});
onBeforeUnmount(() => {
  disposed = true;
  window.removeEventListener('focus', handleFocus);
});

const passwordHint = computed(() => {
  const current = policy.value;
  if (!current) return '正在获取密码规则';
  const requirements = [];
  if (current.require_special_char) requirements.push('特殊字符（如 !@#$%）');
  return `密码长度为 ${current.min_length}～${current.max_length} 个字符${requirements.length ? `，必须包含${requirements.join('、')}` : ''}`;
});

function passwordError(value: string) {
  const current = policy.value;
  if (!current) return '请先加载密码规则';
  // Python len counts Unicode code points, as does Array.from.
  const length = Array.from(value).length;
  if (length < current.min_length)
    return `密码长度不能少于 ${current.min_length} 个字符`;
  if (length > current.max_length)
    return `密码长度不能超过 ${current.max_length} 个字符`;
  if (
    current.require_special_char &&
    !/[!@#$%^&*()_+\-=[\]{};:'",.<>?/\\|`~]/.test(value)
  )
    return '密码必须包含特殊字符（如：!@#$%）';
  return undefined;
}

const formSchema = computed((): VbenFormSchema[] => {
  return [
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
        passwordStrength: true,
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      renderComponentContent() {
        return {
          strengthText: () => passwordHint.value,
        };
      },
      rules: z
        .string({ required_error: $t('authentication.passwordTip') })
        .superRefine((value, context) => {
          const message = passwordError(value);
          if (message) context.addIssue({ code: 'custom', message });
        }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.confirmPassword'),
      },
      dependencies: {
        rules(values) {
          const { password } = values;
          return z
            .string({ required_error: $t('authentication.passwordTip') })
            .min(1, { message: $t('authentication.passwordTip') })
            .refine((value) => value === password, {
              message: $t('authentication.confirmPasswordTip'),
            });
        },
        triggerFields: ['password'],
      },
      fieldName: 'confirmPassword',
      label: $t('authentication.confirmPassword'),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入邮箱（可选）',
      },
      fieldName: 'email',
      label: '邮箱（可选）',
      rules: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入手机号（可选）',
      },
      fieldName: 'phone',
      label: '手机号（可选）',
      rules: z
        .string()
        .regex(/^1[3-9]\d{9}$/, '手机号格式不正确')
        .optional()
        .or(z.literal('')),
    },
    {
      component: 'VbenCheckbox',
      fieldName: 'agreePolicy',
      renderComponentContent: () => ({
        default: () =>
          h('span', [
            $t('authentication.agree'),
            h(
              'a',
              {
                class: 'vben-link ml-1 ',
                href: '',
              },
              `${$t('authentication.privacyPolicy')} & ${$t('authentication.terms')}`,
            ),
          ]),
      }),
      rules: z.boolean().refine((value) => !!value, {
        message: $t('authentication.agreeTip'),
      }),
    },
  ];
});

async function handleSubmit(value: Recordable<any>) {
  if (authStore.registerLoading || policyLoading.value) return;
  if (!(await refreshPolicy())) return;
  await nextTick();
  const result = await registerRef.value?.getFormApi().validate();
  if (!result?.valid) return;
  try {
    await authStore.register(value, () => {
      window.location.href = '/auth/login';
    });
  } catch {
    // Request errors are displayed by the interceptor.
  }
}
</script>

<template>
  <div>
    <ElAlert
      v-if="policyFailed"
      title="密码规则加载失败，请重试"
      type="error"
      :closable="false"
      show-icon
      class="mb-4"
    >
      <ElButton link type="primary" @click="refreshPolicy">重新加载</ElButton>
    </ElAlert>
    <AuthenticationRegister
      ref="registerRef"
      :form-schema="formSchema"
      :loading="authStore.registerLoading || policyLoading"
      @submit="handleSubmit"
    />
  </div>
</template>
