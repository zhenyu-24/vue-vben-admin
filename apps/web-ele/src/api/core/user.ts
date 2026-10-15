import type { UserInfo } from '@vben/types';

import type { PaginationResult, SysId } from '#/types/api';

import { requestClient } from '#/api/request';

/**
 * 获取用户信息（fba 后端路径为 /sys/users/me）
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo>('/v1/sys/users/me');
}

/** 修改密码接口参数 */
export interface UpdatePasswordParams {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

/**
 * 修改当前用户密码（fba 后端 PUT /v1/sys/users/me/password）
 */
export async function updatePasswordApi(data: UpdatePasswordParams) {
  return requestClient.put('/v1/sys/users/me/password', data);
}

/**
 * 修改当前用户昵称（fba 后端 PUT /v1/sys/users/me/nickname,  body: { nickname }）
 */
export async function updateNicknameApi(nickname: string) {
  return requestClient.put('/v1/sys/users/me/nickname', { nickname });
}

/**
 * 修改当前用户邮箱（fba 后端 PUT /v1/sys/users/me/email, 需邮箱验证码）
 */
export async function updateEmailApi(email: string, captcha: string) {
  return requestClient.put('/v1/sys/users/me/email', { email, captcha });
}

/** 更新个人信息参数 */
export interface UpdateMyInfoParams {
  nickname?: string;
  email?: string;
  phone?: string;
}

/**
 * 更新当前用户个人信息（PATCH /v1/sys/users/me）
 */
export async function updateMyInfoApi(data: UpdateMyInfoParams) {
  return requestClient.patch('/v1/sys/users/me', data);
}

/**
 * 上传当前用户头像（POST /v1/user/me/avatar, multipart/form-data）
 * @param file 头像文件（jpg/jpeg/png/gif/webp/svg, ≤5MB）
 * @returns 上传文件信息 { url, size, original_name, ... }
 */
export async function uploadAvatarApi(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post('/v1/user/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/** 分页查询用户列表参数 */
export interface GetUsersParams {
  page?: number;
  size?: number;
  username?: string;
  phone?: string;
  status?: number;
  sortBy?: string;
  sortOrder?: string;
}

/** 分页用户列表（GET /v1/sys/users） */
export async function getUsersApi(params?: GetUsersParams) {
  return requestClient.get<PaginationResult<SysUserResult>>('/v1/sys/users', {
    params,
  });
}

// ------ 用户管理 CRUD ------

export interface SysUserResult {
  id: number;
  uuid: string;
  dept_id?: null | SysId;
  username: string;
  nickname: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: number;
  is_superuser: boolean;
  is_staff: boolean;
  is_multi_login: boolean;
  join_time: string;
  last_login_time: string;
  dept?: null | { id: SysId; name: string };
  roles: { id: SysId; name: string }[];
}

export interface SysUpdateUserParams {
  dept_id?: null | SysId;
  username: string;
  nickname: string;
  avatar?: null | string;
  email?: null | string;
  phone?: null | string;
  roles: SysId[];
}

export interface SysAddUserParams extends SysUpdateUserParams {
  password: string;
}

export interface SysResetPasswordParams {
  password: string;
}

/** 创建用户 */
export async function createSysUserApi(data: SysAddUserParams) {
  return requestClient.post('/v1/sys/users', data);
}

/** 更新用户 */
export async function updateSysUserApi(pk: number, data: SysUpdateUserParams) {
  return requestClient.put(`/v1/sys/users/${pk}`, data);
}

/** 删除用户 */
export async function deleteSysUserApi(pk: number) {
  return requestClient.delete(`/v1/sys/users/${pk}`);
}

/** 切换用户权限状态（status/superuser/staff/multi_login） */
export async function updateSysUserPermissionApi(pk: number, type: string) {
  return requestClient.put(`/v1/sys/users/${pk}/permissions`, undefined, {
    params: { type },
  });
}

/** 重置用户密码 */
export async function resetSysUserPasswordApi(
  pk: number,
  data: SysResetPasswordParams,
) {
  return requestClient.put(`/v1/sys/users/${pk}/password`, data);
}
