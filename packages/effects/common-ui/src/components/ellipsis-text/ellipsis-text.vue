<script setup lang="ts">
import type { CSSProperties } from 'vue';

import { computed, onMounted, onUpdated, ref, watch } from 'vue';

import { VbenTooltip } from '@vben-core/shadcn-ui';

import { useElementSize, useMutationObserver } from '@vueuse/core';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), {
  expand: false,
  line: 1,
  maxWidth: '100%',
  placement: 'top',
  tooltip: true,
  tooltipWhenEllipsis: true,
  ellipsisThreshold: 3,
  tooltipBackgroundColor: '',
  tooltipColor: '',
  tooltipFontSize: 14,
  tooltipMaxWidth: 360,
  tooltipOverlayStyle: () => ({ textAlign: 'left' }),
});

const emit = defineEmits<{ expandChange: [boolean] }>();

interface Props {
  /**
   * 是否启用点击文本展开全部
   * @default false
   */
  expand?: boolean;
  /**
   * 文本最大行数
   * @default 1
   */
  line?: number;
  /**
   * 文本最大宽度
   * @default '100%'
   */
  maxWidth?: number | string;
  /**
   * 提示框位置
   * @default 'top'
   */
  placement?: 'bottom' | 'left' | 'right' | 'top';
  /**
   * 是否启用文本提示框
   * @default true
   */
  tooltip?: boolean;
  /**
   * 是否只在文本被截断时显示提示框
   * @default true
   */
  tooltipWhenEllipsis?: boolean;
  /**
   * 文本截断检测的像素差异阈值，越大则判断越严格
   * @default 3
   */
  ellipsisThreshold?: number;
  /**
   * 提示框背景颜色，优先级高于 overlayStyle
   */
  tooltipBackgroundColor?: string;
  /**
   * 提示文本字体颜色，优先级高于 overlayStyle
   */
  tooltipColor?: string;
  /**
   * 提示文本字体大小，单位px，优先级高于 overlayStyle
   */
  tooltipFontSize?: number;
  /**
   * 提示框内容最大宽度，单位px
   * @default 360
   */
  tooltipMaxWidth?: number;
  /**
   * 提示框内容区域样式
   * @default { textAlign: 'left' }
   */
  tooltipOverlayStyle?: CSSProperties;
}

const textMaxWidth = computed(() => {
  if (typeof props.maxWidth === 'number') {
    return `${props.maxWidth}px`;
  }
  return props.maxWidth;
});
const ellipsis = ref();
const isExpand = ref(false);
const isEllipsis = ref(false);

const { width: eleWidth, height: eleHeight } = useElementSize(ellipsis);

// 检测文本是否被截断
const checkEllipsis = () => {
  if (!ellipsis.value || !props.tooltipWhenEllipsis) return;

  const element = ellipsis.value;

  const originalText = element.textContent || '';
  const originalTrimmed = originalText.trim();

  // 对于空文本直接返回 false
  if (!originalTrimmed) {
    isEllipsis.value = false;
    return;
  }

  const widthDiff = element.scrollWidth - element.clientWidth;
  const heightDiff = element.scrollHeight - element.clientHeight;

  // 使用足够大的差异阈值确保只有真正被截断的文本才会显示 tooltip
  isEllipsis.value =
    props.line === 1
      ? widthDiff > props.ellipsisThreshold
      : heightDiff > props.ellipsisThreshold;
};

watch(
  [eleWidth, eleHeight, () => props.tooltipWhenEllipsis, () => props.line],
  checkEllipsis,
  { flush: 'post' },
);
useMutationObserver(ellipsis, checkEllipsis, {
  characterData: true,
  childList: true,
  subtree: true,
});
onMounted(checkEllipsis);

// 使用onUpdated钩子检测内容变化
onUpdated(() => {
  if (props.tooltipWhenEllipsis) {
    checkEllipsis();
  }
});

function onExpand() {
  isExpand.value = !isExpand.value;
  emit('expandChange', isExpand.value);
  if (props.tooltipWhenEllipsis) {
    checkEllipsis();
  }
}

function handleExpand() {
  props.expand && onExpand();
}
</script>
<template>
  <div class="min-w-0 max-w-full">
    <VbenTooltip
      :content-style="{
        ...tooltipOverlayStyle,
        maxWidth: `min(${tooltipMaxWidth}px, calc(100vw - 32px))`,
        overflowWrap: 'anywhere',
        fontSize: `${tooltipFontSize}px`,
        color: tooltipColor,
        backgroundColor: tooltipBackgroundColor,
      }"
      :disabled="
        !props.tooltip || isExpand || (props.tooltipWhenEllipsis && !isEllipsis)
      "
      :side="placement"
    >
      <slot name="tooltip">
        <slot></slot>
      </slot>

      <template #trigger>
        <div
          ref="ellipsis"
          :class="{
            'cursor-pointer!': expand,
            ['block truncate']: line === 1,
            [$style.ellipsisMultiLine]: line > 1,
          }"
          :style="{
            '-webkit-line-clamp': isExpand ? '' : line,
            'max-width': textMaxWidth,
          }"
          class="cursor-text overflow-hidden"
          @click="handleExpand"
          v-bind="$attrs"
        >
          <slot></slot>
        </div>
      </template>
    </VbenTooltip>
  </div>
</template>

<style module>
.ellipsisMultiLine {
  display: -webkit-box;
  -webkit-box-orient: vertical;
}
</style>
