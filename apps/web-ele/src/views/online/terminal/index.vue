<script setup lang="ts">
import type { CommandResult, TerminalSession } from '#/api/opensandbox';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { Close } from '@element-plus/icons-vue';
import { Page } from '@vben/common-ui';
import { ElButton, ElEmpty, ElIcon, ElMessage, ElTabPane, ElTabs } from 'element-plus';

import {
  createSessionApi,
  deleteSessionApi,
  executeCommandApi,
} from '#/api/opensandbox';

import OpenSandboxToolbar from '../shared/OpenSandboxToolbar.vue';
import { useOpenSandbox } from '../shared/useOpenSandbox';

defineOptions({ name: 'OnlineTerminal' });

interface TerminalTab extends TerminalSession {
  title: string;
}

const { initialize, selectedId, selectedSandbox, workspaceRoot, loading } = useOpenSandbox();
const sessions = ref<TerminalTab[]>([]);
const activeKey = ref('');
const outputs = ref<Record<string, string>>({});
const input = ref('');
const busy = ref(false);
const outputRef = ref<HTMLElement>();
const inputRef = ref<HTMLInputElement>();
const history = ref<string[]>([]);
const historyIndex = ref(-1);

const activeSession = computed(() =>
  sessions.value.find((item) => item.session_id === activeKey.value),
);
const output = computed(() => outputs.value[activeKey.value] || '');

onMounted(async () => {
  await initialize();
  await nextTick();
  focusTerminal();
});

watch(
  selectedId,
  () => {
    sessions.value = [];
    outputs.value = {};
    activeKey.value = '';
    input.value = '';
  },
  { immediate: true },
);

function append(sessionId: string, text: string) {
  outputs.value[sessionId] = `${outputs.value[sessionId] || ''}${text}`;
  void nextTick(() => {
    if (outputRef.value) outputRef.value.scrollTop = outputRef.value.scrollHeight;
  });
}


function focusTerminal() {
  if (selectedId.value) inputRef.value?.focus();
}

function historyPrev() {
  if (history.value.length === 0) return;
  historyIndex.value = Math.min(historyIndex.value + 1, history.value.length - 1);
  input.value = history.value[history.value.length - 1 - historyIndex.value] || '';
}

function historyNext() {
  if (history.value.length === 0) return;
  historyIndex.value = Math.max(historyIndex.value - 1, -1);
  input.value = historyIndex.value < 0 ? '' : history.value[history.value.length - 1 - historyIndex.value] || '';
}

async function ensureSession() {
  if (activeSession.value) return activeSession.value.session_id;
  const session = await createSessionApi(selectedId.value, workspaceRoot.value);
  const tab = {
    ...session,
    title: `bash ${sessions.value.length + 1}`,
  };
  sessions.value.push(tab);
  activeKey.value = tab.session_id;
  outputs.value[tab.session_id] = `${session.cwd}\n`;
  return session.session_id;
}

async function newTerminal() {
  if (!selectedId.value || busy.value) return;
  busy.value = true;
  try {
    const session = await createSessionApi(selectedId.value, workspaceRoot.value);
    const tab = {
      ...session,
      title: `bash ${sessions.value.length + 1}`,
    };
    sessions.value.push(tab);
    activeKey.value = tab.session_id;
    outputs.value[tab.session_id] = `${session.cwd}\n`;
    await nextTick();
    focusTerminal();
  } catch (error: any) {
    ElMessage.error(error?.message || String(error));
  } finally {
    busy.value = false;
  }
}

async function closeSession(sessionId: string) {
  try {
    await deleteSessionApi(selectedId.value, sessionId);
  } catch {
    // 沙盒停止后会话已经不存在，仍然移除前端标签
  }
  sessions.value = sessions.value.filter((item) => item.session_id !== sessionId);
  delete outputs.value[sessionId];
  if (activeKey.value === sessionId) {
    activeKey.value = sessions.value.at(-1)?.session_id || '';
  }
}

async function submit() {
  const command = input.value.trim();
  if (!command || busy.value || !selectedId.value) return;
  const clearScreen = command === 'clear';
  busy.value = true;
  history.value.push(command);
  historyIndex.value = -1;
  input.value = '';
  try {
    const sessionId = await ensureSession();
    const session = sessions.value.find((item) => item.session_id === sessionId);
    if (!clearScreen) append(sessionId, `$ ${command}\n`);
    const result: CommandResult = await executeCommandApi(selectedId.value, {
      command,
      cwd: session?.cwd || workspaceRoot.value,
      source: 'terminal',
      session_id: sessionId,
      timeout_seconds: 600,
    });
    if (clearScreen) {
      outputs.value[sessionId] = '';
    } else {
      append(sessionId, `${result.stdout}${result.stderr}`);
      if (result.stdout && !result.stdout.endsWith('\n')) append(sessionId, '\n');
    }
    if (result.cwd) {
      if (session) session.cwd = result.cwd;
    }
  } catch (error: any) {
    append(activeKey.value, `${error?.message || String(error)}\n`);
    ElMessage.error(error?.message || String(error));
  } finally {
    busy.value = false;
    await nextTick();
    focusTerminal();
  }
}
</script>

<template>
  <Page auto-content-height>
    <div class="terminal-page">
      <OpenSandboxToolbar />

      <el-empty v-if="!loading && !selectedSandbox" description="请先创建一个沙盒" />

      <div v-else class="terminal-shell">
        <div class="terminal-topbar">
          <div class="terminal-target">
            <span class="terminal-led" />
            <span class="terminal-host">root@opensandbox</span>
            <span class="terminal-sep">:</span>
            <span class="terminal-path">{{ activeSession?.cwd || workspaceRoot }}</span>
          </div>
          <div class="terminal-top-actions">
            <el-button size="small" :disabled="!selectedId || busy" @click="newTerminal">
              新建终端
            </el-button>
            <span class="terminal-hint">会话在沙盒停止前保持状态</span>
          </div>
        </div>

        <el-tabs v-if="sessions.length > 0" v-model="activeKey" class="terminal-tabs" type="card">
          <el-tab-pane v-for="session in sessions" :key="session.session_id" :name="session.session_id">
            <template #label>
              <span class="terminal-tab-label">
                {{ session.title }}
                <el-icon class="terminal-tab-close" @click.stop="closeSession(session.session_id)">
                  <Close />
                </el-icon>
              </span>
            </template>
          </el-tab-pane>
        </el-tabs>

        <div ref="outputRef" class="terminal-output" @click="focusTerminal">
          <pre v-if="output">{{ output }}</pre>
          <div v-else class="terminal-welcome">
            <div class="terminal-welcome-title">OpenSandbox SSH 终端</div>
            <div>点击终端区域后直接输入，按 Enter 执行命令</div>
          </div>
          <div class="terminal-live-line">
            <span class="terminal-prompt">$</span>
            <span class="terminal-typed">{{ input }}</span>
            <span class="terminal-cursor" :class="{ hidden: busy }" />
            <span v-if="busy" class="terminal-busy">执行中...</span>
          </div>
          <input
            ref="inputRef"
            v-model="input"
            class="terminal-hidden-input"
            :disabled="!selectedId || busy"
            autocomplete="off"
            spellcheck="false"
            @keydown.enter.prevent="submit"
            @keydown.up.prevent="historyPrev"
            @keydown.down.prevent="historyNext"
          />
        </div>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.terminal-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.terminal-shell {
  display: flex;
  min-height: 480px;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #202838;
  border-radius: 10px;
  background: #11151d;
  box-shadow: 0 8px 26px rgb(0 0 0 / 12%);
  color: #d8dee9;
}

.terminal-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #202838;
  background: #171c26;
  padding: 9px 14px;
}

.terminal-target {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.terminal-led {
  height: 8px;
  width: 8px;
  border-radius: 999px;
  background: #3ddc97;
  box-shadow: 0 0 8px rgb(61 220 151 / 70%);
}

.terminal-host {
  color: #d8dee9;
}

.terminal-sep {
  color: #5c677d;
}

.terminal-path {
  color: #7dd3fc;
}

.terminal-top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.terminal-hint {
  color: #6b7280;
  font-size: 11px;
}

.terminal-tabs {
  background: #171c26;
}

.terminal-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 8px;
}

.terminal-tabs :deep(.el-tabs__content) {
  display: none;
}

.terminal-tabs :deep(.el-tabs__item) {
  height: 32px;
  border-color: #2b3444 !important;
  background: #1b2230;
  color: #9aa6b2;
  font-size: 12px;
}

.terminal-tabs :deep(.el-tabs__item.is-active) {
  background: #11151d;
  color: #e5e7eb;
}

.terminal-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.terminal-tab-close {
  font-size: 12px;
}

.terminal-tab-close:hover {
  color: #f87171;
}

.terminal-output {
  position: relative;
  flex: 1;
  overflow: auto;
  padding: 14px 16px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
}

.terminal-output pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.terminal-welcome {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 0 18px;
  color: #6b7280;
  line-height: 1.8;
}

.terminal-welcome-title {
  color: #9aa6b2;
  font-size: 15px;
  font-weight: 600;
}

.terminal-live-line {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 20px;
  margin-top: 2px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
}

.terminal-prompt {
  color: #3ddc97;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.terminal-typed {
  white-space: pre;
}

.terminal-cursor {
  width: 7px;
  height: 15px;
  background: #3ddc97;
  animation: terminal-blink 1s step-end infinite;
}

.terminal-cursor.hidden {
  visibility: hidden;
}

.terminal-busy {
  color: #6b7280;
  font-size: 11px;
}

.terminal-hidden-input {
  position: absolute;
  height: 1px;
  width: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

@keyframes terminal-blink {
  50% {
    opacity: 0;
  }
}
</style>
