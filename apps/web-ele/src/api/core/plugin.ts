import { requestClient } from '#/api/request';

export interface PluginInfo {
  author: string;
  description: string;
  enable: '0' | '1' | boolean;
  icon?: string;
  name: string;
  summary: string;
  tags?: string[];
  version: string;
}

export interface PluginResult {
  plugin: PluginInfo;
}

const pluginUrl = '/v1/sys/plugins';

export function getPluginListApi() {
  return requestClient.get<PluginResult[]>(pluginUrl);
}

export function getPluginChangedApi() {
  return requestClient.get<boolean>(`${pluginUrl}/changed`);
}

export function installZipPluginApi(file: File) {
  return requestClient.upload(
    pluginUrl,
    { file },
    { params: { type: 'zip' }, timeout: 60_000 },
  );
}

export function installGitPluginApi(repoUrl: string) {
  return requestClient.post(pluginUrl, undefined, {
    params: { type: 'git', repo_url: repoUrl },
    timeout: 60_000,
  });
}

export function updatePluginStatusApi(name: string) {
  return requestClient.put(`${pluginUrl}/${encodeURIComponent(name)}/status`);
}

export function downloadPluginApi(name: string) {
  return requestClient.download<Blob>(
    `${pluginUrl}/${encodeURIComponent(name)}`,
    { timeout: 60_000 },
  );
}

export function uninstallPluginApi(name: string) {
  return requestClient.delete(`${pluginUrl}/${encodeURIComponent(name)}`, {
    timeout: 60_000,
  });
}
