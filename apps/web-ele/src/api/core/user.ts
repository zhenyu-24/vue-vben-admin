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
