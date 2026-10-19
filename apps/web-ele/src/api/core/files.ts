import type { RequestClientConfig } from '@vben/request';

import type { PaginationResult, SysId } from '#/types/api';

import { sha256 } from '@noble/hashes/sha2.js';

import { requestClient } from '#/api/request';

export type UploadType =
  | 'audio'
  | 'avatar'
  | 'document'
  | 'file'
  | 'image'
  | 'resource'
  | 'video';

export interface UploadFileOptions {
  upload_type?: UploadType;
  target_path?: string;
  /** Omit to use the server default: public avatars, private for other types. */
  is_public?: boolean;
  signal?: AbortSignal;
  onProgress?: (uploaded: number, total: number) => void;
}

export interface UploadFileResult {
  url: string;
  size: number;
  original_name: string;
  upload_type: UploadType;
  extension: string;
  file_id: SysId;
  download_url: string;
  is_public: boolean;
  created_time?: null | string;
}

export interface ManagedFile extends UploadFileResult {
  name: string;
  url_path: string;
  mime_type: null | string;
  user_id: null | string;
  username: null | string;
  exists: boolean;
  owner_uses_avatar: boolean;
  storage_path?: string;
}

export interface FileListParams {
  name?: string;
  upload_type?: UploadType;
  is_public?: boolean;
  user_id?: string;
  username?: string;
  page?: number;
  size?: number;
  recursive?: boolean;
  sort_by?: string;
  sort_order?: string;
}

export function getManagedFilesApi(params: FileListParams) {
  return requestClient.get<PaginationResult<ManagedFile>>('/v1/files/manage', {
    params,
  });
}

export function getResourceFoldersApi(isPublic: boolean) {
  return requestClient.get<string[]>('/v1/files/manage/resource-folders', {
    params: { is_public: isPublic },
  });
}

export interface FileFolder {
  name: string;
  path: string;
  count: number;
}

export function getFileBrowseApi(params: FileListParams & { path: string }) {
  return requestClient.get<{
    files: PaginationResult<ManagedFile>;
    folders: FileFolder[];
    path: string;
  }>('/v1/files/manage/browse', { params });
}

export function replaceManagedFileApi(id: SysId, sourceId: SysId) {
  return requestClient.put<ManagedFile>(
    `/v1/files/manage/${encodeURIComponent(id)}/content`,
    { source_file_id: sourceId },
  );
}

export function getManagedFileApi(id: SysId) {
  return requestClient.get<ManagedFile>(
    `/v1/files/manage/${encodeURIComponent(id)}`,
  );
}

export function deleteManagedFileApi(id: SysId) {
  return requestClient.delete(`/v1/files/manage/${encodeURIComponent(id)}`);
}

export function deleteManagedFilesApi(ids: SysId[]) {
  return requestClient.post<{
    deleted: string[];
    failed: { file_id: string; message: string }[];
  }>('/v1/files/manage/batch-delete', { ids });
}

export function updateFileVisibilityApi(id: SysId, isPublic: boolean) {
  return requestClient.patch<ManagedFile>(
    `/v1/files/manage/${encodeURIComponent(id)}/visibility`,
    { is_public: isPublic },
  );
}

export function downloadManagedFileApi(id: SysId) {
  return requestClient.download<Blob>(
    `/v1/files/manage/${encodeURIComponent(id)}/download`,
    { timeout: 0 },
  );
}

interface UploadPrecheckResult {
  upload_id: string;
  chunk_size: number;
  total_chunks: number;
  uploaded_chunks: number[];
  file: null | UploadFileResult;
}

interface DownloadResponse {
  data: Blob;
  headers: Record<string, string>;
  status: number;
}

const TRANSFER_SIZE = 4 * 1024 * 1024;

// Keep Axios errors intact so retries can distinguish HTTP failures from network failures.
function fileRequest<T>(
  url: string,
  config: Omit<RequestClientConfig, 'paramsSerializer'>,
) {
  return requestClient.instance.request<unknown, T>({ url, ...config });
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

async function hashFile(file: File, signal?: AbortSignal) {
  const hash = sha256.create();
  for (let offset = 0; offset < file.size; offset += TRANSFER_SIZE) {
    signal?.throwIfAborted();
    hash.update(
      new Uint8Array(
        await file.slice(offset, offset + TRANSFER_SIZE).arrayBuffer(),
      ),
    );
  }
  signal?.throwIfAborted();
  return hex(hash.digest());
}

async function retry<T>(operation: () => Promise<T>, signal?: AbortSignal) {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try {
      return await operation();
    } catch (error) {
      signal?.throwIfAborted();
      const status = (error as { response?: { status: number } }).response
        ?.status;
      if (
        attempt >= 2 ||
        (status && status < 500 && ![408, 409, 429].includes(status))
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}

export async function uploadFileApi(
  file: File,
  options: UploadFileOptions = {},
) {
  if (file.size === 0) throw new Error('不允许上传空文件');
  const { signal, onProgress, ...metadata } = options;
  const digest = await hashFile(file, signal);
  const precheck = await retry(
    () =>
      fileRequest<UploadPrecheckResult>('/v1/files/upload/precheck', {
        method: 'POST',
        data: {
          ...metadata,
          filename: file.name,
          size: file.size,
          sha256: digest,
          content_type: file.type || 'application/octet-stream',
        },
        signal,
      }),
    signal,
  );
  if (precheck.file) {
    onProgress?.(file.size, file.size);
    return precheck.file;
  }
  const uploaded = new Set(precheck.uploaded_chunks);
  let transferred = [...uploaded].reduce(
    (size, index) =>
      size +
      Math.min(precheck.chunk_size, file.size - index * precheck.chunk_size),
    0,
  );
  onProgress?.(transferred, file.size);
  for (let index = 0; index < precheck.total_chunks; index++) {
    if (uploaded.has(index)) continue;
    signal?.throwIfAborted();
    const chunk = file.slice(
      index * precheck.chunk_size,
      (index + 1) * precheck.chunk_size,
    );
    const checksum = hex(sha256(new Uint8Array(await chunk.arrayBuffer())));
    await retry(
      () =>
        fileRequest(`/v1/files/upload/${precheck.upload_id}/chunks/${index}`, {
          method: 'PUT',
          data: chunk,
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Chunk-SHA256': checksum,
          },
          timeout: 120_000,
          signal,
        }),
      signal,
    );
    transferred += chunk.size;
    onProgress?.(transferred, file.size);
  }
  return retry(
    () =>
      fileRequest<UploadFileResult>(
        `/v1/files/upload/${precheck.upload_id}/merge`,
        { method: 'POST', timeout: 300_000, signal },
      ),
    signal,
  );
}

export function cancelFileUploadApi(uploadId: string) {
  return fileRequest(`/v1/files/upload/${encodeURIComponent(uploadId)}`, {
    method: 'DELETE',
  });
}

/** The request client includes credentials so private downloads work for the uploader. */
export function downloadFileApi(
  fileId: SysId,
  options: { etag?: string; offset?: number; signal?: AbortSignal } = {},
) {
  return requestClient.download<Blob>(
    `/v1/files/download/${encodeURIComponent(fileId)}`,
    {
      timeout: 0,
      signal: options.signal,
      headers: {
        ...(options.offset ? { Range: `bytes=${options.offset}-` } : {}),
        ...(options.etag ? { 'If-Range': options.etag } : {}),
      },
    },
  );
}

/** Pass the same destination again to resume an interrupted large download. */
export async function downloadFileToDiskApi(
  fileId: SysId,
  destination: FileSystemFileHandle,
  options: {
    managed?: boolean;
    onProgress?: (downloaded: number, total: number) => void;
    signal?: AbortSignal;
  } = {},
) {
  const url = options.managed
    ? `/v1/files/manage/${encodeURIComponent(fileId)}/download`
    : `/v1/files/download/${encodeURIComponent(fileId)}`;
  const { signal, onProgress } = options;
  const info = await fileRequest<{
    headers: Record<string, string>;
  }>(url, { method: 'HEAD', responseReturn: 'raw', signal });
  const size = Number(info.headers['content-length']);
  const etag = info.headers.etag;
  if (!Number.isSafeInteger(size) || size < 0 || !etag)
    throw new Error('下载响应缺少文件大小或 ETag');
  const localFile = await destination.getFile();
  const resumeKey = `file-download:${fileId}`;
  let previous: null | {
    downloaded: number;
    etag: string;
    lastModified: number;
    name: string;
    size: number;
  } = null;
  try {
    previous = JSON.parse(localStorage.getItem(resumeKey) || 'null');
  } catch {
    // Storage may be unavailable; a fresh download remains possible.
  }
  let offset =
    previous?.etag === etag &&
    previous.size === size &&
    previous.name === localFile.name &&
    previous.downloaded === localFile.size &&
    previous.lastModified === localFile.lastModified &&
    localFile.size <= size
      ? localFile.size
      : 0;
  const output = await destination.createWritable({ keepExistingData: true });
  try {
    await output.truncate(offset);
    onProgress?.(offset, size);
    while (offset < size) {
      signal?.throwIfAborted();
      const end = Math.min(offset + TRANSFER_SIZE, size) - 1;
      const response: DownloadResponse = await retry(
        () =>
          fileRequest<DownloadResponse>(url, {
            method: 'GET',
            responseType: 'blob',
            headers: { Range: `bytes=${offset}-${end}`, 'If-Range': etag },
            responseReturn: 'raw',
            timeout: 120_000,
            signal,
          }),
        signal,
      );
      if (
        response.status !== 206 ||
        response.headers.etag !== etag ||
        response.headers['content-range'] !==
          `bytes ${offset}-${end}/${size}` ||
        response.data.size !== end - offset + 1
      ) {
        throw new Error('文件已变化或服务器未返回请求的文件范围，请重新下载');
      }
      await output.write({
        type: 'write',
        position: offset,
        data: response.data,
      });
      offset = end + 1;
      onProgress?.(offset, size);
    }
  } finally {
    // close commits completed ranges even after a network failure or cancellation.
    await output.close();
    const saved = await destination.getFile();
    try {
      localStorage.setItem(
        resumeKey,
        JSON.stringify({
          etag,
          size,
          name: saved.name,
          downloaded: offset,
          lastModified: saved.lastModified,
        }),
      );
    } catch {
      // A fresh download remains possible if browser storage is unavailable.
    }
  }
  try {
    localStorage.removeItem(resumeKey);
  } catch {
    // No resume state is needed after a completed download.
  }
}
