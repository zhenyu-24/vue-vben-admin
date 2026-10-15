import type { RouteRecordStringComponent } from '@vben/types';

import type { SysId } from '#/types/api';

import { requestClient } from '#/api/request';

export interface SysMenuTreeResult {
  id: SysId;
  parent_id: null | SysId;
  title: string;
  name: string;
  type: number;
  status: number;
  perms?: null | string;
  remark?: null | string;
  children?: null | SysMenuTreeResult[];
}

export function getSysMenuTreeApi() {
  return requestClient.get<SysMenuTreeResult[]>('/v1/sys/menus');
}

/**
 * 获取用户侧边栏菜单（fba 后端路径为 /sys/menus/sidebar）
 */
export async function getAllMenusApi() {
  return requestClient.get<RouteRecordStringComponent[]>(
    '/v1/sys/menus/sidebar',
  );
}
