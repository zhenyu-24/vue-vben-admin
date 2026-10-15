import type { SysUpdateUserParams } from '#/api';

export function toUserPayload(
  values: SysUpdateUserParams,
): SysUpdateUserParams {
  return {
    username: values.username.trim(),
    nickname: values.nickname?.trim() ?? '',
    avatar: values.avatar ?? null,
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    roles: values.roles ?? [],
    dept_id: values.dept_id === '' ? null : (values.dept_id ?? null),
  };
}
