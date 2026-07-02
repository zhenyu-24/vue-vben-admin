<script lang="ts" setup>
import { computed } from 'vue';

import { AuthPageLayout } from '@vben/layouts';
import { preferences } from '@vben/preferences';

import { $t } from '#/locales';

/** 应用名称（从全局偏好设置中读取） */
const appName = computed(() => preferences.app.name);
/** Logo（亮色主题） */
const logo = computed(() => preferences.logo.source);
/** Logo（暗色主题，不设则复用亮色） */
const logoDark = computed(() => preferences.logo.sourceDark);
</script>

<template>
  <!--
    AuthPageLayout props 说明：
      :app-name         → 应用名称
      :logo / :logo-dark → Logo（亮/暗）
      :page-title       → 页面大标题（如 "欢迎回来"）
      :page-description → 页面描述（标题下方）
      :toolbar          → 是否显示顶栏工具栏（颜色/语言/布局/主题切换）
      :copyright        → 是否显示底部版权
      :toolbarList      → 工具栏按钮列表，可选：'color' | 'language' | 'layout' | 'theme'
  -->
    <!--
      sloganImage → 左侧品牌插画，不设则显示默认 SloganIcon
    -->
    <AuthPageLayout
      :copyright="false"
      :toolbar="true"
      :toolbarList="['color', 'language', 'layout', 'theme']"
      :app-name="appName"
      :logo="logo"
      :logo-dark="logoDark"
      :page-description="$t('authentication.pageDesc')"
      :page-title="$t('authentication.pageTitle')"
    >
    <!-- 如需自定义工具栏按钮，可在此追加 -->
    <!-- <template #toolbar></template> -->
  </AuthPageLayout>
</template>
