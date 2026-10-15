<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';

import type { ConfigType, ConfigValues } from './data';

import type { ConfigResult } from '#/api';

import { computed, onMounted, ref, watch } from 'vue';

import { useAccess } from '@vben/access';
import { useUserStore } from '@vben/stores';

import { Check, Close, Edit, Refresh } from '@element-plus/icons-vue';
import {
  ElAlert,
  ElButton,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElSkeleton,
  ElSwitch,
  ElTag,
} from 'element-plus';

import { getAllConfigApi, updateConfigApi } from '#/api';

import {
  buildConfigUpdates,
  configDefinitions,
  createConfigValues,
  hasConfigChanges,
  validateConfigField,
} from './data';

const props = defineProps<{ type: ConfigType }>();
const emit = defineEmits<{ dirtyChange: [dirty: boolean] }>();
const { hasAccessByCodes } = useAccess();
const userStore = useUserStore();
const definition = computed(() => configDefinitions[props.type]);
const formRef = ref<FormInstance>();
const configs = ref<ConfigResult[]>([]);
const values = ref<ConfigValues>({});
const loading = ref(true);
const loadFailed = ref(false);
const editing = ref(false);
const saving = ref(false);
const canEdit = computed(
  () =>
    !!userStore.userInfo?.is_superuser ||
    hasAccessByCodes(['sys.config.edits']),
);
const enabled = computed(
  () => values.value[definition.value.statusKey] === '1',
);
const dirty = computed(() =>
  hasConfigChanges(props.type, configs.value, values.value),
);
const availableKeys = computed(
  () => new Set(configs.value.map((config) => config.key)),
);
const sections = computed(() =>
  definition.value.sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) =>
        availableKeys.value.has(field.key),
      ),
    }))
    .filter((section) => section.fields.length > 0),
);
const rules = computed<FormRules>(() =>
  Object.fromEntries(
    sections.value.flatMap((section) =>
      section.fields.map((field) => [
        field.key,
        [
          {
            validator: (_rule, _value, callback) => {
              const message = validateConfigField(
                props.type,
                field.key,
                values.value,
              );
              callback(message ? new Error(message) : undefined);
            },
            trigger: 'blur',
          },
        ],
      ]),
    ),
  ),
);

watch(dirty, (value) => emit('dirtyChange', value));

async function fetchConfigList() {
  loading.value = true;
  loadFailed.value = false;
  try {
    configs.value = await getAllConfigApi({ type: props.type });
    values.value = createConfigValues(props.type, configs.value);
    editing.value = false;
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

function cancelEditing() {
  values.value = createConfigValues(props.type, configs.value);
  formRef.value?.clearValidate();
  editing.value = false;
}

function numberValue(key: string) {
  const value = values.value[key];
  return typeof value === 'number' ? value : undefined;
}

async function saveConfig() {
  if (saving.value || !dirty.value) return;
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  const updates = buildConfigUpdates(props.type, configs.value, values.value);
  saving.value = true;
  try {
    await updateConfigApi(updates);
    const savedValues = new Map(updates.map((item) => [item.key, item.value]));
    configs.value = configs.value.map((config) => ({
      ...config,
      value: savedValues.get(config.key) ?? config.value,
    }));
    values.value = createConfigValues(props.type, configs.value);
    editing.value = false;
    ElMessage.success(`${definition.value.title}已保存`);
  } catch {
    // 请求层显示错误，保留编辑内容以便重试。
  } finally {
    saving.value = false;
  }
}

onMounted(fetchConfigList);
</script>

<template>
  <section class="config-section" :aria-label="definition.title">
    <header class="section-header">
      <div>
        <h2>{{ definition.title }}</h2>
        <p>{{ definition.description }}</p>
      </div>
      <ElTag v-if="editing" type="warning" effect="plain">编辑中</ElTag>
    </header>

    <ElSkeleton v-if="loading" :rows="8" animated class="config-loading" />
    <ElAlert
      v-else-if="loadFailed"
      title="配置加载失败"
      type="error"
      :closable="false"
      show-icon
    >
      <ElButton :icon="Refresh" size="small" @click="fetchConfigList">
        重新加载
      </ElButton>
    </ElAlert>
    <ElEmpty v-else-if="configs.length === 0" description="暂无配置" />
    <ElForm
      v-else
      ref="formRef"
      :model="values"
      :rules="rules"
      :disabled="!editing || saving"
      label-position="top"
      hide-required-asterisk
      class="config-form"
      @submit.prevent="saveConfig"
    >
      <div v-if="availableKeys.has(definition.statusKey)" class="config-status">
        <div>
          <div class="status-label">
            <span>使用动态配置</span>
            <ElTag
              :type="enabled ? 'success' : 'info'"
              size="small"
              effect="plain"
            >
              {{ enabled ? '已启用' : '未启用' }}
            </ElTag>
          </div>
          <p>启用后优先使用以下参数。</p>
        </div>
        <ElSwitch
          v-model="values[definition.statusKey]"
          active-value="1"
          inactive-value="0"
          aria-label="使用动态配置"
        />
      </div>

      <section
        v-for="section in sections"
        :key="section.title"
        class="field-section"
      >
        <div class="field-section-heading">
          <h3>{{ section.title }}</h3>
          <p>{{ section.description }}</p>
        </div>
        <div class="field-grid">
          <ElFormItem
            v-for="field in section.fields"
            :key="field.key"
            :label="field.label"
            :prop="field.key"
          >
            <div class="field-content">
              <div v-if="field.kind === 'number'" class="number-control">
                <ElInputNumber
                  :key="`${field.key}-${editing}`"
                  :model-value="numberValue(field.key)"
                  :min="field.min"
                  :max="field.max ?? Number.MAX_SAFE_INTEGER"
                  :precision="0"
                  :step="1"
                  controls-position="right"
                  :aria-label="field.label"
                  @update:model-value="values[field.key] = $event ?? undefined"
                />
                <span v-if="field.unit" class="field-unit">{{
                  field.unit
                }}</span>
              </div>
              <div v-else-if="field.kind === 'switch'" class="switch-control">
                <ElSwitch
                  v-model="values[field.key]"
                  active-value="true"
                  inactive-value="false"
                  :aria-label="field.label"
                />
                <span>{{
                  values[field.key] === 'true' ? '开启' : '关闭'
                }}</span>
              </div>
              <ElInput
                v-else
                v-model="values[field.key]"
                :type="field.kind === 'password' ? 'password' : 'text'"
                :show-password="field.kind === 'password' && editing"
                :autocomplete="
                  field.kind === 'password' ? 'new-password' : 'off'
                "
                :aria-label="field.label"
              />
              <p v-if="field.description" class="field-description">
                {{ field.description }}
              </p>
            </div>
          </ElFormItem>
        </div>
      </section>
    </ElForm>

    <footer
      v-if="!loading && !loadFailed && configs.length"
      class="config-actions"
    >
      <template v-if="editing">
        <ElButton
          type="primary"
          :icon="Check"
          :loading="saving"
          :disabled="!dirty"
          @click="saveConfig"
        >
          保存修改
        </ElButton>
        <ElButton :icon="Close" :disabled="saving" @click="cancelEditing">
          取消
        </ElButton>
        <span v-if="dirty" class="unsaved-label">有未保存的修改</span>
      </template>
      <ElButton
        v-else-if="canEdit"
        type="primary"
        :icon="Edit"
        @click="editing = true"
      >
        修改配置
      </ElButton>
      <span v-else class="readonly-label">当前账号仅可查看配置</span>
    </footer>
  </section>
</template>

<style scoped>
.config-section {
  min-width: 0;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.section-header h2 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
}

.section-header p,
.config-status p,
.field-section-heading p,
.field-description,
.readonly-label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.config-loading {
  padding: 16px 0;
}

.config-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 20px;
  margin-bottom: 8px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.status-label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
  font-weight: 500;
}

.field-section {
  padding: 24px 0 8px;
}

.field-section + .field-section {
  border-top: 1px solid var(--el-border-color-lighter);
}

.field-section-heading {
  margin-bottom: 20px;
}

.field-section-heading h3 {
  margin-bottom: 4px;
  font-size: 15px;
  font-weight: 600;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 40px;
}

.config-form :deep(.el-form-item) {
  min-width: 0;
  margin-bottom: 24px;
}

.config-form :deep(.el-form-item__label) {
  height: auto;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
  line-height: 1.5;
}

.field-content {
  width: 100%;
}

.number-control,
.switch-control {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 36px;
}

.number-control .el-input-number {
  width: 100%;
  max-width: 260px;
}

.field-unit {
  flex: none;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.field-description {
  margin-top: 6px;
}

.config-form :deep(.el-input__wrapper) {
  min-height: 36px;
}

.config-form :deep(.is-disabled .el-input__inner) {
  -webkit-text-fill-color: var(--el-text-color-regular);
}

.config-actions {
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 20px 0;
  margin-top: 8px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
}

.config-actions .el-button + .el-button {
  margin-left: 0;
}

.unsaved-label {
  color: var(--el-color-warning-dark-2);
  font-size: 13px;
}

@media (width <= 1100px) {
  .field-grid {
    column-gap: 24px;
  }
}

@media (width <= 760px) {
  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .config-status {
    padding: 16px;
  }
}
</style>
