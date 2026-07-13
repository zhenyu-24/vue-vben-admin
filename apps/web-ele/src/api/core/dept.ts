import { requestClient } from '#/api/request';

export interface SysDeptResult {
  id: number;
  name: string;
  status: number;
  remark?: string;
}

/** 获取所有部门（用于下拉选择） */
export async function getAllSysDeptApi() {
  return requestClient.get<SysDeptResult[]>('/v1/sys/depts');
}
