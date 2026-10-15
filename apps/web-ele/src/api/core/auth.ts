import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
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

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/v1/auth/login', data);
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
  });
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/v1/auth/codes');
}
