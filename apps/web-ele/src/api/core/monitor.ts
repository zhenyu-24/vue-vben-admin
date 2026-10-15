import type { SysId } from '#/types/api';

import { requestClient } from '#/api/request';

export interface ServerMonitorResult {
  cpu: {
    current_freq: number;
    logical_num: number;
    max_freq: number;
    min_freq: number;
    physical_num: number;
    usage: number;
  };
  mem: { free: number; total: number; usage: number; used: number };
  sys: { arch: string; ip: string; name: string; os: string };
  disk: {
    device: string;
    dir: string;
    free: string;
    total: string;
    type: string;
    usage: string;
    used: string;
  }[];
  service: {
    cpu_usage: string;
    elapsed: string;
    home: string;
    mem_free: string;
    mem_rss: string;
    mem_vms: string;
    name: string;
    startup: string;
    version: string;
  };
}

export interface RedisCommandStat {
  name: string;
  value: string;
}

export interface RedisMonitorResult {
  info: {
    blocked_clients: string;
    connected_clients: string;
    instantaneous_ops_per_sec: string;
    keys_num: string;
    maxmemory_human: string;
    mem_fragmentation_ratio: string;
    redis_mode: string;
    redis_version: string;
    rejected_connections: string;
    role: string;
    tcp_port: string;
    total_commands_processed: string;
    uptime: string;
    used_memory_human: string;
    used_memory_rss_human: string;
  };
  stats: RedisCommandStat[];
}

export interface OnlineMonitorResult {
  id: SysId;
  session_uuid: string;
  username: string;
  nickname: string;
  ip: string;
  os: string;
  browser: string;
  device: string;
  status: number;
  last_login_time: string;
  expire_time: string;
}

export interface MonitorOnlineParams {
  username?: string;
}

export interface KickOutOnlineParams {
  session_uuid: string;
}

export async function getServerMonitorApi() {
  return requestClient.get<ServerMonitorResult>('/v1/monitors/server');
}

export async function getRedisMonitorApi() {
  return requestClient.get<RedisMonitorResult>('/v1/monitors/redis');
}

export async function getOnlineMonitorApi(params: MonitorOnlineParams) {
  return requestClient.get<OnlineMonitorResult[]>('/v1/monitors/sessions', {
    params,
  });
}

export async function kickOutOnlineApi(pk: SysId, params: KickOutOnlineParams) {
  return requestClient.delete(`/v1/monitors/sessions/${pk}`, { params });
}
