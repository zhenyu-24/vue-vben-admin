import type { PaginationResult, SysId } from '#/types/api';

import { requestClient } from '#/api/request';

export interface LoginLogParams {
  username?: string;
  status?: number;
  ip?: string;
  page?: number;
  size?: number;
}

export interface LoginLogResult {
  id: SysId;
  username: string;
  status: number;
  ip: string;
  country?: string;
  region?: string;
  os?: string;
  browser?: string;
  device?: string;
  msg: string;
  login_time: string;
}

export type OperaLogParams = LoginLogParams;

export interface OperaLogResult {
  id: SysId;
  trace_id: string;
  username?: string;
  method: string;
  title: string;
  path: string;
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  user_agent: string;
  os?: string;
  browser?: string;
  device?: string;
  args?: JSON;
  status: number;
  code: string;
  msg: string;
  cost_time: number;
  opera_time: string;
}

export async function getLoginLogListApi(params: LoginLogParams) {
  return requestClient.get<PaginationResult<LoginLogResult>>('/v1/logs/login', {
    params,
  });
}

export async function deleteLoginLogApi(pks: SysId[]) {
  return requestClient.delete('/v1/logs/login', { data: { pks } });
}

export async function getOperaLogListApi(params: OperaLogParams) {
  return requestClient.get<PaginationResult<OperaLogResult>>('/v1/logs/opera', {
    params,
  });
}

export async function deleteOperaLogApi(pks: SysId[]) {
  return requestClient.delete('/v1/logs/opera', { data: { pks } });
}
