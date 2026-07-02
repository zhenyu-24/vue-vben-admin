import {
  appCopyrightPreferences,
  defineOverridesPreferences,
} from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    name: import.meta.env.VITE_APP_TITLE,
  },
  logo: {
    source: 'https://unpkg.com/@vbenjs/static-source@0.1.7/source/logo-v1.webp',
    sourceDark: 'https://unpkg.com/@vbenjs/static-source@0.1.7/source/logo-v1-dark.webp',
  },
  copyright: appCopyrightPreferences,
});
