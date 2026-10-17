import type { Router, RouteRecordRaw } from 'vue-router';

import type { ExternalLinkNode } from '#/api/core/external-links';

import { useAccessStore } from '@vben/stores';
import { generateMenus } from '@vben/utils';

import { useExternalLinksStore } from '#/store/external-links';
import {
  externalGroupPath,
  externalLinkIcon,
  externalLinkPath,
  isSafeExternalUrl,
} from '#/utils/external-links';

const directory = () => import('#/views/external-pages/index.vue');
const page = () => import('#/views/external-pages/page.vue');

export const externalLinksAdminRoute: RouteRecordRaw = {
  name: 'AdminExternalLinks',
  path: '/admin/external-links',
  component: () => import('#/views/admin/external-links/index.vue'),
  meta: {
    icon: 'lucide:panels-top-left',
    superuserOnly: true,
    title: '外部链接',
  },
};

function nodeRoutes(
  node: ExternalLinkNode,
  extra: RouteRecordRaw[],
): RouteRecordRaw {
  const isGroup = node.kind === 'group';
  const buttons = isGroup && node.display_mode === 'buttons';
  const common = {
    name: `ExternalPage${node.id}`,
    path: isGroup ? externalGroupPath(node.id) : externalLinkPath(node.id),
    meta: {
      title: node.title,
      icon: externalLinkIcon(node.icon),
      order: node.sort,
      externalLinkId: String(node.id),
      ...(node.kind === 'link' &&
      node.open_mode === 'external' &&
      isSafeExternalUrl(node.url)
        ? { link: node.url }
        : {}),
    },
  };
  if (isGroup && !buttons && node.children.length) {
    const children = node.children.map((item) => nodeRoutes(item, extra));
    return { ...common, children, redirect: children[0]!.path };
  }
  if (buttons) {
    function hiddenPages(items: ExternalLinkNode[]) {
      for (const item of items) {
        const hidden = nodeRoutes({ ...item, children: [] }, extra);
        hidden.meta = { ...hidden.meta, title: item.title, hideInMenu: true };
        extra.push(hidden);
        hiddenPages(item.children);
      }
    }
    hiddenPages(node.children);
  }
  return { ...common, component: isGroup ? directory : page };
}

export function createExternalPageRoutes(): RouteRecordRaw[] {
  const store = useExternalLinksStore();
  const extra: RouteRecordRaw[] = [];
  const children = store.tree.map((node) => nodeRoutes(node, extra));
  return [
    {
      name: 'ExternalPages',
      path: '/external-pages',
      redirect: '/external-pages/overview',
      meta: { title: '外部页面', icon: 'lucide:panels-top-left', order: 500 },
      children: [
        {
          name: 'ExternalPagesOverview',
          path: '/external-pages/overview',
          component: directory,
          meta: { title: '全部外部页面', hideInMenu: true },
        },
        ...children,
        ...extra,
      ],
    },
  ];
}

export async function refreshExternalPageRoutes(router: Router) {
  const store = useExternalLinksStore();
  await store.load();
  if (router.hasRoute('ExternalPages')) router.removeRoute('ExternalPages');
  const routes = createExternalPageRoutes();
  const root = router.getRoutes().find((route) => route.name === 'Root');
  if (root) {
    root.children = [
      ...root.children.filter((route) => route.name !== 'ExternalPages'),
      ...routes,
    ];
  }
  for (const route of routes) router.addRoute('Root', route);
  const accessStore = useAccessStore();
  accessStore.setAccessMenus(
    [
      ...accessStore.accessMenus.filter(
        (item) => item.path !== '/external-pages',
      ),
      ...generateMenus(routes, router),
    ].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
  );
  accessStore.setAccessRoutes([
    ...accessStore.accessRoutes.filter(
      (route) => route.name !== 'ExternalPages',
    ),
    ...routes,
  ]);
}
