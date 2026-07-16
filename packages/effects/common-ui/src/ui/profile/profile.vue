<script setup lang="ts">
import type { Props } from './types';

import { preferences } from '@vben-core/preferences';
import {
  Card,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  VbenAvatar,
} from '@vben-core/shadcn-ui';

import { Page } from '../../components';
import { ref } from 'vue';

defineOptions({
  name: 'ProfileUI',
});

const props = withDefaults(defineProps<Props>(), {
  title: '关于项目',
  tabs: () => [],
  avatarUpload: false,
  avatarUploading: false,
});

const emit = defineEmits<{
  'avatar-change': [file: File];
}>();

const tabsValue = defineModel<string>('modelValue');

const fileInput = ref<HTMLInputElement | null>(null);

function handleAvatarClick() {
  if (!props.avatarUpload || props.avatarUploading) return;
  fileInput.value?.click();
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    emit('avatar-change', file);
  }
  // 清空 input 值，允许重复选择同一文件
  if (target) target.value = '';
}
</script>
<template>
  <Page auto-content-height>
    <div class="flex size-full">
      <Card class="w-1/6 flex-none">
        <div class="mt-4 flex-col-center h-40 gap-4">
          <div
            :class="{ 'cursor-pointer': avatarUpload && !avatarUploading }"
            class="relative"
            @click="handleAvatarClick"
          >
            <VbenAvatar
              :src="userInfo?.avatar ?? preferences.app.defaultAvatar"
              class="size-20"
            />
            <!-- 上传中的 loading 遮罩 -->
            <div
              v-if="avatarUploading"
              class="bg-muted/60 absolute inset-0 flex items-center justify-center rounded-full"
            >
              <svg
                class="text-foreground size-6 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
            <!-- 未上传时的悬浮提示 -->
            <div
              v-else-if="avatarUpload"
              class="hover:bg-muted/60 absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity hover:opacity-100"
            >
              <svg
                class="size-6"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <input
              ref="fileInput"
              accept=".jpg,.jpeg,.png,.gif,.webp,.svg"
              class="hidden"
              type="file"
              @change="handleFileChange"
            />
          </div>
          <span class="text-lg font-semibold">
            {{ userInfo?.realName ?? '' }}
          </span>
          <span class="text-sm text-foreground/80">
            {{ userInfo?.username ?? '' }}
          </span>
        </div>
        <Separator class="my-4" />
        <Tabs v-model="tabsValue" orientation="vertical" class="m-4">
          <TabsList class="grid w-full grid-cols-1 bg-card">
            <TabsTrigger
              v-for="tab in tabs"
              :key="tab.value"
              :value="tab.value"
              class="h-12 justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {{ tab.label }}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>
      <Card class="ml-4 w-5/6 flex-auto p-8">
        <slot name="content"></slot>
      </Card>
    </div>
  </Page>
</template>
