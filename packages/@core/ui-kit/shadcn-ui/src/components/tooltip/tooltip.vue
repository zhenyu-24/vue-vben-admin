<script setup lang="ts">
import type { TooltipContentProps } from 'reka-ui';

import type { StyleValue } from 'vue';

import type { ClassType } from '@vben-core/typings';

import { ref, watch } from 'vue';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui';

interface Props {
  contentClass?: ClassType;
  contentStyle?: StyleValue;
  delayDuration?: number;
  disabled?: boolean;
  side?: TooltipContentProps['side'];
}

const props = withDefaults(defineProps<Props>(), {
  delayDuration: 300,
  disabled: false,
  side: 'right',
});

const open = ref(false);
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) open.value = false;
  },
);
</script>

<template>
  <TooltipProvider :delay-duration="delayDuration">
    <Tooltip v-model:open="open" :disabled="disabled">
      <TooltipTrigger as-child tabindex="-1">
        <slot name="trigger"></slot>
      </TooltipTrigger>
      <TooltipContent
        :class="contentClass"
        :side="side"
        :style="contentStyle"
        class="side-content"
      >
        <slot></slot>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
