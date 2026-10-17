import type { SysId } from '#/types/api';

import { requestClient } from '#/api/request';

import { uploadFileApi } from './files';

export interface ExternalLinkInput {
  title: string;
  kind: 'group' | 'link';
  parent_id: null | SysId;
  url: string;
  open_mode: 'external' | 'iframe';
  display_mode: 'buttons' | 'menu';
  icon: string;
  description: string;
  sort: number;
  enabled: boolean;
}

export interface ExternalLinkRecord extends ExternalLinkInput {
  id: SysId;
}

export interface ExternalLinkNode extends ExternalLinkRecord {
  children: ExternalLinkNode[];
}

const endpoint = '/v1/sys/external-links';

export function getExternalLinksApi(manage = false) {
  return requestClient.get<ExternalLinkRecord[]>(
    manage ? `${endpoint}/manage` : endpoint,
  );
}

export function createExternalLinkApi(data: ExternalLinkInput) {
  return requestClient.post<ExternalLinkRecord>(endpoint, data);
}

export function updateExternalLinkApi(id: SysId, data: ExternalLinkInput) {
  return requestClient.put<ExternalLinkRecord>(`${endpoint}/${id}`, data);
}

export function deleteExternalLinkApi(id: SysId) {
  return requestClient.delete(`${endpoint}/${id}`);
}

export async function uploadExternalLinkIconApi(file: File) {
  const extension = file.name.split('.').at(-1)?.toLowerCase();
  // Keep the stored local image path within the existing icon column limit.
  const result = await uploadFileApi(
    new File([file], `icon.${extension}`, { type: file.type }),
    { upload_type: 'image', is_public: true },
  );
  const path = new URL(result.url, window.location.origin).pathname;
  if (
    !/^\/static\/upload\/(?:public\/)?image\//.test(path) ||
    path.length > 100
  ) {
    throw new Error('上传返回的图片地址无效');
  }
  return path;
}
