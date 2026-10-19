import type { Recordable } from '@vben/types';

import type { SysId } from '#/types/api';

import { requestClient } from '#/api/request';

export interface ConfigResult {
  id: SysId;
  name: string;
  type?: string;
  key: string;
  value: string;
  is_frontend: boolean;
  remark?: string;
  created_time: string;
  updated_time?: string;
}

export interface UpdateConfigParam {
  id: SysId;
  name: string;
  type?: string;
  key: string;
  value: string;
  is_frontend: boolean;
  remark?: string;
}

export async function getAllConfigApi(params: Recordable<any>) {
  return requestClient.get<ConfigResult[]>('/v1/sys/configs/all', {
    params,
  });
}

export async function updateConfigApi(data: UpdateConfigParam[]) {
  return requestClient.put('/v1/sys/configs', data);
}
