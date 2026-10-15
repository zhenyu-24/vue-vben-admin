import type { SysMenuTreeResult } from './menu';

import type { PaginationResult, SysId } from '#/types/api';

import { requestClient } from '#/api/request';

export interface SysRoleForm {
  name: string;
  status: number;
  is_filter_scopes: boolean;
  remark?: null | string;
}

export interface SysRoleResult extends SysRoleForm {
  id: SysId;
  created_time: string;
  updated_time: null | string;
}

export interface SysRoleListParams {
  name?: string;
  status?: number;
  page?: number;
  size?: number;
}

export function getSysRoleListApi(params: SysRoleListParams) {
  return requestClient.get<PaginationResult<SysRoleResult>>('/v1/sys/roles', {
    params,
  });
}

/** 获取所有角色（用于下拉选择） */
export async function getAllSysRoleApi() {
  return requestClient.get<SysRoleResult[]>('/v1/sys/roles/all');
}

export function createSysRoleApi(data: SysRoleForm) {
  return requestClient.post('/v1/sys/roles', data);
}

export function updateSysRoleApi(id: SysId, data: SysRoleForm) {
  return requestClient.put(`/v1/sys/roles/${id}`, data);
}

export function deleteSysRoleApi(pks: SysId[]) {
  return requestClient.delete('/v1/sys/roles', { data: { pks } });
}

export function getSysRoleMenuApi(id: SysId) {
  return requestClient.get<null | SysMenuTreeResult[]>(
    `/v1/sys/roles/${id}/menus`,
  );
}

export function updateSysRoleMenuApi(id: SysId, menus: SysId[]) {
  return requestClient.put(`/v1/sys/roles/${id}/menus`, { menus });
}

export function getSysRoleDataScopesApi(id: SysId) {
  return requestClient.get<SysId[]>(`/v1/sys/roles/${id}/scopes`);
}

export function updateSysRoleDataScopesApi(id: SysId, scopes: SysId[]) {
  return requestClient.put(`/v1/sys/roles/${id}/scopes`, { scopes });
}
