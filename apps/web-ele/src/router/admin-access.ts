import type { RouteRecordRaw } from 'vue-router';

export function isSuperuser(user: unknown) {
  return (
    typeof user === 'object' &&
    user !== null &&
    'is_superuser' in user &&
    user.is_superuser === true
  );
}

export function isAdminPath(path: string) {
  return /^\/admin(?:\/|$)/i.test(path);
}

export function isAdminRoute(route: Pick<RouteRecordRaw, 'meta' | 'path'>) {
  return route.meta?.superuserOnly === true || isAdminPath(route.path);
}
