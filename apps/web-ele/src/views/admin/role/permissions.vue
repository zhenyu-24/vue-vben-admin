<script setup lang="ts">
import type { TreeInstance } from 'element-plus';

import type {
  SysDataScopeResult,
  SysMenuTreeResult,
  SysRoleResult,
} from '#/api';
import type { SysId } from '#/types/api';

import { computed, nextTick, ref, watch } from 'vue';

import {
  EllipsisText,
  useVbenDrawer,
  useVbenModal,
  VbenButton,
  VbenIconButton,
} from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';

import { Search } from '@element-plus/icons-vue';
import {
  ElAlert,
  ElCheckbox,
  ElInput,
  ElMessage,
  ElRadioButton,
  ElRadioGroup,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
  ElTree,
} from 'element-plus';

import {
  getSysDataScopesApi,
  getSysMenuTreeApi,
  getSysRoleDataScopesApi,
  getSysRoleMenuApi,
  updateSysRoleDataScopesApi,
  updateSysRoleMenuApi,
} from '#/api';

import { collectTreeIds, mergeCheckedIds, sameIds } from './helpers';
import Rules from './rules.vue';

const role = ref<SysRoleResult>();
const activeTab = ref('menus');
const search = ref('');
const independent = ref(true);
const tree = ref<TreeInstance>();
const menus = ref<SysMenuTreeResult[]>([]);
const scopes = ref<SysDataScopeResult[]>([]);
const selectedScopes = ref<SysId[]>([]);
const menusLoading = ref(false);
const scopesLoading = ref(false);
const menusReady = ref(false);
const scopesReady = ref(false);
let initialMenus: SysId[] = [];
let initialScopes: SysId[] = [];
let version = 0;

const allScopesChecked = computed(
  () =>
    scopes.value.length > 0 &&
    scopes.value.every((scope) => scopeChecked(scope.id)),
);
const someScopesChecked = computed(() =>
  scopes.value.some((scope) => scopeChecked(scope.id)),
);
const title = computed(() =>
  $t('organization.role.permissionTitle', { name: role.value?.name ?? '' }),
);
const menuTypes = computed(() => [
  $t('organization.role.menuType.directory'),
  $t('organization.role.menuType.menu'),
  $t('organization.role.menuType.button'),
  $t('organization.role.menuType.iframe'),
  $t('organization.role.menuType.link'),
]);

const [Drawer, drawerApi] = useVbenDrawer({
  destroyOnClose: true,
  class: 'w-[800px] max-w-full',
  async onOpenChange(isOpen) {
    version++;
    if (!isOpen) return;
    role.value = drawerApi.getData<SysRoleResult>();
    activeTab.value = 'menus';
    search.value = '';
    independent.value = true;
    menus.value = [];
    scopes.value = [];
    initialMenus = [];
    initialScopes = [];
    selectedScopes.value = [];
    menusReady.value = false;
    scopesReady.value = false;
    await Promise.all([loadMenus(), loadScopes()]);
  },
  async onConfirm() {
    if (!role.value || menusLoading.value || scopesLoading.value) return;
    drawerApi.lock();
    try {
      if (menusReady.value && tree.value) {
        const checked = mergeCheckedIds(
          tree.value.getCheckedKeys(),
          independent.value ? [] : tree.value.getHalfCheckedKeys(),
        );
        if (!sameIds(checked, initialMenus)) {
          await updateSysRoleMenuApi(role.value.id, checked);
          initialMenus = [...checked];
        }
      }
      if (scopesReady.value && !sameIds(selectedScopes.value, initialScopes)) {
        await updateSysRoleDataScopesApi(role.value.id, selectedScopes.value);
        initialScopes = [...selectedScopes.value];
      }
      ElMessage.success($t('organization.saved'));
      await drawerApi.close();
    } catch {
      // Track successful saves separately so retrying a partial failure is safe.
    } finally {
      drawerApi.unlock();
    }
  },
});

async function loadMenus() {
  if (!role.value) return;
  const current = version;
  menusLoading.value = true;
  menusReady.value = false;
  try {
    const [all, assigned] = await Promise.all([
      getSysMenuTreeApi(),
      getSysRoleMenuApi(role.value.id),
    ]);
    if (current !== version) return;
    menus.value = all;
    initialMenus = collectTreeIds(assigned);
    menusReady.value = true;
    menusLoading.value = false;
    await nextTick();
    if (current !== version) return;
    tree.value?.setCheckedKeys(initialMenus);
    tree.value?.filter(search.value);
  } catch {
    // Keep this tab unavailable until both the options and assignments load.
  } finally {
    if (current === version) menusLoading.value = false;
  }
}

async function loadScopes() {
  if (!role.value) return;
  const current = version;
  scopesLoading.value = true;
  scopesReady.value = false;
  try {
    const [all, assigned] = await Promise.all([
      getSysDataScopesApi(),
      getSysRoleDataScopesApi(role.value.id),
    ]);
    if (current !== version) return;
    scopes.value = all;
    selectedScopes.value = [...assigned];
    initialScopes = [...assigned];
    scopesReady.value = true;
  } catch {
    // Do not replace existing assignments with an empty selection on failure.
  } finally {
    if (current === version) scopesLoading.value = false;
  }
}

const filterMenu: NonNullable<TreeInstance['$props']['filterNodeMethod']> = (
  value,
  data,
) => {
  const query = value.trim().toLocaleLowerCase();
  return (
    !query ||
    `${data.title} ${data.perms ?? ''}`.toLocaleLowerCase().includes(query)
  );
};

function expandMenus(expanded: boolean) {
  for (const id of collectTreeIds(menus.value)) {
    const node = tree.value?.getNode(id);
    if (node) node.expanded = expanded;
  }
}

function scopeChecked(id: SysId) {
  return selectedScopes.value.some(
    (selected) => String(selected) === String(id),
  );
}

function toggleScope(id: SysId, checked: boolean) {
  selectedScopes.value = checked
    ? mergeCheckedIds(selectedScopes.value, [id])
    : selectedScopes.value.filter(
        (selected) => String(selected) !== String(id),
      );
}

const [RuleModal, ruleApi] = useVbenModal({ connectedComponent: Rules });

watch(search, (value) => tree.value?.filter(value));
</script>

<template>
  <Drawer
    :title="title"
    :confirm-disabled="
      menusLoading || scopesLoading || (!menusReady && !scopesReady)
    "
  >
    <ElTabs v-model="activeTab">
      <ElTabPane :label="$t('organization.role.menuPermissions')" name="menus">
        <ElSkeleton v-if="menusLoading" :rows="8" animated />
        <template v-else-if="menusReady">
          <ElInput
            v-model="search"
            clearable
            :prefix-icon="Search"
            :placeholder="$t('organization.role.searchMenu')"
            :aria-label="$t('organization.role.searchMenu')"
          />
          <div class="my-4 flex flex-wrap items-center justify-between gap-3">
            <ElRadioGroup v-model="independent" size="small">
              <ElRadioButton :value="true">
                {{ $t('organization.role.independent') }}
              </ElRadioButton>
              <ElRadioButton :value="false">
                {{ $t('organization.role.linked') }}
              </ElRadioButton>
            </ElRadioGroup>
            <div class="flex items-center gap-1">
              <VbenIconButton
                :tooltip="$t('organization.role.selectAll')"
                :aria-label="$t('organization.role.selectAll')"
                @click="tree?.setCheckedKeys(collectTreeIds(menus))"
              >
                <IconifyIcon icon="lucide:check" class="size-4" />
              </VbenIconButton>
              <VbenIconButton
                :tooltip="$t('organization.role.clearAll')"
                :aria-label="$t('organization.role.clearAll')"
                @click="tree?.setCheckedKeys([])"
              >
                <IconifyIcon icon="lucide:x" class="size-4" />
              </VbenIconButton>
              <VbenIconButton
                :tooltip="$t('organization.expandAll')"
                :aria-label="$t('organization.expandAll')"
                @click="expandMenus(true)"
              >
                <IconifyIcon icon="lucide:chevrons-down" class="size-4" />
              </VbenIconButton>
              <VbenIconButton
                :tooltip="$t('organization.collapseAll')"
                :aria-label="$t('organization.collapseAll')"
                @click="expandMenus(false)"
              >
                <IconifyIcon icon="lucide:chevrons-up" class="size-4" />
              </VbenIconButton>
            </div>
          </div>
          <ElTree
            ref="tree"
            class="permission-tree"
            :data="menus"
            node-key="id"
            :props="{ label: 'title', children: 'children' }"
            show-checkbox
            default-expand-all
            :expand-on-click-node="false"
            :check-strictly="independent"
            :filter-node-method="filterMenu"
          >
            <template #default="{ data }">
              <div class="flex min-w-0 flex-1 items-center gap-2 pr-2">
                <div class="min-w-0 flex-1">
                  <EllipsisText>{{ data.title }}</EllipsisText>
                </div>
                <ElTag
                  size="small"
                  :type="data.type === 2 ? 'warning' : 'info'"
                >
                  {{ menuTypes[data.type] }}
                </ElTag>
                <div
                  v-if="data.perms"
                  class="ml-auto min-w-0 flex-1 text-right text-xs text-muted-foreground"
                >
                  <EllipsisText>{{ data.perms }}</EllipsisText>
                </div>
              </div>
            </template>
          </ElTree>
        </template>
        <ElAlert
          v-else
          :title="$t('organization.loadFailed')"
          type="error"
          :closable="false"
          show-icon
        >
          <VbenButton class="h-8 gap-1 px-0" variant="link" @click="loadMenus">
            <IconifyIcon icon="lucide:rotate-cw" class="size-4" />
            {{ $t('organization.retry') }}
          </VbenButton>
        </ElAlert>
      </ElTabPane>
      <ElTabPane :label="$t('organization.role.dataPermissions')" name="scopes">
        <ElSkeleton v-if="scopesLoading" :rows="6" animated />
        <ElTable
          v-else-if="scopesReady"
          :data="scopes"
          row-key="id"
          :tooltip-options="{
            effect: 'light',
            popperClass: 'app-text-tooltip',
            showAfter: 300,
          }"
        >
          <ElTableColumn width="48">
            <template #header>
              <ElCheckbox
                :model-value="allScopesChecked"
                :indeterminate="someScopesChecked && !allScopesChecked"
                :aria-label="$t('organization.role.selectAll')"
                @change="
                  (checked) =>
                    (selectedScopes = checked
                      ? scopes.map((scope) => scope.id)
                      : [])
                "
              />
            </template>
            <template #default="{ row }">
              <ElCheckbox
                :model-value="scopeChecked(row.id)"
                :aria-label="row.name"
                @change="(checked) => toggleScope(row.id, Boolean(checked))"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="name"
            :label="$t('organization.role.scopeName')"
            min-width="150"
            show-overflow-tooltip
          />
          <ElTableColumn :label="$t('organization.status')" width="100">
            <template #default="{ row }">
              <ElTag
                :type="row.status === 1 ? 'success' : 'danger'"
                size="small"
              >
                {{
                  $t(
                    row.status === 1
                      ? 'organization.enabled'
                      : 'organization.disabled',
                  )
                }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn :label="$t('organization.operation')" width="130">
            <template #default="{ row }">
              <VbenButton
                variant="link"
                class="h-8 px-0"
                @click="ruleApi.setData(row).open()"
              >
                {{ $t('organization.role.ruleDetails') }}
              </VbenButton>
            </template>
          </ElTableColumn>
        </ElTable>
        <ElAlert
          v-else
          :title="$t('organization.loadFailed')"
          type="error"
          :closable="false"
          show-icon
        >
          <VbenButton class="h-8 gap-1 px-0" variant="link" @click="loadScopes">
            <IconifyIcon icon="lucide:rotate-cw" class="size-4" />
            {{ $t('organization.retry') }}
          </VbenButton>
        </ElAlert>
      </ElTabPane>
    </ElTabs>
    <RuleModal />
  </Drawer>
</template>

<style scoped>
.permission-tree :deep(.el-tree-node__content) {
  height: 36px;
}

.permission-tree :deep(.el-tag) {
  flex-shrink: 0;
}
</style>
