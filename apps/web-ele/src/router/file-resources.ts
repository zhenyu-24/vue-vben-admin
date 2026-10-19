import type { RouteRecordRaw } from 'vue-router';

export const fileResourcesRoute: RouteRecordRaw = {
  name: 'AdminFiles',
  path: '/admin/files',
  component: () => import('#/views/admin/files/index.vue'),
  meta: {
    icon: 'lucide:folder-open',
    superuserOnly: true,
    title: '文件资源中心',
  },
};
