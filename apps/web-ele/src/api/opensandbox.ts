import type { PaginationResult } from '#/types/api';

import { requestClient } from '#/api/request';

export interface ServiceStatus {
  api_enabled: boolean;
  api_key_configured: boolean;
  available: boolean;
  checked_time: string;
  configured: boolean;
  message: string;
  server_available: boolean;
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
  return requestClient.post<SandboxItem>(
    `${prefix}/sandboxes/${sandboxId}/pause`,
  );
}

export async function resumeSandboxApi(sandboxId: string) {
  return requestClient.post<SandboxItem>(
    `${prefix}/sandboxes/${sandboxId}/resume`,
  );
}

export async function restartSandboxApi(sandboxId: string) {
  return requestClient.post<SandboxItem>(
    `${prefix}/sandboxes/${sandboxId}/restart`,
    undefined,
    { timeout: 180_000 },
  );
}

export async function renameSandboxApi(sandboxId: string, name: string) {
  return requestClient.post<SandboxItem>(
    prefix + '/sandboxes/' + sandboxId + '/rename',
    { name },
  );
}

export async function deleteSandboxApi(sandboxId: string) {
  return requestClient.delete(`${prefix}/sandboxes/${sandboxId}`);
}

export async function listFilesApi(sandboxId: string, path?: string) {
  return requestClient.get<FileEntry[]>(
    `${prefix}/sandboxes/${sandboxId}/files`,
    {
      params: { path },
    },
  );
}

export async function readFileApi(sandboxId: string, path: string) {
  return requestClient.get<TextFileResult>(
    `${prefix}/sandboxes/${sandboxId}/file`,
    {
      params: { path },
    },
  );
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
  return requestClient.post(
    `${prefix}/sandboxes/${sandboxId}/file/rename`,
    data,
  );
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

export interface AdminOverview {
  paused_sandboxes: number;
  running_sandboxes: number;
  service: ServiceStatus;
  total_commands: number;
  total_sandboxes: number;
  total_users: number;
}

export interface AdminSandboxListParams {
  keyword?: string;
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: string;
  status?: string;
  user_id?: number | string;
  username?: string;
}

export interface CommandLogDetail {
  command: string;
  created_time: string;
  cwd?: null | string;
  duration_ms: number;
  exit_code?: null | number;
  id: number;
  sandbox_id: string;
  sandbox_name: string;
  session_id?: null | string;
  source: string;
  status: string;
  stderr: string;
  stdout: string;
  truncated: boolean;
  user_id: number;
  username: string;
}

export interface AdminCommandListParams {
  end_time?: string;
  keyword?: string;
  page?: number;
  sandbox_id?: string;
  size?: number;
  sort_by?: string;
  sort_order?: string;
  start_time?: string;
  status?: string;
  user_id?: number | string;
  username?: string;
}

export interface AdminServiceActionResult {
  output: string;
  status: ServiceStatus;
  success: boolean;
}

export interface AdminUserOption {
  id: number | string;
  nickname: string;
  username: string;
}

const adminPrefix = prefix + '/admin';

export async function getAdminOverviewApi() {
  return requestClient.get<AdminOverview>(adminPrefix + '/overview');
}

export async function getAdminSandboxesApi(params: AdminSandboxListParams) {
  return requestClient.get<PaginationResult<SandboxItem>>(
    adminPrefix + '/sandboxes',
    { params },
  );
}

export async function createAdminSandboxApi(data: CreateSandboxParams) {
  return requestClient.post<SandboxItem>(adminPrefix + '/sandboxes', data, {
    timeout: 180_000,
  });
}

export async function pauseAdminSandboxApi(sandboxId: string) {
  return requestClient.post<SandboxItem>(
    adminPrefix + '/sandboxes/' + sandboxId + '/pause',
  );
}

export async function resumeAdminSandboxApi(sandboxId: string) {
  return requestClient.post<SandboxItem>(
    adminPrefix + '/sandboxes/' + sandboxId + '/resume',
  );
}

export async function restartAdminSandboxApi(sandboxId: string) {
  return requestClient.post<SandboxItem>(
    adminPrefix + '/sandboxes/' + sandboxId + '/restart',
    undefined,
    { timeout: 180_000 },
  );
}

export async function renameAdminSandboxApi(sandboxId: string, name: string) {
  return requestClient.post<SandboxItem>(
    adminPrefix + '/sandboxes/' + sandboxId + '/rename',
    { name },
  );
}

export async function deleteAdminSandboxApi(sandboxId: string) {
  return requestClient.delete(adminPrefix + '/sandboxes/' + sandboxId);
}

export async function renewAdminSandboxApi(sandboxId: string, minutes: number) {
  return requestClient.post<SandboxItem>(
    adminPrefix + '/sandboxes/' + sandboxId + '/renew',
    { minutes },
  );
}

export async function syncAdminSandboxesApi() {
  return requestClient.post<number>(adminPrefix + '/sync');
}

export async function getAdminCommandsApi(params: AdminCommandListParams) {
  return requestClient.get<PaginationResult<CommandLogDetail>>(
    adminPrefix + '/commands',
    { params },
  );
}

export async function getAdminUsersApi() {
  return requestClient.get<AdminUserOption[]>(adminPrefix + '/users');
}

export async function startOpenSandboxServiceApi() {
  return requestClient.post<AdminServiceActionResult>(
    adminPrefix + '/service/start',
    undefined,
    { timeout: 60_000 },
  );
}

export async function stopOpenSandboxServiceApi() {
  return requestClient.post<AdminServiceActionResult>(
    adminPrefix + '/service/stop',
    undefined,
    { timeout: 60_000 },
  );
}
