import type { PaginationResult, SysId } from '#/types/api';

import { requestClient } from '#/api/request';

export interface NoticeParams {
  title?: string;
  type?: number;
  status?: number;
  page?: number;
  size?: number;
}

export interface NoticeResult {
  id: SysId;
  title: string;
  type: number;
  status: number;
  content: string;
  created_time: string;
  updated_time?: string;
}

export interface CreateNoticeParams {
  title: string;
  type: number;
  status: number;
  content: string;
}

export type UpdateNoticeParams = CreateNoticeParams;

export async function getNoticeListApi(params: NoticeParams) {
  return requestClient.get<PaginationResult<NoticeResult>>('/v1/sys/notices', {
    params,
  });
}

export async function getNoticeApi(pk: SysId) {
  return requestClient.get<NoticeResult>(`/v1/sys/notices/${pk}`);
}

export async function createNoticeApi(data: CreateNoticeParams) {
  return requestClient.post('/v1/sys/notices', data);
}

export async function updateNoticeApi(pk: SysId, data: UpdateNoticeParams) {
  return requestClient.put(`/v1/sys/notices/${pk}`, data);
}

export async function deleteNoticeApi(pks: SysId[]) {
  return requestClient.delete('/v1/sys/notices', { data: { pks } });
}

// --- 用户通知公告关系 ---

export interface UserNoticeResult {
  notice_id: SysId;
  is_read: boolean;
  deleted: number;
}

/** 获取当前用户的公告已读/删除状态 */
export async function getUserNoticeStatusApi() {
  return requestClient.get<UserNoticeResult[]>('/v1/sys/notices/user/status');
}

/** 标记单条公告为已读 */
export async function markNoticeReadApi(pk: SysId) {
  return requestClient.post(`/v1/sys/notices/user/read/${pk}`);
}

/** 全部标记为已读 */
export async function markAllNoticesReadApi(noticeIds: SysId[]) {
  return requestClient.post('/v1/sys/notices/user/read-all', null, {
    params: { notice_ids: noticeIds.join(',') },
  });
}

/** 用户删除单条公告 */
export async function deleteUserNoticeApi(pk: SysId) {
  return requestClient.delete(`/v1/sys/notices/user/${pk}`);
}

/** 清空用户公告 */
export async function clearUserNoticesApi(noticeIds: SysId[]) {
  return requestClient.delete('/v1/sys/notices/user', {
    params: { notice_ids: noticeIds.join(',') },
  });
}
