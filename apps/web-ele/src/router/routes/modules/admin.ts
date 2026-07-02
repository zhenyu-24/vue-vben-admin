import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ic:baseline-admin-panel-settings',
      order: 900,
      title: $t('page.admin.title'),
    },
    name: 'Admin',
    path: '/admin',
    redirect: '/admin/user',
    children: [
      {
        name: 'AdminUser',
        path: '/admin/user',
        component: () => import('#/views/admin/user/index.vue'),
        meta: {
          icon: 'ic:baseline-people',
          title: $t('page.admin.user'),
        },
      },
    ],
  },
];

export default routes;
