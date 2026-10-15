import { describe, expect, it } from 'vitest';

import { toUserPayload } from './helpers';

describe('user payload', () => {
  it('trims text and normalizes cleared optional fields', () => {
    expect(
      toUserPayload({
        username: ' test ',
        nickname: ' Test ',
        phone: ' ',
        email: '',
        dept_id: '',
        roles: [],
      }),
    ).toEqual({
      username: 'test',
      nickname: 'Test',
      avatar: null,
      phone: null,
      email: null,
      dept_id: null,
      roles: [],
    });
  });

  it('preserves string IDs, the avatar and role selections without sending read-only fields', () => {
    const values = {
      id: 1,
      username: 'test',
      nickname: 'Test',
      avatar: '/avatar.png',
      email: 'test@example.com',
      phone: '13800138000',
      dept_id: '2069061886627938311',
      roles: ['2069061886627938312'],
      is_superuser: true,
      password: 'not-an-update-field',
    };
    const payload = toUserPayload(values);
    expect(payload).toMatchObject({
      avatar: values.avatar,
      dept_id: values.dept_id,
      roles: values.roles,
    });
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('is_superuser');
    expect(payload).not.toHaveProperty('password');
    expect(values.password).toBe('not-an-update-field');
  });
});
