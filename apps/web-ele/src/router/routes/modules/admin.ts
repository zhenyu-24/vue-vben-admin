import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ic:baseline-admin-panel-settings',
      order: 900,
      superuserOnly: true,
      title: $t('page.admin.title'),
    },
    name: 'Admin',
    path: '/admin',
    redirect: '/admin/user',
    children: [
      {
        meta: {
          icon: 'ic:baseline-people',
          title: $t('page.admin.org'),
        },
        name: 'AdminOrg',
        path: '/admin/org',
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
          {
            name: 'AdminDept',
            path: '/admin/dept',
            component: () => import('#/views/admin/dept/index.vue'),
            meta: {
              icon: 'lucide:network',
              title: $t('page.admin.dept'),
            },
          },
          {
            name: 'AdminRole',
            path: '/admin/role',
            component: () => import('#/views/admin/role/index.vue'),
            meta: {
              icon: 'lucide:shield-check',
              title: $t('page.admin.role'),
            },
          },
        ],
      },
      {
        meta: {
          icon: 'carbon:document',
          title: $t('page.admin.log'),
        },
        name: 'AdminLog',
        path: '/admin/log',
        redirect: '/admin/log/login',
        children: [
          {
            name: 'LoginLog',
            path: '/admin/log/login',
            component: () => import('#/views/admin/log/login/index.vue'),
            meta: {
              icon: 'mdi:login',
              title: $t('page.admin.loginLog'),
            },
          },
          {
            name: 'OperaLog',
            path: '/admin/log/opera',
            component: () => import('#/views/admin/log/opera/index.vue'),
            meta: {
              icon: 'carbon:operations-record',
              title: $t('page.admin.operaLog'),
            },
          },
        ],
      },
      {
        meta: {
          icon: 'mdi:monitor-dashboard',
          title: $t('page.admin.monitor'),
        },
        name: 'AdminMonitor',
        path: '/admin/monitor',
        redirect: '/admin/monitor/online',
        children: [
          {
            name: 'Online',
            path: '/admin/monitor/online',
            component: () => import('#/views/admin/monitor/online/index.vue'),
            meta: {
              icon: 'wpf:online',
              title: $t('page.admin.online'),
            },
          },
          {
            name: 'Redis',
            path: '/admin/monitor/redis',
            component: () => import('#/views/admin/monitor/redis/index.vue'),
            meta: {
              icon: 'devicon:redis',
              title: $t('page.admin.redis'),
            },
          },
          {
            name: 'Server',
            path: '/admin/monitor/server',
            component: () => import('#/views/admin/monitor/server/index.vue'),
            meta: {
              icon: 'mdi:server-outline',
              title: $t('page.admin.server'),
            },
          },
        ],
      },
      {
        name: 'AdminScheduler',
        path: '/admin/scheduler',
        redirect: '/admin/scheduler/manage',
        meta: {
          icon: 'lucide:calendar-clock',
          title: $t('page.admin.scheduler'),
        },
        children: [
          {
            name: 'TaskSchedulerManage',
            path: '/admin/scheduler/manage',
            component: () => import('#/views/admin/scheduler/manage/index.vue'),
            meta: {
              icon: 'lucide:list-todo',
              title: $t('page.admin.taskManage'),
            },
          },
          {
            name: 'TaskSchedulerRecord',
            path: '/admin/scheduler/record',
            component: () => import('#/views/admin/scheduler/record/index.vue'),
            meta: {
              icon: 'lucide:history',
              title: $t('page.admin.taskRecord'),
            },
          },
        ],
      },
      {
        meta: {
          icon: 'lucide:puzzle',
          title: $t('page.admin.plugin'),
        },
        name: 'AdminPlugin',
        path: '/admin/plugin',
        component: () => import('#/views/admin/plugin/index.vue'),
      },
      {
        meta: {
          icon: 'fe:notice-push',
          title: $t('page.admin.notice'),
        },
        name: 'AdminNotice',
        path: '/admin/notice',
        component: () => import('#/views/admin/notice/index.vue'),
      },
      {
        meta: {
          icon: 'codicon:symbol-parameter',
          title: $t('page.admin.config'),
        },
        name: 'AdminConfig',
        path: '/admin/config',
        component: () => import('#/views/admin/config/index.vue'),
      },
    ],
  },
];

export default routes;
