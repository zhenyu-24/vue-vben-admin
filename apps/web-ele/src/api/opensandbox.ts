import { requestClient } from '#/api/request';

export interface ServiceStatus {
  api_key_configured: boolean;
  available: boolean;
  checked_time: string;
  configured: boolean;
  message: string;
  start_command_configured: boolean;
  stop_command_configured: boolean;
  url: string;
  version?: null | string;
}

export interface Overview {
  auto_pause_enabled: boolean;
  default_image: string;
  idle_timeout_seconds: number;
  is_admin: boolean;
  max_sandboxes: number;
  service: ServiceStatus;
  workspace_root: string;
}

export interface SandboxItem {
  auto_paused: boolean;
  created_at?: string;
  expires_at?: null | string;
  image: string;
  last_activity_time?: string;
  name: string;
  owner_id: string;
  owner_username: string;
  sandbox_id: string;
  state: string;
  workspace_root: string;
}

export interface FileEntry {
  mode?: null | string;
  modified_at?: null | string;
  name: string;
  path: string;
  size: number;
  type: 'directory' | 'file';
}

export interface TextFileResult {
  content: string;
  is_binary: boolean;
  path: string;
  size: number;
  truncated: boolean;
}

export interface CommandResult {
  command: string;
  created_time: string;
  cwd?: null | string;
  duration_ms: number;
  exit_code?: null | number;
  log_id?: null | string;
  status: string;
  stderr: string;
  stdout: string;
  truncated: boolean;
}

export interface TerminalSession {
  cwd: string;
  session_id: string;
}

export interface CreateSandboxParams {
  image?: string;
  name?: string;
  owner_id?: number | string;
  owner_username?: string;
}

const prefix = '/v1/opensandbox';

export async function getOverviewApi() {
  return requestClient.get<Overview>(`${prefix}/overview`);
}

export async function getSandboxesApi() {
  return requestClient.get<SandboxItem[]>(`${prefix}/sandboxes`);
}

export async function getSandboxApi(sandboxId: string) {
  return requestClient.get<SandboxItem>(`${prefix}/sandboxes/${sandboxId}`);
}

export async function createSandboxApi(data: CreateSandboxParams) {
  return requestClient.post<SandboxItem>(`${prefix}/sandboxes`, data, {
    timeout: 180_000,
  });
}

export async function pauseSandboxApi(sandboxId: string) {
  return requestClient.post<SandboxItem>(`${prefix}/sandboxes/${sandboxId}/pause`);
}

export async function resumeSandboxApi(sandboxId: string) {
  return requestClient.post<SandboxItem>(`${prefix}/sandboxes/${sandboxId}/resume`);
}

export async function deleteSandboxApi(sandboxId: string) {
  return requestClient.delete(`${prefix}/sandboxes/${sandboxId}`);
}

export async function listFilesApi(sandboxId: string, path?: string) {
  return requestClient.get<FileEntry[]>(`${prefix}/sandboxes/${sandboxId}/files`, {
    params: { path },
  });
}

export async function readFileApi(sandboxId: string, path: string) {
  return requestClient.get<TextFileResult>(`${prefix}/sandboxes/${sandboxId}/file`, {
    params: { path },
  });
}

export async function writeFileApi(
  sandboxId: string,
  data: { content: string; path: string },
) {
  return requestClient.put(`${prefix}/sandboxes/${sandboxId}/file`, data);
}

export async function mkdirApi(sandboxId: string, path: string) {
  return requestClient.post(`${prefix}/sandboxes/${sandboxId}/file/mkdir`, {
    path,
  });
}

export async function renameFileApi(
  sandboxId: string,
  data: { destination: string; source: string },
) {
  return requestClient.post(`${prefix}/sandboxes/${sandboxId}/file/rename`, data);
}

export async function deleteFileApi(sandboxId: string, path: string) {
  return requestClient.post(`${prefix}/sandboxes/${sandboxId}/file/delete`, {
    path,
  });
}

export async function uploadFileApi(
  sandboxId: string,
  path: string,
  file: File,
) {
  return requestClient.upload<string>(
    `${prefix}/sandboxes/${sandboxId}/file/upload`,
    { file },
    { params: { path } },
  );
}

export async function downloadFileApi(sandboxId: string, path: string) {
  return requestClient.download<Blob>(
    `${prefix}/sandboxes/${sandboxId}/file/download`,
    { params: { path } } as any,
  );
}

export async function executeCommandApi(
  sandboxId: string,
  data: {
    command: string;
    cwd?: string;
    session_id?: string;
    source?: 'code' | 'file' | 'terminal';
    timeout_seconds?: number;
  },
) {
  return requestClient.post<CommandResult>(
    `${prefix}/sandboxes/${sandboxId}/execute`,
    data,
    { timeout: 660_000 },
  );
}

export async function createSessionApi(sandboxId: string, cwd?: string) {
  return requestClient.post<TerminalSession>(
    `${prefix}/sandboxes/${sandboxId}/sessions`,
    { cwd },
  );
}

export async function deleteSessionApi(sandboxId: string, sessionId: string) {
  return requestClient.delete(
    `${prefix}/sandboxes/${sandboxId}/sessions/${sessionId}`,
  );
}
