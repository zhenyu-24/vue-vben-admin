import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  // app名称
  app: {
    name: import.meta.env.VITE_APP_TITLE,
  },
  // logo - 使用 public/ 下的本地文件
  logo: {
    source: '/logo-light.webp',
    sourceDark: '/logo-dark.webp',
  },
  // copyright - 从环境变量读取
  copyright: {
    companyName: import.meta.env.VITE_APP_COPYRIGHT_COMPANY,
    companySiteLink: import.meta.env.VITE_APP_COPYRIGHT_LINK,
    date: import.meta.env.VITE_APP_COPYRIGHT_DATE,
    icp: import.meta.env.VITE_APP_ICP,
    icpLink: import.meta.env.VITE_APP_ICP_LINK,
    enable: true,
    settingShow: true,
  },
});
