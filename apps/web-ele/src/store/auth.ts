import type { Recordable, UserInfo } from '@vben/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { ElMessage, ElNotification } from 'element-plus';
import { defineStore } from 'pinia';

import {
  getAccessCodesApi,
  getUserInfoApi,
  loginApi,
  logoutApi,
  registerApi,
} from '#/api';
import { $t } from '#/locales';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);
  const registerLoading = ref(false);

  /**
   * 将 fba 后端用户信息映射为 Vben Admin 的 UserInfo 格式
   */
  function mapUserInfo(raw: Record<string, any>, token?: string): UserInfo {
    // 提取角色
    const rawRoles: string[] = Array.isArray(raw.roles) 
      ? raw.roles.map((r: any) => r.name ?? r) 
      : [];
    
    const roles = [...rawRoles];
    // 管理员看 is_super_admin
    return {
      ...raw,
      userId: String(raw.id ?? raw.userId ?? ''),
      realName: raw.nickname ?? raw.realName ?? raw.username ?? '',
      desc: raw.desc ?? '',
      homePath: raw.homePath ?? '',
      token: token ?? raw.token ?? '',
      roles
    };
  }

  /**
   * 异步处理登录操作
   * Asynchronously handle the login process
   * @param params 登录表单数据
   */
  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;

      // 过滤前端滑块验证码（boolean），fba 后端使用 text captcha + uuid
      const { captcha, selectAccount, ...restParams } = params;
      const loginParams =
        typeof captcha === 'string'
          ? { ...restParams, captcha, uuid: params.uuid }
          : restParams;

      // fba 后端返回 snake_case: { access_token, access_token_expire_time, session_uuid, user }
      const result = await loginApi(loginParams);
      const accessToken = result.access_token;

      if (accessToken) {
        accessStore.setAccessToken(accessToken);

        // 获取用户信息（包含 roles）和权限码
        const [fetchUserInfoResult, accessCodes] = await Promise.all([
          fetchUserInfo(),
          getAccessCodesApi(),
        ]);

        // 映射为 Vben Admin 的 UserInfo 格式
        userInfo = mapUserInfo(fetchUserInfoResult, accessToken);
        console.log("userInfo:", userInfo);
        userStore.setUserInfo(userInfo);
        accessStore.setAccessCodes(accessCodes);

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else {
          onSuccess
            ? await onSuccess?.()
            : await router.push(
                userInfo.homePath || preferences.app.defaultHomePath,
              );
        }

        if (userInfo?.realName) {
          ElNotification({
            message: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
            title: $t('authentication.loginSuccess'),
            type: 'success',
          });
        }
      }
    } finally {
      loginLoading.value = false;
    }

    return { userInfo };
  }

  /**
   * 用户注册
   */
  async function register(params: Recordable<any>, onSuccess?: () => void) {
    try {
      registerLoading.value = true;
      // 只发送非空的可选字段，避免向后端发送空字符串
      const registerData: Record<string, any> = {
        username: params.username,
        password: params.password,
      };
      if (params.email) registerData.email = params.email;
      if (params.phone) registerData.phone = params.phone;
      if (params.nickname) registerData.nickname = params.nickname;
      await registerApi(registerData);
      ElMessage.success($t('authentication.registerSuccess') || '注册成功');
      onSuccess?.();
    } finally {
      registerLoading.value = false;
    }
  }

  async function logout(redirect: boolean = true) {
    try {
      await logoutApi();
    } catch {
      // 不做任何处理
    }
    resetAllStores();
    accessStore.setLoginExpired(false);

    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? {
            redirect: encodeURIComponent(router.currentRoute.value.fullPath),
          }
        : {},
    });
  }

  async function fetchUserInfo() {
    const userInfo = await getUserInfoApi();
    // 暂不映射，authLogin 中会整体 mapUserInfo
    userStore.setUserInfo(userInfo);
    return userInfo;
  }

  function $reset() {
    loginLoading.value = false;
    registerLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    loginLoading,
    logout,
    register,
    registerLoading,
  };
});
