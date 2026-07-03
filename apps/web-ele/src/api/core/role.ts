import { requestClient } from '#/api/request';

export interface SysRoleResult {
  id: number;
  name: string;
  status: number;
  remark?: string;
}

/** 获取所有角色（用于下拉选择） */
export async function getAllSysRoleApi() {
  return requestClient.get<SysRoleResult[]>('/v1/sys/roles/all');
}
