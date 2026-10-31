<script setup lang="ts">
import type { TableActionItem } from './table-actions';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
} from 'element-plus';

const props = withDefaults(
  defineProps<{
    actions: TableActionItem[];
    maxButtonWidth?: number;
    minButtonWidth?: number;
  }>(),
  {
    maxButtonWidth: 88,
    minButtonWidth: 56,
  },
);

const emit = defineEmits<{ run: [key: string] }>();

const GAP = 4;
const ROOT_FONT_SIZE = 13;

const rootRef = ref<HTMLElement>();
const containerWidth = ref(0);
let observer: ResizeObserver | undefined;

const items = computed(() => props.actions.filter((item) => !item.hidden));
const buttonWidths = computed(() =>
  items.value.map((item) => buttonWidth(item.label)),
);
const moreWidth = computed(() => buttonWidth('更多'));

const visibleCount = computed(() => {
  const list = items.value;
  if (list.length === 0) return 0;
  const width = containerWidth.value;
  if (!width) return list.length;
  const total =
    buttonWidths.value.reduce((sum, item) => sum + item, 0) +
    GAP * (list.length - 1);
  if (total <= width) return list.length;

  let used = 0;
  let count = 0;
  for (const [index, itemWidth] of buttonWidths.value.entries()) {
    const nextUsed = used + itemWidth + (index > 0 ? GAP : 0);
    const remaining = list.length - index - 1;
    const reserve = remaining > 0 ? GAP + moreWidth.value : 0;
    if (nextUsed + reserve > width) break;
    used = nextUsed;
    count += 1;
  }
  return count;
});

const visibleItems = computed(() => items.value.slice(0, visibleCount.value));

const overflowItems = computed(() => {
  const result: TableActionItem[] = [];
  for (const item of items.value.slice(visibleCount.value)) {
    if (item.children?.length) {
      result.push({
        ...item,
        key: 'group-' + item.key,
        disabled: true,
        label: item.label,
      });
      result.push(...item.children);
    } else {
      result.push(item);
    }
  }
  return result;
});

function buttonWidth(label: string) {
  let textWidth = 0;
  for (const char of label) {
    textWidth += /[\u4E00-\u9FFF]/.test(char)
      ? ROOT_FONT_SIZE
      : ROOT_FONT_SIZE * 0.55;
  }
  return Math.round(
    Math.min(
      props.maxButtonWidth,
      Math.max(props.minButtonWidth, textWidth + 24),
    ),
  );
}

function measure() {
  containerWidth.value = rootRef.value?.clientWidth ?? 0;
}

onMounted(() => {
  measure();
  if (typeof ResizeObserver !== 'undefined' && rootRef.value) {
    observer = new ResizeObserver(measure);
    observer.observe(rootRef.value);
  }
});

onBeforeUnmount(() => observer?.disconnect());

const actionMap = computed(() => {
  const map = new Map<string, TableActionItem>();
  for (const item of items.value) {
    map.set(item.key, item);
    for (const child of item.children || []) {
      map.set(child.key, child);
    }
  }
  return map;
});

async function activate(item: TableActionItem) {
  if (item.disabled || item.loading) return;
  try {
    await item.onClick?.();
  } catch {
    // 具体操作自行提示错误，这里避免未捕获的 Promise 拒绝
  } finally {
    emit('run', item.key);
  }
}

function run(key: string) {
  const item = actionMap.value.get(key);
  if (item) {
    void activate(item);
  }
}

function isGroup(item: TableActionItem) {
  return item.key.startsWith('group-');
}
</script>

<template>
  <div ref="rootRef" class="table-actions">
    <template v-for="item in visibleItems" :key="item.key">
      <ElDropdown
        v-if="item.children?.length"
        trigger="click"
        popper-class="table-action-popper"
        @command="run"
      >
        <ElButton
          class="table-action-button"
          :style="{ width: `${buttonWidth(item.label)}px` }"
          link
          :type="item.type || 'primary'"
          :disabled="item.disabled"
          :loading="item.loading"
          :title="item.title || item.label"
        >
          {{ item.label }}
        </ElButton>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem
              v-for="child in item.children"
              :key="child.key"
              :command="child.key"
              :disabled="child.disabled"
            >
              {{ child.label }}
            </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
      <ElButton
        v-else
        class="table-action-button"
        :style="{ width: `${buttonWidth(item.label)}px` }"
        link
        :type="item.type || 'primary'"
        :disabled="item.disabled"
        :loading="item.loading"
        :title="item.title || item.label"
        @click="activate(item)"
      >
        {{ item.label }}
      </ElButton>
    </template>

    <ElDropdown
      v-if="overflowItems.length > 0"
      trigger="click"
      popper-class="table-action-popper"
      @command="run"
    >
      <ElButton
        class="table-action-button"
        :style="{ width: `${moreWidth}px` }"
        link
        type="primary"
      >
        更多
      </ElButton>
      <template #dropdown>
        <ElDropdownMenu>
          <ElDropdownItem
            v-for="item in overflowItems"
            :key="item.key"
            :command="item.key"
            :class="{
              'table-action-group': isGroup(item),
              'table-action-danger': item.type === 'danger',
            }"
            :disabled="item.disabled"
          >
            {{ item.label }}
          </ElDropdownItem>
        </ElDropdownMenu>
      </template>
    </ElDropdown>
  </div>
</template>

<style scoped>
.table-actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  gap: 4px;
  font-size: 13px;
  white-space: nowrap;
}

.table-action-button {
  flex: none;
  height: 24px;
  padding: 0 4px;
  margin-left: 0 !important;
  overflow: hidden;
  font-size: 13px;
  line-height: 1;
}

.table-action-button :deep(span) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-action-button :deep(.el-icon) {
  flex: none;
  margin-right: 2px;
}
</style>

<style>
.table-action-popper .el-dropdown-menu__item {
  font-size: 13px;
  line-height: 22px;
}

.table-action-popper .table-action-group {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 600;
}

.table-action-popper .table-action-group.is-disabled {
  cursor: default;
  opacity: 1;
}

.table-action-popper
  .el-dropdown-menu__item.table-action-danger:not(.is-disabled) {
  color: var(--el-color-danger);
}
</style>
