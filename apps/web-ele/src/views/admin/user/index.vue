<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElButton, ElPagination, ElSwitch, ElTable, ElTableColumn, ElTag } from 'element-plus';

import { getUsersApi } from '#/api';
import { $t } from '#/locales';

interface UserItem {
  id: string;
  username: string;
  nickname: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  status: number;
  is_superuser: boolean;
  is_staff: boolean;
  join_time: string;
  last_login_time: string | null;
  dept: { name: string } | null;
  roles: { name: string }[];
}

interface PageData {
  items: UserItem[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

const loading = ref(false);
const pageData = reactive<PageData>({
  items: [],
  total: 0,
  page: 1,
  size: 20,
  total_pages: 0,
});

async function fetchData() {
  loading.value = true;
  try {
    const result = await getUsersApi({
      page: pageData.page,
      size: pageData.size,
    });
    // fba 后端返回 { code, msg, data: { items, total, page, size, total_pages } }
    // requestClient 已通过 interceptor 解出 data
    pageData.items = result.items ?? [];
    pageData.total = result.total ?? 0;
    pageData.page = result.page ?? 1;
    pageData.size = result.size ?? 20;
    pageData.total_pages = result.total_pages ?? 0;
  } finally {
    loading.value = false;
  }
}

function handlePageChange(page: number) {
  pageData.page = page;
  fetchData();
}

function handleSizeChange(size: number) {
  pageData.size = size;
  pageData.page = 1;
  fetchData();
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page :title="$t('page.admin.user')">
    <ElTable :data="pageData.items" border stripe v-loading="loading">
      <ElTableColumn prop="username" label="用户名" min-width="120" />
      <ElTableColumn prop="nickname" label="昵称" min-width="120" />
      <ElTableColumn prop="email" label="邮箱" min-width="180" />
      <ElTableColumn prop="phone" label="手机号" width="130" />
      <ElTableColumn label="状态" width="80" align="center">
        <template #default="{ row }: { row: UserItem }">
          <ElTag :type="row.status === 1 ? 'success' : 'danger'" size="small">
            {{ row.status === 1 ? '正常' : '停用' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="是否管理员" width="100" align="center">
        <template #default="{ row }: { row: UserItem }">
          {{ row.is_superuser ? '是' : '否' }}
        </template>
      </ElTableColumn>
      <ElTableColumn label="角色" min-width="150">
        <template #default="{ row }: { row: UserItem }">
          <ElTag v-for="role in row.roles" :key="role.name" class="mr-1" size="small">
            {{ role.name }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="join_time" label="注册时间" width="170" />
    </ElTable>

    <div class="mt-4 flex justify-end">
      <ElPagination
        :current-page="pageData.page"
        :page-size="pageData.size"
        :page-sizes="[10, 20, 50, 100]"
        :total="pageData.total"
        background
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </Page>
</template>
