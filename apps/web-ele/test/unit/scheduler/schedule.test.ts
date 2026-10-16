import { describe, expect, it } from 'vitest';

import {
  jsonParam,
  nextRuns,
  schedulerPayload,
  schedulerValues,
  validCron,
} from '../../../src/views/admin/scheduler/manage/schedule';

describe('scheduler contracts', () => {
  it('validates JSON shapes and sends canonical JSON strings required by Celery', () => {
    expect(jsonParam('[1, "hello"]', true)).toBe('[1,"hello"]');
    expect(jsonParam('{"count": 0}', false)).toBe('{"count":0}');
    expect(jsonParam('', false)).toBeNull();
    expect(() => jsonParam('{}', true)).toThrow('位置参数必须是 JSON 数组');
    expect(() => jsonParam('null', false)).toThrow(
      '关键字参数必须是 JSON 对象',
    );
    expect(() => jsonParam('[]', false)).toThrow('关键字参数必须是 JSON 对象');
    expect(() => jsonParam('invalid', true)).toThrow(SyntaxError);
  });

  it('resets create defaults and clears inactive strategy and expiration fields', () => {
    const values = schedulerValues();
    expect(values.type).toBe(1);
    expect(values.one_off).toBe(false);
    const payload = schedulerPayload({
      ...values,
      type: 0,
      expire_time: '2026-11-01 10:00:00',
      expire_seconds: 60,
    });
    expect(payload.interval_every).toBe(1);
    expect(payload.crontab).toBe('* * * * *');
    expect(payload.expire_seconds).toBeNull();
    const cronPayload = schedulerPayload({
      ...values,
      crontab: ' 0   9 * * 1-5 ',
    });
    expect(cronPayload.crontab).toBe('0 9 * * 1-5');
    expect(cronPayload.interval_every).toBeNull();
    expect(cronPayload.interval_period).toBeNull();
  });

  it('validates five-field Celery cron expressions', () => {
    expect(validCron('*/15 * * * *')).toBe(true);
    expect(validCron('0 9 * * 1-5')).toBe(true);
    expect(validCron('61 * * * *')).toBe(false);
    expect(validCron('* * * * * *')).toBe(false);
    expect(validCron('0 9 * * 7')).toBe(false);
  });

  it('previews only future interval runs and respects stopped and one-off tasks', () => {
    const now = new Date('2026-10-16T12:00:00');
    const row = {
      ...schedulerPayload(schedulerValues()),
      id: '9007199254740993',
      type: 0 as const,
      status: 1,
      total_run_count: 0,
      last_run_time: '2026-10-16 11:59:55',
      created_time: '',
      interval_every: 10,
      interval_period: 'seconds' as const,
    };
    expect(nextRuns(row, now)[0]).toBe('2026-10-16 12:00:05');
    expect(nextRuns({ ...row, status: 0 }, now)).toEqual([]);
    expect(nextRuns({ ...row, one_off: true }, now)).toHaveLength(1);
    expect(
      nextRuns({ ...row, one_off: true, total_run_count: 1 }, now),
    ).toEqual([]);
    expect(
      nextRuns({ ...row, expire_time: '2026-10-16 11:00:00' }, now),
    ).toEqual([]);
  });
});
