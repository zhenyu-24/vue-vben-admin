<script lang="ts" setup>
import type { AboutProps, DescriptionItem } from './about';

import { h } from 'vue';

import { Page } from '@vben/common-ui';
import { VBEN_GITHUB_URL } from '@vben/constants';

interface Props extends AboutProps {}

defineOptions({ name: 'About' });

withDefaults(defineProps<Props>(), {
  description:
    '是一个现代化开箱即用的中后台解决方案，采用最新的技术栈，包括 Vue 3.0、Vite、TailwindCSS 和 TypeScript 等前沿技术，代码规范严谨，提供丰富的配置选项，旨在为中大型项目的开发提供现成的开箱即用解决方案及丰富的示例，同时，它也是学习和深入前端技术的一个极佳示例。',
  name: 'Vben Admin',
  title: '关于项目',
});

const renderLink = (href: string, text: string) =>
  h(
    'a',
    { href, target: '_blank', class: 'vben-link' },
    { default: () => text },
  );

const __ADMIN_METADATA__ = {
  authorEmail: 'admin@email.com',
  authorName: 'xiangzy',
  authorUrl: 'https://test.dev',
  version: '1.0.0',
};

declare global {
  const __ADMIN_METADATA__: {
    authorEmail: string;
    authorName: string;
    authorUrl: string;
    version: string;
  };
}

const { authorEmail, authorName, authorUrl, version } =
  __ADMIN_METADATA__ || {};

const vbenDescriptionItems: DescriptionItem[] = [
  { content: version, title: '版本号' },
  // { content: license, title: '开源许可协议' },
  // { content: buildTime, title: '最后构建时间' },
  //   { content: renderLink(homepage, '点击查看'), title: '主页' },
  //   { content: renderLink(VBEN_DOC_URL, '点击查看'), title: '文档地址' },
  //   { content: renderLink(VBEN_PREVIEW_URL, '点击查看'), title: '预览地址' },
  { content: renderLink(VBEN_GITHUB_URL, '点击查看'), title: 'Github' },
  {
    content: h('div', [
      renderLink(authorUrl, `${authorName}  `),
      renderLink(`mailto:${authorEmail}`, authorEmail),
    ]),
    title: '作者',
  },
];
</script>

<template>
  <Page title="关于项目">
    <template #description>
      <p class="mt-3 text-sm/6 text-foreground">
        <a :href="VBEN_GITHUB_URL" class="vben-link" target="_blank">
          {{ name }}
        </a>
        {{ description }}
      </p>
    </template>
    <div class="card-box p-5">
      <div>
        <h5 class="text-lg text-foreground">基本信息</h5>
      </div>
      <div class="mt-4">
        <dl class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <template v-for="item in vbenDescriptionItems" :key="item.title">
            <div class="border-t border-border px-4 py-6 sm:col-span-1 sm:px-0">
              <!-- <dl>、<dt>、<dd> 是 HTML 中用于创建描述列表（Description List）的三个标签。 -->
              <dt class="text-sm/6 font-medium text-foreground">
                {{ item.title }}
              </dt>
              <dd class="mt-1 text-sm/6 text-foreground sm:mt-2">
                <!-- 根据 content 类型动态渲染：字符串直接显示，VNode 则作为组件渲染 -->
                <span v-if="typeof item.content === 'string'">
                  {{ item.content }}
                </span>
                <component v-else :is="() => item.content" />
              </dd>
            </div>
          </template>
        </dl>
      </div>
    </div>
  </Page>
</template>
