import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'Online',
    path: '/online',
    redirect: '/online/terminal',
    meta: {
      icon: 'lucide:boxes',
      order: 30,
      title: $t('page.online.title'),
    },
    children: [
      {
        name: 'OnlineTerminal',
        path: '/online/terminal',
        component: () => import('#/views/online/terminal/index.vue'),
        meta: {
          icon: 'lucide:terminal',
          title: $t('page.online.terminal'),
        },
      },
      {
        name: 'OnlineSftp',
        path: '/online/sftp',
        component: () => import('#/views/online/sftp/index.vue'),
        meta: {
          icon: 'lucide:folder-sync',
          title: $t('page.online.sftp'),
        },
      },
      {
        name: 'OnlineCode',
        path: '/online/code',
        component: () => import('#/views/online/code/index.vue'),
        meta: {
          icon: 'lucide:code-2',
          title: $t('page.online.code'),
        },
      },
      {
        name: 'OnlineMySandbox',
        path: '/online/my-sandbox',
        component: () => import('#/views/online/my-sandbox/index.vue'),
        meta: {
          icon: 'lucide:box',
          title: $t('page.online.mySandbox'),
        },
      },
    ],
  },
];

export default routes;
