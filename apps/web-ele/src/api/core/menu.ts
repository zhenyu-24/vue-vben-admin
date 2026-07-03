import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户侧边栏菜单（fba 后端路径为 /sys/menus/sidebar）
 */
export async function getAllMenusApi() {
  return requestClient.get<RouteRecordStringComponent[]>('/v1/sys/menus/sidebar');
}
