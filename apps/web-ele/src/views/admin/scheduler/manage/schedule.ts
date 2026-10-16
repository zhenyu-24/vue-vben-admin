import type { SaveTaskSchedulerParams, TaskSchedulerResult } from '#/api';

import { Cron } from 'croner';
import dayjs from 'dayjs';

export const strategyOptions = [
  { label: '间隔执行', value: 0, color: 'success' },
  { label: '定时执行', value: 1, color: 'primary' },
];

export const periodOptions = [
  { label: '秒', value: 'seconds' },
  { label: '分钟', value: 'minutes' },
  { label: '小时', value: 'hours' },
  { label: '天', value: 'days' },
  { label: '微秒', value: 'microseconds' },
];

export const cronPresets = [
  { label: '每分钟', value: '* * * * *' },
  { label: '每小时整点', value: '0 * * * *' },
  { label: '每天午夜', value: '0 0 * * *' },
  { label: '每天 9:00', value: '0 9 * * *' },
  { label: '工作日 9:00', value: '0 9 * * 1-5' },
  { label: '每 15 分钟', value: '*/15 * * * *' },
  { label: '每 3 小时', value: '0 */3 * * *' },
];

export function validCron(value: string) {
  if (!/^(?:[\d*/,-]+\s+){4}[\d*/,-]+$/.test(value.trim())) return false;
  // Celery uses 0-6 for weekdays and requires both day fields to match.
  const weekday = value.trim().split(/\s+/)[4] ?? '';
  if (weekday.match(/\d+/g)?.some((part) => Number(part) > 6)) return false;
  try {
    return new Cron(value.trim(), { legacyMode: false }).nextRun() !== null;
  } catch {
    return false;
  }
}

export function jsonParam(value: unknown, array: boolean): null | string {
  if (value === '' || value === undefined || value === null) return null;
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (
    array
      ? !Array.isArray(parsed)
      : !parsed || typeof parsed !== 'object' || Array.isArray(parsed)
  ) {
    throw new Error(
      array ? '位置参数必须是 JSON 数组' : '关键字参数必须是 JSON 对象',
    );
  }
  // The backend stores JSON strings and decodes them before sending to Celery.
  return JSON.stringify(parsed);
}

export function schedulerValues(data?: Partial<TaskSchedulerResult>) {
  return {
    name: data?.name ?? '',
    task: data?.task ?? '',
    type: data?.type ?? 1,
    args: data?.args ?? '',
    kwargs: data?.kwargs ?? '',
    queue: data?.queue ?? '',
    exchange: data?.exchange ?? '',
    routing_key: data?.routing_key ?? '',
    start_time: data?.start_time ?? null,
    expire_time: data?.expire_time ?? null,
    expire_seconds: data?.expire_seconds ?? null,
    interval_every: data?.interval_every ?? 1,
    interval_period: data?.interval_period ?? 'seconds',
    crontab: data?.crontab ?? '* * * * *',
    one_off: data?.one_off ?? false,
    remark: data?.remark ?? '',
  };
}

export function schedulerPayload(
  values: ReturnType<typeof schedulerValues>,
): SaveTaskSchedulerParams {
  return {
    ...values,
    name: values.name.trim(),
    task: values.task.trim(),
    args: jsonParam(values.args, true),
    kwargs: jsonParam(values.kwargs, false),
    queue: values.queue.trim() || null,
    exchange: values.exchange.trim() || null,
    routing_key: values.routing_key.trim() || null,
    remark: values.remark.trim() || null,
    start_time: values.start_time || null,
    expire_time: values.expire_time || null,
    expire_seconds: values.expire_time ? null : (values.expire_seconds ?? null),
    interval_every: values.type === 0 ? values.interval_every : null,
    interval_period: values.type === 0 ? values.interval_period : null,
    crontab:
      values.type === 1
        ? values.crontab.trim().replaceAll(/\s+/g, ' ')
        : '* * * * *',
  };
}

export function scheduleLabel(row: TaskSchedulerResult) {
  return row.type === 1
    ? row.crontab
    : `每 ${row.interval_every} ${periodOptions.find((option) => option.value === row.interval_period)?.label ?? row.interval_period}`;
}

export function nextRuns(row: TaskSchedulerResult, now = new Date()): string[] {
  if (row.status !== 1 || (row.one_off && row.total_run_count > 0)) return [];
  const start = row.start_time ? dayjs(row.start_time).toDate() : now;
  const after = new Date(Math.max(now.getTime(), start.getTime()));
  const limit = row.one_off ? 1 : 5;
  let runs: Date[];
  try {
    if (row.type === 1) {
      if (!validCron(row.crontab)) return [];
      runs = new Cron(row.crontab, { legacyMode: false }).nextRuns(
        limit,
        after,
      );
    } else {
      const milliseconds = {
        days: 86_400_000,
        hours: 3_600_000,
        minutes: 60_000,
        seconds: 1000,
        microseconds: 0.001,
      };
      const interval =
        (row.interval_every ?? 0) *
        milliseconds[row.interval_period ?? 'seconds'];
      if (interval <= 0) return [];
      const base = row.last_run_time
        ? dayjs(row.last_run_time).valueOf()
        : now.getTime();
      const first =
        base +
        Math.max(1, Math.ceil((after.getTime() - base) / interval)) * interval;
      runs = Array.from(
        { length: limit },
        (_, index) => new Date(first + index * interval),
      );
    }
    return runs
      .filter(
        (date) =>
          !row.expire_time ||
          date.getTime() <= dayjs(row.expire_time).valueOf(),
      )
      .map((date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'));
  } catch {
    return [];
  }
}
