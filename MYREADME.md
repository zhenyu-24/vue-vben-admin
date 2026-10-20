# 启动

## 安装依赖
```
# 进入项目目录
cd vue-vben-admin

# 启用 Corepack
npm i -g corepack

# 使用项目指定的 pnpm 版本
corepack enable
corepack prepare pnpm@11.7.0 --activate

# 安装依赖
pnpm install --frozen-lockfile
```

## 运行项目
```
# 当前项目默认联调应用：Element Plus
pnpm run dev:ele

# 其他工作区应用
pnpm run dev:antd
pnpm run dev:play
```

`web-ele` 默认访问地址为 `http://localhost:5777`。开发环境接口地址在 `apps/web-ele/.env.development` 中配置，当前默认值为：

```dotenv
VITE_GLOB_API_URL=http://localhost:8000/api
```

后端使用 `fastapi-architecture` 项目根目录的简化 Docker Compose 部署时，保持上述地址即可。若后端修改了 `SERVER_PORT`，同步修改 `VITE_GLOB_API_URL`，然后重启 Vite 开发服务。

## 构建与预览

```bash
# 构建 Element Plus 应用
pnpm run build:ele

# 构建 Ant Design Vue 应用
pnpm run build:antd

# 预览单个应用的生产构建
pnpm --filter @vben/web-ele run preview
```

生产环境变量位于 `apps/web-ele/.env.production`。生产部署前确认 `VITE_GLOB_API_URL` 指向实际后端地址，并保留 `/api` 后缀，例如：

```dotenv
VITE_GLOB_API_URL=http://localhost:8000/api
VITE_BASE=/
VITE_ROUTER_HISTORY=hash
```

`VITE_GLOB_API_URL` 会在构建时写入前端资源，修改后必须重新构建，不能只重启静态文件服务器。

# @vben 项目介绍

基于 Vue Vben Admin v5 的多应用前端 Monorepo。本项目当前主要使用 `apps/web-ele`，它基于 Vue 3、TypeScript 和 Element Plus；仓库同时保留 Ant Design Vue、Naive UI、TDesign、Playground 等应用。

---

## 根目录文件

```
.
├── README.md # 项目说明文档
├── apps # 项目应用目录
│   ├── backend-mock # 后端模拟服务应用
│   ├── web-antd # 基于 Ant Design Vue 的前端应用
│   ├── web-ele # 当前主要使用的 Element Plus 前端应用
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

### 当前联调相关文件

| 文件 | 作用 |
|---|---|
| `apps/web-ele/.env` | 应用标题、命名空间、持久化加密密钥等公共变量 |
| `apps/web-ele/.env.development` | 开发端口 `5777`、后端 API 地址、Mock 开关 |
| `apps/web-ele/.env.production` | 生产构建的 API 地址、路由模式、压缩和 PWA 配置 |
| `apps/web-ele/src/api/` | 业务 API 请求模块 |
| `apps/web-ele/src/router/` | 路由和权限守卫 |
| `apps/web-ele/src/store/` | Pinia 状态管理 |

### 与 FastAPI 后端联调

开发时启动顺序建议如下：

```powershell
# 终端一：启动后端
cd ..\fastapi-architecture
docker compose -f docker-simply-compose.yml up -d --build

# 终端二：启动前端
cd ..\vue-vben-admin
pnpm run dev:ele
```

打开 `http://localhost:5777`，接口请求应发送到 `http://localhost:8000/api`。后端健康检查地址为 `http://localhost:8000/health`，它不带 `/api` 前缀。

如果前端页面能打开但接口请求失败，按以下顺序检查：

1. `docker compose -f docker-simply-compose.yml ps` 中 `fba_server` 是否为 `healthy`。
2. `curl.exe -fsS http://127.0.0.1:8000/health` 是否返回 `{"code":200,"msg":"请求成功","data":null}`。
3. `apps/web-ele/.env.development` 的 `VITE_GLOB_API_URL` 是否与后端 `SERVER_PORT` 一致。
4. 修改环境变量后是否重启了 Vite 开发服务。
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

### 注册密码策略

注册页从后端 `GET /api/v1/auth/password-policy` 获取当前密码要求，动态显示长度范围和特殊字符要求，并使用相同规则校验密码。最小长度、最大长度、特殊字符要求来自后端当前生效的用户安全配置，不额外强制包含数字或英文字母。

进入注册页、窗口重新获得焦点和提交注册前都会重新读取规则。提交前规则改变时，页面更新提示并重新校验；加载失败会显示重试入口，阻止使用未知规则提交。后端注册接口同时执行复杂度校验。

浏览器回归脚本：`node apps/web-ele/test/e2e/registration-policy.mjs`，默认访问 `http://localhost:5777`，可用 `TEST_BASE_URL` 指定地址。脚本使用模拟接口，不会创建真实账户。

### 文件中心

系统管理 → 文件中心，地址 `/admin/files`，页面位于 `apps/web-ele/src/views/admin/files/index.vue`。
沿用现有系统管理权限，仅超级管理员可见，前端和后端菜单模式均注册入口，后台另行验证管理权限。

- 与用户管理、部门管理复用查询表单、VXE 表格和工具栏；外部链接页面采用相同布局。
- 支持文件名、类型、公开/私有和上传者用户名筛选、分页及刷新。
- 按现有存储目录显示文件夹和文件，支持进入目录、上一级和面包屑导航；填写筛选条件后跨全部目录查询，并显示每个文件所在路径。
- 显示文件详情、上传者用户名、存储路径、大小、上传时间、文件缺失和头像使用状态。
- 支持替换文件：保留原文件 ID、名称、访问地址、可见性及上传者；要求相同扩展名，并由后端重新校验内容及大小。
- 上传调用原有分片上传接口，支持进度、暂停和重新选择同一文件续传。
- 管理下载使用 `/api/v1/files/manage/{file_id}/download`，支持其他用户私有文件及大文件按块写盘。
- 删除需确认，会永久移除文件和数据库记录；正在使用的头像禁用删除，缺失文件可清理记录。
- 支持勾选单个或多个文件批量删除，部分失败时展示结果；可切换公开/私有可见性，访问路径随之改变。
- 上传使用统一选择文件按钮，并显示当前选择的文件名。

文件列表管理已入库的未软删除记录，无记录磁盘文件不在此页面列出。
文件夹由这些记录的存储路径生成，不展示空目录。上传选择“资源”类型后，可选择已有资源目录或输入新相对目录；
公开与私有资源分别加载可选目录。最终路径为 `resource/{相对目录}/YYYY/MM/DD`，公开资源增加 `public/` 前缀。
替换先通过现有分片接口上传私有来源文件，成功后来源记录被合并移除；替换失败时已上传文件保留，可在资源中心管理。
普通业务引用没有统一登记，永久删除前需核实引用。
浏览器不支持 File System Access API 时，下载回退为 Blob，最大 100 MiB。

回归：`node apps/web-ele/test/e2e/file-resources.mjs`（本机 Chrome；可用 `TEST_BASE_URL` 指定前端）。
脚本拦截并模拟 API，验证权限、列表筛选、详情、下载、删除、上传及移动端，不删除真实文件。

### 查询、排序与在线会话

管理页面复用 `useAdminGrid`：输入框按回车提交查询，普通属性及时间列支持排序。
分页列表通过 `sort_by`、`sort_order` 在后端分页前排序；操作、头像、角色集合及计算展示列不提供排序。
在线会话在前端对完整结果排序后分页，外部链接树使用本地排序。

在线列表仅显示活跃会话，状态 `1` 为在线，不展示未连接会话。
后端根据 Socket 连接或最近 180 秒的已认证请求判断在线，页面每 60 秒检查一次登录会话。
强制下线立即撤销对应会话的访问及刷新令牌；被下线页面下次请求或会话检查时响应。
关闭页面后活跃标记最多保留 180 秒；同一浏览器重新登录会替换旧会话，其他设备会话保留。
登录请求启用凭据以保存刷新 Cookie，退出请求携带访问令牌以撤销会话。
所有业务 ID 统一使用字符串类型 `SysId`，接口中的主键、外键和 ID 数组均返回字符串，
避免雪花 ID 在浏览器中丢失精度；分页数量、状态和文件大小仍为数字。

### Tailwind CSS 图标

直接添加 Tailwind CSS 的图标类名即可使用，图标类名可查看 [iconify](https://github.com/iconify/iconify) ：

```
<span class="icon-[mdi--ab-testing]"></span>
```
