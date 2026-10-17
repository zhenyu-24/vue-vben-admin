import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
  RouteRecordStringComponent,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';
import { cloneDeep, filterTree } from '@vben/utils';

import { ElMessage } from 'element-plus';

import { getAllMenusApi } from '#/api';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';
import { useExternalLinksStore } from '#/store/external-links';

import { isAdminRoute, isSuperuser } from './admin-access';
import {
  createExternalPageRoutes,
  externalLinksAdminRoute,
} from './external-links';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  await useExternalLinksStore().load();
  const superuser = isSuperuser(useUserStore().userInfo);
  function withManager(
    routes: RouteRecordStringComponent[],
  ): RouteRecordStringComponent[] {
    if (!superuser) return routes;
    const manager: RouteRecordStringComponent = {
      ...externalLinksAdminRoute,
      component: '/admin/external-links/index',
    } as RouteRecordStringComponent;
    const admin = routes.find((route) => route.path === '/admin');
    if (admin) {
      const children = (admin.children || [])
        .filter(
          (route) => route.path !== manager.path && route.name !== manager.name,
        )
        .sort((a, b) => (a.meta?.order ?? 999) - (b.meta?.order ?? 999));
      const pluginIndex = children.findIndex(
        (route) =>
          route.path === '/admin/plugin' || route.name === 'AdminPlugin',
      );
      children.splice(
        pluginIndex < 0 ? children.length : pluginIndex,
        0,
        manager,
      );
      admin.children = children.map((route, order) => ({
        ...route,
        meta: {
          ...route.meta,
          title: route.meta?.title || String(route.name || ''),
          order,
        },
      }));
    } else {
      routes.push({
        name: 'Admin',
        path: '/admin',
        component: 'BasicLayout',
        redirect: externalLinksAdminRoute.path,
        meta: {
          title: $t('page.admin.title'),
          icon: 'ic:baseline-admin-panel-settings',
          order: 900,
          superuserOnly: true,
        },
        children: [manager],
      });
    }
    return routes;
  }
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  const result = await generateAccessible(preferences.app.accessMode, {
    ...options,
    routes: filterTree(
      cloneDeep(options.routes),
      (route) => superuser || !isAdminRoute(route),
    ),
    fetchMenuListAsync: async () => {
      ElMessage({
        duration: 1500,
        message: `${$t('common.loadingMenu')}...`,
      });
      return withManager(
        filterTree(
          await getAllMenusApi(),
          (route) => superuser || !isAdminRoute(route),
        ),
      );
    },
    // 可以指定没有权限跳转403页面
    forbiddenComponent,
    // 如果 route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap,
  });
  const supplemental = await generateAccessible('frontend', {
    ...options,
    routes: createExternalPageRoutes(),
  });
  return {
    accessibleMenus: [
      ...result.accessibleMenus,
      ...supplemental.accessibleMenus,
    ].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    accessibleRoutes: [
      ...result.accessibleRoutes,
      ...supplemental.accessibleRoutes,
    ],
  };
}

export { generateAccess };
