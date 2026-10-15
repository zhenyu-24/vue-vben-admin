# 启动

## 安装依赖
```
# 进入项目目录
cd vue-vben-admin

# 使用项目指定的pnpm版本进行依赖安装
npm i -g corepack

# 安装依赖
pnpm install
```

## 运行项目
```
pnpm run dev:antd
pnpm run dev:ele
pnpm run dev:play
```

# @vben 项目介绍

基于 Vue Vben Admin v5 的 Ant Design Vue 版前端应用。

---

## 根目录文件

```
.
├── README.md # 项目说明文档
├── apps # 项目应用目录
│   ├── backend-mock # 后端模拟服务应用
│   ├── web-antd # 基于 Ant Design Vue 的前端应用
│   ├── web-ele # 基于 Element Plus 的前端应用
├── cspell.json # CSpell 配置文件
├── docs # 项目文档目录
├── eslint.config.mjs # ESLint 配置文件
├── lefthook.yml # Git Hook 配置文件
├── internal # 内部工具目录
│   ├── lint-configs # 代码检查配置
│   │   ├── commitlint-config # Commitlint 配置
│   │   ├── eslint-config # ESLint 配置
│   │   ├── oxfmt-config # Oxfmt 配置
│   │   ├── oxlint-config # Oxlint 配置
│   │   └── stylelint-config # Stylelint 配置
│   ├── node-utils # Node.js 工具
│   ├── tsconfig # 通用 tsconfig 配置
│   └── vite-config # 通用 Vite 配置
├── oxfmt.config.ts # Oxfmt 配置入口
├── oxlint.config.ts # Oxlint 配置文件
├── package.json # 项目依赖配置
├── packages # 项目包目录
│   ├── @core # 核心包
│   │   ├── base # 基础包
│   │   │   ├── design # 设计相关
│   │   │   ├── icons # 图标
│   │   │   ├── shared # 共享
│   │   │   └── typings # 类型定义
│   │   ├── composables # 组合式 API
│   │   ├── preferences # 偏好设置
│   │   └── ui-kit # UI 组件集合
│   │       ├── layout-ui # 布局 UI
│   │       ├── menu-ui # 菜单 UI
│   │       ├── shadcn-ui # shadcn UI
│   │       └── tabs-ui # 标签页 UI
│   ├── constants # 常量
│   ├── effects # 副作用相关包
│   │   ├── access # 访问控制
│   │   ├── plugins # 第三方大型依赖插件
│   │   ├── common-ui # 通用 UI
│   │   ├── hooks # 组合式 API
│   │   ├── layouts # 布局
│   │   └── request # 请求
│   ├── icons # 图标
│   ├── locales # 国际化
│   ├── preferences # 偏好设置
│   ├── stores # 状态管理
│   ├── styles # 样式
│   ├── types # 类型定义
│   └── utils # 工具
├── playground # 演示目录
├── pnpm-lock.yaml # pnpm 锁定文件
├── pnpm-workspace.yaml # pnpm 工作区配置文件
├── scripts # 脚本目录
│   ├── deploy # 部署相关脚本
│   ├── turbo-run # Turbo 运行脚本
│   └── vsh # VSH 脚本
├── stylelint.config.mjs # Stylelint 配置文件
├── turbo.json # Turbo 配置文件
├── vben-admin.code-workspace # VS Code 工作区配置文件
└── vitest.config.ts # Vitest 配置文件
```

---

## @vben/web-ele 目录结构

### 根目录文件

```
apps/web-ele/
├── .env                  # 公共环境变量（应用标题、命名空间等）
├── .env.development      # 开发环境变量（API 地址、mock 开关等）
├── .env.production       # 生产环境变量
├── .env.analyze          # 构建分析环境变量
├── index.html            # HTML 入口
├── package.json          # 依赖配置
├── tsconfig.json         # TypeScript 配置
├── tsconfig.node.json    # Node 端 TypeScript 配置
├── vite.config.ts        # Vite 构建配置（含 Element Plus 插件、API 代理）
├── public/               # 静态资源
│   └── favicon.ico
└── src/                  # 源码目录
```

---

### src/ 目录结构

```
src/
├── main.ts               # 应用入口，挂载 Vue 实例
├── bootstrap.ts          # 应用启动引导（注册全局组件、插件）
├── app.vue               # 根组件
├── preferences.ts        # 偏好设置扩展（覆盖 Vben 默认配置）
│
├── adapter/              # UI 组件库适配层
│   ├── component/        # 组件适配（Element Plus 组件注册）
│   ├── form.ts           # 表单适配（表单控件映射）
│   └── vxe-table.ts      # 表格适配（Vxe Table 配置）
│
├── api/                  # API 请求层
│   ├── request.ts        # 请求客户端（拦截器、token 刷新、错误处理）
│   ├── index.ts          # 统一导出
│   └── core/             # API 模块
│       ├── auth.ts       # 登录/登出/刷新 token/权限码
│       ├── user.ts       # 用户信息
│       └── menu.ts       # 菜单
│
├── layouts/              # 布局组件
│   ├── index.ts          # 统一导出
│   ├── basic.vue         # 基础布局（侧边栏 + 顶栏 + 内容区）
│   └── auth.vue          # 认证布局（登录/注册页布局）
│
├── locales/              # 国际化配置
│   ├── index.ts          # i18n 初始化
│   ├── README.md
│   └── langs/            # 语言包
│       ├── zh-CN/        # 中文
│       └── en-US/        # 英文
│
├── router/               # 路由配置
│   ├── index.ts          # 路由实例创建
│   ├── guard.ts          # 路由守卫（权限检查、token 校验、动态路由生成）
│   ├── access.ts         # 动态菜单/路由生成（接入后端菜单 API）
│   └── routes/           # 路由定义
│       ├── core.ts       # 核心路由（登录、根路由、404 兜底）
│       ├── index.ts      # 路由合并导出
│       └── modules/      # 业务路由模块
│           ├── dashboard.ts  # 仪表盘（Analytics、Workspace）
│           ├── demos.ts      # 演示页面
│           └── vben.ts       # Vben 相关页面
│
├── store/                # Pinia 状态管理
│   ├── index.ts          # 统一导出
│   └── auth.ts           # 认证状态（login/logout/fetchUserInfo）
│
├── types/                # 类型定义
│   └── element-plus-style-css.d.ts  # Element Plus 样式类型补充
│
└── views/                # 页面视图
    ├── _core/            # 应用核心页面
    │   ├── about/        # 关于页面
    │   ├── authentication/  # 认证相关（登录、验证码登录、二维码登录、忘记密码、注册）
    │   ├── fallback/     # 降级页面（404、403）
    │   └── profile/      # 个人中心
    ├── dashboard/        # 仪表盘
    │   ├── analytics/    # 数据分析
    │   └── workspace/    # 工作台
    └── demos/            # 演示页面
        ├── element/      # Element Plus 组件演示
        └── form/         # 表单演示
```

## 配置

[配置 | Vben Admin](https://doc.vben.pro/guide/essentials/settings.html#偏好设置)

### 环境变量配置

项目的环境变量配置位于应用目录下的 `.env`、`.env.development`、`.env.production`。

规则与 [Vite Env Variables and Modes](https://vitejs.dev/guide/env-and-mode.html) 一致。格式如下：

```
.env                # 在所有的环境中被载入
.env.local          # 在所有的环境中被载入，但会被 git 忽略
.env.[mode]         # 只在指定的模式中被载入
.env.[mode].local   # 只在指定的模式中被载入，但会被 git 忽略
```

使用

想要获取 `_app-config-{version}-{hash}.js` 内的变量，需要使用`@vben/hooks`提供的 `useAppConfig`方法。

```
const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
```

### preferences.ts

```
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
```

## 图标

集成了 [iconify](https://github.com/iconify/iconify) 图标库

### Iconify 图标 

可在 `packages/icons/src/iconify` 目录下新增图标：

```
// packages/icons/src/iconify/index.ts
import { createIconifyIcon } from '@vben-core/icons';

export const MdiKeyboardEsc = createIconifyIcon('mdi:keyboard-esc');
```

使用

```
<script setup lang="ts">
import { MdiKeyboardEsc } from '@vben/icons';
</script>

<template>
  <!-- 一个宽高为20px的图标 -->
  <MdiKeyboardEsc class="size-5" />
</template>
```

### Svg 图标 推荐

没有采用 Svg Sprite 的方式，而是直接引入 Svg 图标，

可以在 `packages/icons/src/svg/icons` 目录下新增图标文件`test.svg`, 然后在 `packages/icons/src/svg/index.ts` 中引入：

```
// packages/icons/src/svg/index.ts
import { createIconifyIcon } from '@vben-core/icons';

const SvgTestIcon = createIconifyIcon('svg:test');

export { SvgTestIcon };
```

使用

```
<script setup lang="ts">
import { SvgTestIcon } from '@vben/icons';
</script>

<template>
  <!-- 一个宽高为20px的图标 -->
  <SvgTestIcon class="size-5" />
</template>
```

### Tailwind CSS 图标

直接添加 Tailwind CSS 的图标类名即可使用，图标类名可查看 [iconify](https://github.com/iconify/iconify) ：

```
<span class="icon-[mdi--ab-testing]"></span>
```