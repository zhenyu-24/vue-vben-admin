<script setup lang="ts">
import type { SysDataRuleResult, SysDataScopeResult } from '#/api';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Refresh } from '@element-plus/icons-vue';
import {
  ElAlert,
  ElButton,
  ElSkeleton,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { getSysDataScopeRulesApi } from '#/api';

const scope = ref<SysDataScopeResult>();
const rules = ref<SysDataRuleResult[]>([]);
const loading = ref(false);
const failed = ref(false);
let version = 0;
const title = computed(() =>
  $t('organization.role.ruleTitle', { name: scope.value?.name ?? '' }),
);
const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  footer: false,
  class: 'w-[920px] max-w-[calc(100vw-2rem)]',
  onOpenChange(isOpen) {
    version++;
    if (!isOpen) return;
    scope.value = modalApi.getData<SysDataScopeResult>();
    rules.value = [];
    void loadRules();
  },
});

async function loadRules() {
  if (!scope.value) return;
  const current = version;
  loading.value = true;
  failed.value = false;
  try {
    const result = await getSysDataScopeRulesApi(scope.value.id);
    if (current === version)
      rules.value = result.rules.filter(
        (rule): rule is SysDataRuleResult => rule !== null,
      );
  } catch {
    if (current === version) failed.value = true;
  } finally {
    if (current === version) loading.value = false;
  }
}
</script>

<template>
  <Modal :title="title">
    <ElSkeleton v-if="loading" :rows="5" animated />
    <ElAlert
      v-else-if="failed"
      :title="$t('organization.loadFailed')"
      type="error"
      :closable="false"
      show-icon
    >
      <ElButton :icon="Refresh" link type="primary" @click="loadRules">{{
        $t('organization.retry')
      }}</ElButton>
    </ElAlert>
    <ElTable v-else :data="rules" row-key="id" max-height="480">
      <ElTableColumn
        prop="name"
        :label="$t('organization.role.ruleName')"
        min-width="140"
        show-overflow-tooltip
      />
      <ElTableColumn
        prop="model"
        :label="$t('organization.role.model')"
        min-width="140"
        show-overflow-tooltip
      />
      <ElTableColumn
        prop="column"
        :label="$t('organization.role.column')"
        min-width="100"
        show-overflow-tooltip
      />
      <ElTableColumn
        prop="operator"
        :label="$t('organization.role.operator')"
        min-width="100"
      />
      <ElTableColumn
        prop="expression"
        :label="$t('organization.role.expression')"
        min-width="100"
      />
      <ElTableColumn
        prop="value"
        :label="$t('organization.role.value')"
        min-width="140"
        show-overflow-tooltip
      />
    </ElTable>
  </Modal>
</template>
