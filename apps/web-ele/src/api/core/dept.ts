import type { SysId } from '#/types/api';

import { requestClient } from '#/api/request';

export interface SysDeptParams {
  name: string;
  parent_id: null | SysId;
  sort: number;
  leader?: null | string;
  phone?: null | string;
  email?: null | string;
  status: number;
}

export interface SysDeptResult extends SysDeptParams {
  id: SysId;
  created_time: string;
  updated_time?: null | string;
  children?: null | SysDeptResult[];
}

export interface SysDeptTreeParams {
  name?: string;
  leader?: string;
  phone?: string;
  status?: number;
}

export function getSysDeptTreeApi(params?: SysDeptTreeParams) {
  return requestClient.get<SysDeptResult[]>('/v1/sys/depts', { params });
}

/** 保留用户管理使用的接口。 */
export async function getAllSysDeptApi() {
  return getSysDeptTreeApi();
}

export function getSysDeptDetailApi(id: SysId) {
  return requestClient.get<SysDeptResult>(`/v1/sys/depts/${id}`);
}

export function createSysDeptApi(data: SysDeptParams) {
  return requestClient.post('/v1/sys/depts', data);
}

export function updateSysDeptApi(id: SysId, data: SysDeptParams) {
  return requestClient.put(`/v1/sys/depts/${id}`, data);
}

export function deleteSysDeptApi(id: SysId) {
  return requestClient.delete(`/v1/sys/depts/${id}`);
}
