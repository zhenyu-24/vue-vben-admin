import type { ConfigResult } from '#/api';

import { describe, expect, it } from 'vitest';

import {
  buildConfigUpdates,
  createConfigValues,
  hasConfigChanges,
  validateConfigField,
} from './data';

function config(key: string, value: string): ConfigResult {
  return {
    id: 1,
    name: key,
    type: 'USER_SECURITY',
    key,
    value,
    is_frontend: false,
    created_time: '2026-10-15 12:00:00',
  };
}

describe('parameter configuration', () => {
  it('parses numeric fields without changing status and boolean strings', () => {
    const configs = [
      config('USER_SECURITY_CONFIG_STATUS', '1'),
      config('USER_LOCK_THRESHOLD', '5'),
      config('USER_PASSWORD_REQUIRE_SPECIAL_CHAR', 'false'),
    ];
    expect(createConfigValues('USER_SECURITY', configs)).toEqual({
      USER_SECURITY_CONFIG_STATUS: '1',
      USER_LOCK_THRESHOLD: 5,
      USER_PASSWORD_REQUIRE_SPECIAL_CHAR: 'false',
    });
    expect(
      buildConfigUpdates(
        'USER_SECURITY',
        configs,
        createConfigValues('USER_SECURITY', configs),
      ),
    ).toEqual([]);
  });

  it('only sends changed known fields as strings and preserves identifiers', () => {
    const configs = [
      { ...config('USER_LOCK_THRESHOLD', '5'), id: '2069061886627938311' },
      config('USER_LOCK_SECONDS', '300'),
      config('FUTURE_CONFIG', 'keep'),
    ] as ConfigResult[];
    const values = createConfigValues('USER_SECURITY', configs);
    values.USER_LOCK_THRESHOLD = 8;
    values.FUTURE_CONFIG = 'ignore';
    expect(buildConfigUpdates('USER_SECURITY', configs, values)).toEqual([
      expect.objectContaining({
        id: '2069061886627938311',
        key: 'USER_LOCK_THRESHOLD',
        value: '8',
        is_frontend: false,
      }),
    ]);
  });

  it('rejects unsafe, fractional and negative numbers', () => {
    for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        validateConfigField('USER_SECURITY', 'USER_LOCK_THRESHOLD', {
          USER_SECURITY_CONFIG_STATUS: '1',
          USER_LOCK_THRESHOLD: value,
        }),
      ).toBeTruthy();
    }
    expect(
      validateConfigField('USER_SECURITY', 'USER_LOCK_THRESHOLD', {
        USER_SECURITY_CONFIG_STATUS: '1',
        USER_LOCK_THRESHOLD: 0,
      }),
    ).toBeUndefined();
  });

  it('tracks cleared numeric fields without serializing undefined', () => {
    const configs = [config('USER_LOCK_THRESHOLD', '5')];
    const values = createConfigValues('USER_SECURITY', configs);
    expect(hasConfigChanges('USER_SECURITY', configs, values)).toBe(false);
    values.USER_LOCK_THRESHOLD = undefined;
    expect(hasConfigChanges('USER_SECURITY', configs, values)).toBe(true);
    expect(buildConfigUpdates('USER_SECURITY', configs, values)).toEqual([]);
    expect(
      validateConfigField('USER_SECURITY', 'USER_LOCK_THRESHOLD', {
        ...values,
        USER_SECURITY_CONFIG_STATUS: '1',
      }),
    ).toBe('请填写密码错误锁定阈值');
  });

  it('checks related password settings and permits non-expiring passwords', () => {
    expect(
      validateConfigField('USER_SECURITY', 'USER_PASSWORD_MAX_LENGTH', {
        USER_SECURITY_CONFIG_STATUS: '1',
        USER_PASSWORD_MIN_LENGTH: 12,
        USER_PASSWORD_MAX_LENGTH: 6,
      }),
    ).toBe('最大长度不能小于最小长度');
    expect(
      validateConfigField('USER_SECURITY', 'USER_PASSWORD_REMINDER_DAYS', {
        USER_SECURITY_CONFIG_STATUS: '1',
        USER_PASSWORD_EXPIRY_DAYS: 5,
        USER_PASSWORD_REMINDER_DAYS: 7,
      }),
    ).toBe('提醒天数不能超过密码有效期');
    expect(
      validateConfigField('USER_SECURITY', 'USER_PASSWORD_REMINDER_DAYS', {
        USER_SECURITY_CONFIG_STATUS: '1',
        USER_PASSWORD_EXPIRY_DAYS: 0,
        USER_PASSWORD_REMINDER_DAYS: 7,
      }),
    ).toBeUndefined();
  });

  it('uses the real email status key and validates SMTP port bounds', () => {
    expect(
      buildConfigUpdates('EMAIL', [config('EMAIL_CONFIG_STATUS', '0')], {
        EMAIL_CONFIG_STATUS: '1',
      }),
    ).toEqual([
      expect.objectContaining({ key: 'EMAIL_CONFIG_STATUS', value: '1' }),
    ]);
    expect(
      validateConfigField('EMAIL', 'EMAIL_PORT', {
        EMAIL_CONFIG_STATUS: '1',
        EMAIL_PORT: 65_536,
      }),
    ).toBe('不能大于 65535');
    expect(
      validateConfigField('EMAIL', 'EMAIL_PASSWORD', {
        EMAIL_CONFIG_STATUS: '0',
        EMAIL_PASSWORD: '',
      }),
    ).toBeUndefined();
  });
});
