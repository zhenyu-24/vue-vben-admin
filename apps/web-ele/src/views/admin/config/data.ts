import type { ConfigResult, UpdateConfigParam } from '#/api';

export type ConfigType = 'EMAIL' | 'LOGIN' | 'SANDBOX' | 'USER_SECURITY';
export type ConfigValues = Record<string, number | string | undefined>;

interface ConfigField {
  key: string;
  label: string;
  kind: 'number' | 'password' | 'switch' | 'text';
  description?: string;
  min?: number;
  max?: number;
  unit?: string;
}

interface ConfigSection {
  title: string;
  description: string;
  fields: ConfigField[];
}

interface ConfigDefinition {
  title: string;
  description: string;
  statusKey: string;
  sections: ConfigSection[];
}

export const configDefinitions: Record<ConfigType, ConfigDefinition> = {
  USER_SECURITY: {
    title: '安全配置',
    description: '管理登录失败保护、密码有效期与密码强度。',
    statusKey: 'USER_SECURITY_CONFIG_STATUS',
    sections: [
      {
        title: '登录失败保护',
        description: '限制连续密码错误，保护账号免受重复尝试。',
        fields: [
          {
            key: 'USER_LOCK_THRESHOLD',
            label: '密码错误锁定阈值',
            kind: 'number',
            min: 0,
            unit: '次',
            description: '连续失败达到此次数后锁定账号，0 表示不锁定。',
          },
          {
            key: 'USER_LOCK_SECONDS',
            label: '账号锁定时长',
            kind: 'number',
            min: 1,
            unit: '秒',
            description: '锁定时间结束后，账号自动解锁。',
          },
        ],
      },
      {
        title: '密码有效期',
        description: '设置密码更换周期与到期提醒。',
        fields: [
          {
            key: 'USER_PASSWORD_EXPIRY_DAYS',
            label: '密码有效期',
            kind: 'number',
            min: 0,
            unit: '天',
            description: '0 表示永不过期。',
          },
          {
            key: 'USER_PASSWORD_REMINDER_DAYS',
            label: '密码到期提醒',
            kind: 'number',
            min: 0,
            unit: '天',
            description: '到期前提前提醒的天数，0 表示不提醒。',
          },
        ],
      },
      {
        title: '密码强度',
        description: '约束新密码长度、重复使用与特殊字符。',
        fields: [
          {
            key: 'USER_PASSWORD_MIN_LENGTH',
            label: '密码最小长度',
            kind: 'number',
            min: 1,
            unit: '位',
          },
          {
            key: 'USER_PASSWORD_MAX_LENGTH',
            label: '密码最大长度',
            kind: 'number',
            min: 1,
            unit: '位',
          },
          {
            key: 'USER_PASSWORD_HISTORY_CHECK_COUNT',
            label: '密码历史检查次数',
            kind: 'number',
            min: 0,
            unit: '次',
            description: '新密码不能与最近 N 次密码相同，0 表示不检查。',
          },
          {
            key: 'USER_PASSWORD_REQUIRE_SPECIAL_CHAR',
            label: '密码必须包含特殊字符',
            kind: 'switch',
            description: '要求新密码包含标点或其他特殊字符。',
          },
        ],
      },
    ],
  },
  LOGIN: {
    title: '登录配置',
    description: '设置账号密码登录时的验证方式。',
    statusKey: 'LOGIN_CONFIG_STATUS',
    sections: [
      {
        title: '登录验证',
        description: '为账号密码登录增加图形验证码校验。',
        fields: [
          {
            key: 'LOGIN_CAPTCHA_ENABLED',
            label: '图形验证码',
            kind: 'switch',
            description: '开启后，登录时需要填写图形验证码。',
          },
        ],
      },
    ],
  },
  SANDBOX: {
    title: '沙盒配置',
    description: '管理 OpenSandbox 服务连接、全局镜像、默认配额和运行限制。',
    statusKey: 'OPEN_SANDBOX_CONFIG_STATUS',
    sections: [
      {
        title: '服务连接',
        description:
          '填写后端可访问的 OpenSandbox Server 地址，保存后立即生效。',
        fields: [
          {
            key: 'OPEN_SANDBOX_URL',
            label: '服务器地址',
            kind: 'text',
            description:
              '例如 http://127.0.0.1:8080；WSL2 中运行且已开启端口转发时同样使用本机地址。API Key 仍在后端 .env 中配置。',
          },
        ],
      },
      {
        title: '镜像与配额',
        description: '该配额为全局配置，所有普通用户统一使用。',
        fields: [
          {
            key: 'OPEN_SANDBOX_IMAGE',
            label: '默认沙盒镜像',
            kind: 'text',
            description: '新建沙盒未指定自定义镜像时使用。',
          },
          {
            key: 'OPEN_SANDBOX_MAX_SANDBOXES_PER_USER',
            label: '每用户最大沙盒数',
            kind: 'number',
            min: 1,
            max: 100,
            unit: '个',
          },
        ],
      },
      {
        title: '运行策略',
        description: '控制沙盒资源、空闲暂停和自动回收策略。',
        fields: [
          {
            key: 'OPEN_SANDBOX_IDLE_TIMEOUT_SECONDS',
            label: '空闲暂停时间',
            kind: 'number',
            min: 60,
            max: 86_400,
            unit: '秒',
            description: '超过该时间没有活动时自动暂停沙盒。',
          },
          {
            key: 'OPEN_SANDBOX_AUTO_PAUSE_ENABLED',
            label: '空闲自动暂停',
            kind: 'switch',
            description: '开启后按空闲时间自动暂停，不会删除容器。',
          },
          {
            key: 'OPEN_SANDBOX_RESOURCE_CPU',
            label: '默认 CPU 限制',
            kind: 'text',
            description: '例如 1 或 2。',
          },
          {
            key: 'OPEN_SANDBOX_RESOURCE_MEMORY',
            label: '默认内存限制',
            kind: 'text',
            description: '例如 2Gi 或 4Gi。',
          },
        ],
      },
      {
        title: '输出与文件限制',
        description: '限制命令输出、上传文件和在线文本预览的数据大小。',
        fields: [
          {
            key: 'OPEN_SANDBOX_MAX_OUTPUT_CHARS',
            label: '命令输出最大字符数',
            kind: 'number',
            min: 1024,
            unit: '字符',
          },
          {
            key: 'OPEN_SANDBOX_UPLOAD_LIMIT_BYTES',
            label: '单文件上传限制',
            kind: 'number',
            min: 1,
            unit: '字节',
          },
          {
            key: 'OPEN_SANDBOX_FILE_TEXT_LIMIT_BYTES',
            label: '文本预览限制',
            kind: 'number',
            min: 1,
            unit: '字节',
          },
        ],
      },
    ],
  },
  EMAIL: {
    title: '邮件配置',
    description: '设置系统通知与邮箱验证使用的 SMTP 服务。',
    statusKey: 'EMAIL_CONFIG_STATUS',
    sections: [
      {
        title: 'SMTP 服务器',
        description: '使用邮件服务商提供的服务器地址与端口。',
        fields: [
          {
            key: 'EMAIL_HOST',
            label: '服务器地址',
            kind: 'text',
            description: '例如 smtp.qq.com。',
          },
          {
            key: 'EMAIL_PORT',
            label: '服务器端口',
            kind: 'number',
            min: 1,
            max: 65_535,
            description: '请使用邮件服务商指定的端口。',
          },
          {
            key: 'EMAIL_SSL',
            label: 'SSL 加密',
            kind: 'switch',
            description: '是否通过 SSL 加密连接邮件服务器。',
          },
        ],
      },
      {
        title: '发信账号',
        description: '使用已开启 SMTP 服务的邮箱及其授权密码。',
        fields: [
          {
            key: 'EMAIL_USERNAME',
            label: '邮箱账号',
            kind: 'text',
          },
          {
            key: 'EMAIL_PASSWORD',
            label: '邮箱密码',
            kind: 'password',
            description: '填写邮箱授权码或服务商提供的 SMTP 密码。',
          },
        ],
      },
    ],
  },
};

export function getConfigFields(type: ConfigType) {
  return configDefinitions[type].sections.flatMap((section) => section.fields);
}

function getConfigKeys(type: ConfigType) {
  return new Set([
    configDefinitions[type].statusKey,
    ...getConfigFields(type).map((field) => field.key),
  ]);
}

export function getAvailableSections(
  type: ConfigType,
  configs: ConfigResult[],
) {
  const keys = new Set(configs.map((config) => config.key));
  return configDefinitions[type].sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) => keys.has(field.key)),
    }))
    .filter((section) => section.fields.length > 0);
}

export function createConfigValues(
  type: ConfigType,
  configs: ConfigResult[],
): ConfigValues {
  const fields = getConfigFields(type);
  const numericKeys = new Set(
    fields.filter((field) => field.kind === 'number').map((field) => field.key),
  );
  const switchKeys = new Set(
    fields.filter((field) => field.kind === 'switch').map((field) => field.key),
  );
  return Object.fromEntries(
    configs.map(({ key, value }) => {
      if (numericKeys.has(key) && value.trim() !== '') {
        return [key, Number(value)];
      }
      if (switchKeys.has(key)) {
        return [key, value.trim().toLowerCase()];
      }
      return [key, value];
    }),
  );
}

export function buildConfigUpdates(
  type: ConfigType,
  configs: ConfigResult[],
  values: ConfigValues,
): UpdateConfigParam[] {
  const knownKeys = getConfigKeys(type);
  return configs
    .filter(
      ({ key, value }) =>
        knownKeys.has(key) &&
        values[key] !== undefined &&
        String(values[key]) !== value,
    )
    .map(({ id, name, type: configType, key, is_frontend, remark }) => ({
      id,
      name,
      type: configType,
      key,
      value: String(values[key]),
      is_frontend,
      remark,
    }));
}

export function hasConfigChanges(
  type: ConfigType,
  configs: ConfigResult[],
  values: ConfigValues,
): boolean {
  const original = createConfigValues(type, configs);
  return [...getConfigKeys(type)].some(
    (key) => key in original && !Object.is(values[key], original[key]),
  );
}

export function validateConfigField(
  type: ConfigType,
  key: string,
  values: ConfigValues,
): string | undefined {
  if (values[configDefinitions[type].statusKey] !== '1') return;

  const field = getConfigFields(type).find((item) => item.key === key);
  if (!field) return;
  const value = values[key];
  if (value === undefined || String(value).trim() === '') {
    return `请填写${field.label}`;
  }
  if (field.kind === 'number') {
    const number = Number(value);
    if (!Number.isSafeInteger(number)) return '请输入有效整数';
    if (field.min !== undefined && number < field.min) {
      return `不能小于 ${field.min}`;
    }
    if (field.max !== undefined && number > field.max) {
      return `不能大于 ${field.max}`;
    }
  }
  if (
    key === 'OPEN_SANDBOX_URL' &&
    !/^https?:\/\/\S+$/i.test(String(value).trim())
  ) {
    return '请输入以 http:// 或 https:// 开头的地址';
  }
  if (
    key === 'USER_PASSWORD_MAX_LENGTH' &&
    Number(value) < Number(values.USER_PASSWORD_MIN_LENGTH)
  ) {
    return '最大长度不能小于最小长度';
  }
  if (
    key === 'USER_PASSWORD_REMINDER_DAYS' &&
    Number(values.USER_PASSWORD_EXPIRY_DAYS) > 0 &&
    Number(value) > Number(values.USER_PASSWORD_EXPIRY_DAYS)
  ) {
    return '提醒天数不能超过密码有效期';
  }
}
