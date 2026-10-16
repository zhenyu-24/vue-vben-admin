import type { PaginationResult, SysId } from '#/types/api';

import { requestClient } from '#/api/request';

export type TaskPeriod =
  | 'days'
  | 'hours'
  | 'microseconds'
  | 'minutes'
  | 'seconds';

export interface TaskSchedulerParams {
  name?: string;
  type?: number;
  page?: number;
  size?: number;
}

export interface SaveTaskSchedulerParams {
  name: string;
  task: string;
  args: null | string;
  kwargs: null | string;
  queue: null | string;
  exchange: null | string;
  routing_key: null | string;
  start_time: null | string;
  expire_time: null | string;
  expire_seconds: null | number;
  type: 0 | 1;
  interval_every: null | number;
  interval_period: null | TaskPeriod;
  crontab: string;
  one_off: boolean;
  remark: null | string;
}

export interface TaskSchedulerResult extends SaveTaskSchedulerParams {
  id: SysId;
  status: number;
  total_run_count: number;
  last_run_time: null | string;
  created_time: string;
  updated_time?: null | string;
}

export interface TaskResultParams {
  name?: string;
  task_id?: string;
  page?: number;
  size?: number;
}

export interface TaskResult {
  id: SysId;
  task_id: string;
  name: null | string;
  status: string;
  result: unknown;
  args: unknown;
  kwargs: unknown;
  date_done: null | string;
  traceback: null | string;
  worker: null | string;
  retries: null | number;
  queue: null | string;
}

export function getTaskSchedulerListApi(params: TaskSchedulerParams) {
  return requestClient.get<PaginationResult<TaskSchedulerResult>>(
    '/v1/schedulers',
    { params },
  );
}

export function getTaskSchedulerApi(id: SysId) {
  return requestClient.get<TaskSchedulerResult>(`/v1/schedulers/${id}`);
}

export function createTaskSchedulerApi(data: SaveTaskSchedulerParams) {
  return requestClient.post('/v1/schedulers', data);
}

export function updateTaskSchedulerApi(
  id: SysId,
  data: SaveTaskSchedulerParams,
) {
  return requestClient.put(`/v1/schedulers/${id}`, data);
}

export function updateTaskSchedulerStatusApi(id: SysId) {
  return requestClient.put(`/v1/schedulers/${id}/status`);
}

export function deleteTaskSchedulerApi(id: SysId) {
  return requestClient.delete(`/v1/schedulers/${id}`);
}

export function executeTaskSchedulerApi(id: SysId) {
  return requestClient.post(`/v1/schedulers/${id}/execute`);
}

export function getTaskRegisteredApi() {
  return requestClient.get<{ name: string; task: string }[]>(
    '/v1/tasks/registered',
  );
}

export function getTaskResultListApi(params: TaskResultParams) {
  return requestClient.get<PaginationResult<TaskResult>>('/v1/task-results', {
    params,
  });
}

export function getTaskResultApi(id: SysId) {
  return requestClient.get<TaskResult>(`/v1/task-results/${id}`);
}

export function deleteTaskResultApi(pks: SysId[]) {
  return requestClient.delete('/v1/task-results', { data: { pks } });
}
