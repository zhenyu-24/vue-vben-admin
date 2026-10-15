import type { SysId } from '#/types/api';

import { requestClient } from '#/api/request';

export interface SysDataScopeResult {
  id: SysId;
  name: string;
  status: number;
}

export interface SysDataRuleResult {
  id: SysId;
  name: string;
  model: string;
  column: string;
  operator: string;
  expression: string;
  value: string;
}

export interface SysDataScopeRulesResult extends SysDataScopeResult {
  rules: (null | SysDataRuleResult)[];
}

export function getSysDataScopesApi() {
  return requestClient.get<SysDataScopeResult[]>('/v1/sys/data-scopes/all');
}

export function getSysDataScopeRulesApi(id: SysId) {
  return requestClient.get<SysDataScopeRulesResult>(
    `/v1/sys/data-scopes/${id}/rules`,
  );
}
