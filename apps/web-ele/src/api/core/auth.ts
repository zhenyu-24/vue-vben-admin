import { useAccessStore } from '@vben/stores';

import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  export interface PasswordPolicy {
    min_length: number;
    max_length: number;
    require_special_char: boolean;
  }

  export interface CaptchaResult {
    is_enabled: boolean;
    expire_seconds: number;
    uuid: string;
    image: string;
  }

  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
    captcha?: string;
    uuid?: string;
  }

  /** 登录接口返回值 (fba 后端返回 snake_case) */
  export interface LoginResult {
    access_token: string;
    access_token_expire_time: string;
    session_uuid: string;
    password_expire_days_remaining: null | number;
    user: any;
  }

  /** 注册接口参数 */
  export interface RegisterParams {
    username: string;
    password: string;
    nickname?: string;
    email?: string;
    phone?: string;
  }
}

export async function getLoginCaptchaApi() {
  return requestClient.get<AuthApi.CaptchaResult>('/v1/auth/captcha');
}

export async function getPasswordPolicyApi() {
  return requestClient.get<AuthApi.PasswordPolicy>('/v1/auth/password-policy');
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/v1/auth/login', data, {
    withCredentials: true,
  });
}

/**
 * 注册
 */
export async function registerApi(data: AuthApi.RegisterParams) {
  return requestClient.post('/v1/auth/register', data);
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  return baseRequestClient.post('/v1/auth/refresh', null, {
    withCredentials: true,
  });
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return baseRequestClient.post('/v1/auth/logout', null, {
    withCredentials: true,
    headers: { Authorization: `Bearer ${useAccessStore().accessToken || ''}` },
  });
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/v1/auth/codes');
}
