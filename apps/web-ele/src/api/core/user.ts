import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户信息（fba 后端路径为 /sys/users/me）
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo>('/sys/users/me');
}

/** 修改密码接口参数 */
export interface UpdatePasswordParams {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

/**
 * 修改当前用户密码（fba 后端 PUT /sys/users/me/password）
 */
export async function updatePasswordApi(data: UpdatePasswordParams) {
  return requestClient.put('/sys/users/me/password', data);
}

/**
 * 修改当前用户昵称（fba 后端 PUT /sys/users/me/nickname,  body: { nickname }）
 */
export async function updateNicknameApi(nickname: string) {
  return requestClient.put('/sys/users/me/nickname', { nickname });
}

/**
 * 修改当前用户邮箱（fba 后端 PUT /sys/users/me/email, 需邮箱验证码）
 */
export async function updateEmailApi(email: string, captcha: string) {
  return requestClient.put('/sys/users/me/email', { email, captcha });
}

/** 更新个人信息参数 */
export interface UpdateMyInfoParams {
  nickname?: string;
  email?: string;
  phone?: string;
}

/**
 * 更新当前用户个人信息（PATCH /sys/users/me）
 */
export async function updateMyInfoApi(data: UpdateMyInfoParams) {
  return requestClient.patch('/sys/users/me', data);
}

/** 分页查询用户列表参数 */
export interface GetUsersParams {
  page?: number;
  size?: number;
  username?: string;
  phone?: string;
  status?: number;
}

/** 分页用户列表（GET /sys/users） */
export async function getUsersApi(params?: GetUsersParams) {
  return requestClient.get('/sys/users', { params });
}
