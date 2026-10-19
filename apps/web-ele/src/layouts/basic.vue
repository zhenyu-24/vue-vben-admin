<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal, useVbenModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import {
  clearUserNoticesApi,
  deleteUserNoticeApi,
  getNoticeListApi,
  getUserNoticeStatusApi,
  markAllNoticesReadApi,
  markNoticeReadApi,
} from '#/api';
import NoticeContent from '#/components/notice-content.vue';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import { noticeContentText } from '#/utils/notice-content';
import LoginForm from '#/views/_core/authentication/login.vue';

/** ---------- 通知 ---------- */
type NoticeNotification = NotificationItem & { content: string };

const notifications = ref<NoticeNotification[]>([]);
const preview = ref<NoticeNotification>();
let previewQueue: NoticeNotification[] = [];

const [NoticePreviewModal, noticePreviewModalApi] = useVbenModal({
  title: '通知公告预览',
  class: 'w-[1080px] max-w-[calc(100vw-2rem)]',
  footer: false,
  async onClosed() {
    preview.value = undefined;
    // Let the modal finish destroying its content before opening the next notice.
    await nextTick();
    openNextNotice();
  },
});

function openNextNotice() {
  const notice = previewQueue.shift();
  if (!notice) return;
  preview.value = notice;
  noticePreviewModalApi.setState({ fullscreen: false }).open();
  if (!notice.isRead) {
    void markRead(notice.id).catch(() => {
      // The request client displays API errors; the notice remains unread.
    });
  }
}

const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);
let pollTimer: null | ReturnType<typeof setInterval> = null;

async function fetchNotifications() {
  try {
    const [noticeRes, statusRes] = await Promise.all([
      getNoticeListApi({ status: 1, page: 1, size: 50 }),
      getUserNoticeStatusApi(),
    ]);
    const statusMap = new Map(
      (statusRes ?? []).map((s) => [String(s.notice_id), s]),
    );

    notifications.value = (noticeRes.items ?? [])
      .filter((item) => !statusMap.get(String(item.id))?.deleted)
      .map((item) => {
        const userStatus = statusMap.get(String(item.id));
        return {
          id: item.id,
          title: item.title,
          content: item.content,
          message: noticeContentText(item.content).slice(0, 120),
          date: item.created_time,
          avatar: preferences.app.defaultAvatar,
          isRead: userStatus?.is_read ?? false,
          link: '',
        };
      });
  } catch {
    // 静默失败，不影响布局
  }
}

function handleNoticeClear() {
  const ids = notifications.value.map((n) => String(n.id));
  if (ids.length > 0) {
    clearUserNoticesApi(ids);
  }
  notifications.value = [];
}

async function markRead(id: number | string) {
  await markNoticeReadApi(String(id));
  const item = notifications.value.find((n) => n.id === id);
  if (item) {
    item.isRead = true;
  }
}

function remove(id: number | string) {
  deleteUserNoticeApi(String(id));
  notifications.value = notifications.value.filter((n) => n.id !== id);
}

function handleMakeAll() {
  const ids = notifications.value.map((n) => String(n.id));
  if (ids.length > 0) {
    markAllNoticesReadApi(ids);
  }
  notifications.value.forEach((item) => {
    item.isRead = true;
  });
}

function viewAll() {
  previewQueue = [...notifications.value];
  openNextNotice();
}

function handleClick(item: NotificationItem) {
  if (item.link) {
    navigateTo(item.link, item.query, item.state);
    return;
  }
  const notice = notifications.value.find((notice) => notice.id === item.id);
  if (!notice) return;
  previewQueue = [notice];
  openNextNotice();
}

onMounted(() => {
  fetchNotifications();
  // 每 60 秒轮询新通知
  pollTimer = setInterval(fetchNotifications, 60_000);
});

onUnmounted(() => {
  previewQueue = [];
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});

/** 跳转（支持内/外部链接） */
function navigateTo(
  link: string,
  query?: Record<string, any>,
  state?: Record<string, any>,
) {
  if (link.startsWith('http://') || link.startsWith('https://')) {
    window.open(link, '_blank');
  } else {
    router.push({
      path: link,
      query: query || {},
      state,
    });
  }
}

/** ---------- store ---------- */
const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark } = usePreferences();

/** ---------- 用户下拉菜单 ---------- */
// 菜单项列表，可在此增删改
const menus = computed(() => [
  {
    handler: () => {
      router.push({ name: 'Profile' });
    },
    icon: 'lucide:user',
    text: $t('page.auth.profile'),
  },
]);

// 头像
const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

// 用户昵称（显示在头像旁）
const displayName = computed(() => {
  const user = userStore.userInfo;
  return user?.realName ?? user?.username ?? '';
});

// 用户邮箱（显示在昵称下方）
const displayDesc = computed(() => {
  const user = userStore.userInfo as Record<string, any>;
  return user?.email || '';
});

// 管理员标签（后端返回 is_superuser 时显示）
const tagText = computed(() => {
  const user = userStore.userInfo as Record<string, any>;
  return user?.is_superuser ? '管理员' : '';
});

/** ---------- 登出 ---------- */
async function handleLogout() {
  await authStore.logout(false);
}

/** ---------- 水印 ---------- */
watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
    isDark: isDark.value,
  }),
  async ({ enable, content, isDark: isDarkValue }) => {
    if (enable) {
      const watermarkColor = isDarkValue
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.12)';

      await updateWatermark({
        advancedStyle: {
          colorStops: [
            { color: watermarkColor, offset: 0 },
            { color: watermarkColor, offset: 1 },
          ],
          type: 'linear',
        },
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  { immediate: true },
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <!-- 右上角用户下拉菜单 -->
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="displayName"
        :description="displayDesc"
        :tag-text="tagText"
        @logout="handleLogout"
        @clear-preferences-and-logout="handleLogout"
      />
    </template>

    <!-- 消息通知 -->
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @read="(item) => item.id && markRead(item.id)"
        @remove="(item) => item.id && remove(item.id)"
        @make-all="handleMakeAll"
        @on-click="handleClick"
        @view-all="viewAll"
      />
    </template>

    <!-- 全局弹窗 -->
    <template #extra>
      <NoticePreviewModal>
        <NoticeContent :title="preview?.title" :content="preview?.content" />
      </NoticePreviewModal>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>

    <!-- 锁屏 -->
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
