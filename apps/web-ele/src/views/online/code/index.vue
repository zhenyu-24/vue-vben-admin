<script setup lang="ts">
import type { CommandResult } from '#/api/opensandbox';

import { computed, onMounted, ref, watch } from 'vue';

import { DocumentCopy, Promotion, RefreshLeft, Select } from '@element-plus/icons-vue';
import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';
import {
  ElButton,
  ElEmpty,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElSplitter,
  ElSplitterPanel,
  ElTag,
} from 'element-plus';
import CodeMirror from 'vue-codemirror6';

import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';

import { executeCommandApi, readFileApi, writeFileApi } from '#/api/opensandbox';

import OpenSandboxToolbar from '../shared/OpenSandboxToolbar.vue';
import RemoteFileTree from '../shared/RemoteFileTree.vue';
import { useOpenSandbox } from '../shared/useOpenSandbox';

defineOptions({ name: 'OnlineCode' });

interface LanguageOption {
  command: string;
  compile: null | string;
  extension: string;
  label: string;
  value: string;
}

const languages: LanguageOption[] = [
  { command: 'python3', compile: null, extension: 'py', label: 'Python', value: 'python' },
  { command: 'node', compile: null, extension: 'js', label: 'JavaScript', value: 'javascript' },
  { command: 'npx tsx', compile: 'npx tsc --noEmit', extension: 'ts', label: 'TypeScript', value: 'typescript' },
  { command: 'java', compile: 'javac', extension: 'java', label: 'Java', value: 'java' },
  { command: 'go run', compile: 'go build -o /tmp/opensandbox-build', extension: 'go', label: 'Go', value: 'go' },
  { command: 'gcc', compile: 'gcc', extension: 'c', label: 'C', value: 'c' },
  { command: 'g++', compile: 'g++', extension: 'cpp', label: 'C++', value: 'cpp' },
  { command: 'bash', compile: null, extension: 'sh', label: 'Bash', value: 'bash' },
  { command: 'sqlite3 :memory:', compile: null, extension: 'sql', label: 'SQL', value: 'sql' },
];

const samples: Record<string, string> = {
  python: `# OpenSandbox 在线代码运行\n\ndef greet(name: str) -> str:\n    return f"你好，{name}!"\n\nprint(greet("Python 开发者"))\nprint("平方数:", [x * x for x in range(1, 6)])\n`,
  javascript: `const numbers = [1, 2, 3, 4, 5];\nconsole.log("平方数:", numbers.map((x) => x * x));\n`,
  typescript: `const numbers: number[] = [1, 2, 3, 4, 5];\nconsole.log("平方数:", numbers.map((x) => x * x));\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello OpenSandbox");\n    }\n}\n`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello OpenSandbox")\n}\n`,
  c: `#include <stdio.h>\n\nint main(void) {\n    printf("Hello OpenSandbox\\n");\n    return 0;\n}\n`,
  cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello OpenSandbox" << std::endl;\n    return 0;\n}\n`,
  bash: `echo "Hello OpenSandbox"\n`,
  sql: `select 'Hello OpenSandbox' as message;\n`,
};

const { initialize, loading, selectedId, selectedSandbox, workspaceRoot } = useOpenSandbox();
const { isDark } = usePreferences();
const language = ref('python');
const filename = ref('main.py');
const code = ref(samples.python || '');
const output = ref('');
const outputStatus = ref<'failed' | 'idle' | 'running' | 'success'>('idle');
const saving = ref(false);
const running = ref(false);
const editorExtensions = computed(() => (isDark.value ? [oneDark] : []));

const currentLanguage = computed(
  () => languages.find((item) => item.value === language.value) || languages[0]!,
);
const editorLang = computed(() => {
  if (language.value === 'sql') return sql();
  if (language.value === 'python') return python();
  return undefined;
});
const fullPath = computed(() => {
  const name = filename.value.trim() || `main.${currentLanguage.value.extension}`;
  return name.startsWith('/') ? name : `${workspaceRoot.value}/${name}`;
});

onMounted(initialize);

watch(
  selectedId,
  () => {
    output.value = '';
    outputStatus.value = 'idle';
  },
  { immediate: true },
);

watch(language, (value, oldValue) => {
  const option = languages.find((item) => item.value === value);
  const oldOption = languages.find((item) => item.value === oldValue);
  if (!option) return;
  if (filename.value === `main.${oldOption?.extension}` || !filename.value) {
    filename.value = `main.${option.extension}`;
  }
  if (code.value === samples[oldValue || '']) {
    code.value = samples[value] || '';
  }
});

async function save() {
  if (!selectedId.value) return false;
  saving.value = true;
  try {
    await writeFileApi(selectedId.value, { content: code.value, path: fullPath.value });
    ElMessage.success('源码已保存');
    return true;
  } catch (error: any) {
    ElMessage.error(error?.message || String(error));
    return false;
  } finally {
    saving.value = false;
  }
}


function detectLanguage(path: string) {
  const extension = path.split('.').pop()?.toLowerCase();
  const found = languages.find((item) => item.extension === extension);
  if (found) language.value = found.value;
  filename.value = path;
}

async function openFileFromTree(path: string) {
  if (!selectedId.value) return;
  try {
    const result = await readFileApi(selectedId.value, path);
    if (result.is_binary) {
      ElMessage.warning('二进制文件无法在线编辑');
      return;
    }
    detectLanguage(path);
    code.value = result.content;
    output.value = '';
    outputStatus.value = 'idle';
  } catch (error: any) {
    ElMessage.error(error?.message || String(error));
  }
}
async function loadFile() {
  if (!selectedId.value) return;
  try {
    const result = await readFileApi(selectedId.value, fullPath.value);
    if (result.is_binary) {
      ElMessage.warning('二进制文件无法在线编辑');
      return;
    }
    code.value = result.content;
    output.value = '';
    outputStatus.value = 'idle';
  } catch (error: any) {
    ElMessage.error(error?.message || String(error));
  }
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function buildCommand(compileOnly: boolean): null | string {
  const option = currentLanguage.value;
  const file = shellQuote(fullPath.value);
  if (compileOnly) {
    if (!option.compile) return null;
    if (option.value === 'java') return `javac ${file}`;
    if (option.value === 'c') return `gcc ${file} -o /tmp/opensandbox-build`;
    if (option.value === 'cpp') return `g++ ${file} -o /tmp/opensandbox-build`;
    if (option.value === 'go') return `go build -o /tmp/opensandbox-build ${file}`;
    if (option.value === 'typescript') return `npx tsc --noEmit ${file}`;
    return null;
  }
  switch (option.value) {
    case 'java': {
      const className = (filename.value.split('/').pop() || 'Main').replace(/\.java$/, '');
      return `javac ${file} && java ${shellQuote(className)}`;
    }
    case 'c': {
      return `gcc ${file} -o /tmp/opensandbox-build && /tmp/opensandbox-build`;
    }
    case 'cpp': {
      return `g++ ${file} -o /tmp/opensandbox-build && /tmp/opensandbox-build`;
    }
    case 'go': {
      return `go run ${file}`;
    }
    case 'typescript': {
      return `npx tsx ${file}`;
    }
    case 'sql': {
      return `sqlite3 :memory: < ${file}`;
    }
    default: {
      return `${option.command} ${file}`;
    }
  }
}

async function run(compileOnly = false) {
  if (!selectedId.value || running.value) return;
  const command = buildCommand(compileOnly);
  if (!command) {
    ElMessage.info('该语言没有单独的编译步骤，请直接运行');
    return;
  }
  const saved = await save();
  if (!saved) return;
  running.value = true;
  outputStatus.value = 'running';
  output.value = `$ ${command}\n\n`;
  try {
    const result: CommandResult = await executeCommandApi(selectedId.value, {
      command,
      cwd: workspaceRoot.value,
      source: 'code',
      timeout_seconds: 600,
    });
    output.value += `${result.stdout}${result.stderr}`;
    if (result.stdout && !result.stdout.endsWith('\n')) output.value += '\n';
    if (result.truncated) output.value += '\n[输出已截断]\n';
    outputStatus.value = result.exit_code === 0 ? 'success' : 'failed';
  } catch (error: any) {
    outputStatus.value = 'failed';
    output.value += error?.message || String(error);
    ElMessage.error(error?.message || String(error));
  } finally {
    running.value = false;
  }
}

async function copyCode() {
  await navigator.clipboard.writeText(code.value);
  ElMessage.success('代码已复制');
}

function clearOutput() {
  output.value = '';
  outputStatus.value = 'idle';
}
</script>

<template>
  <Page auto-content-height>
    <div class="code-page">
      <OpenSandboxToolbar />

      <el-empty v-if="!loading && !selectedSandbox" description="请先创建一个沙盒" />

      <div v-else class="code-shell">
        <div class="code-toolbar">
          <div class="code-language">
            <span class="code-label">语言</span>
            <el-select v-model="language" class="language-select" size="small">
              <el-option v-for="item in languages" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-input v-model="filename" class="filename-input" size="small" />
          </div>
          <div class="code-actions">
            <el-button size="small" :icon="RefreshLeft" @click="loadFile">读取</el-button>
            <el-button size="small" :icon="DocumentCopy" @click="copyCode">复制</el-button>
            <el-button size="small" :loading="saving" :icon="Select" @click="save">保存</el-button>
            <el-button size="small" :loading="running" @click="run(true)">编译</el-button>
            <el-button type="primary" size="small" :loading="running" :icon="Promotion" @click="run(false)">
              运行
            </el-button>
          </div>
        </div>

        <div class="code-workbench">
          <el-splitter class="workbench-split" layout="horizontal">
            <el-splitter-panel max="420px" min="160px" size="240px">
              <aside class="file-pane">
                <RemoteFileTree
                  :sandbox-id="selectedId"
                  :workspace-root="workspaceRoot"
                  @open="openFileFromTree"
                />
              </aside>
            </el-splitter-panel>
            <el-splitter-panel min="280px">
              <el-splitter class="editor-output-split" layout="vertical">
                <el-splitter-panel min="25%" size="72%">
                  <section class="editor-pane">
                    <div class="pane-title">
                      <span class="dot python-dot" />
                      {{ currentLanguage.label }} 编辑器
                      <span class="pane-path">{{ fullPath }}</span>
                    </div>
                    <div class="editor-wrap">
                      <CodeMirror
                        v-model="code"
                        :dark="isDark"
                        :extensions="editorExtensions"
                        :lang="editorLang"
                        basic
                        wrap
                      />
                    </div>
                  </section>
                </el-splitter-panel>
                <el-splitter-panel min="15%">
                  <section class="output-pane">
                    <div class="pane-title output-title">
                      <span>输出：</span>
                      <div class="output-actions">
                        <el-tag
                          v-if="outputStatus !== 'idle'"
                          :type="outputStatus === 'success' ? 'success' : outputStatus === 'failed' ? 'danger' : 'warning'"
                          size="small"
                        >
                          {{ outputStatus === 'running' ? '运行中' : outputStatus === 'success' ? '成功' : '失败' }}
                        </el-tag>
                        <el-button text size="small" @click="clearOutput">清空</el-button>
                      </div>
                    </div>
                    <pre v-if="output" class="output-text">{{ output }}</pre>
                    <div v-else class="output-empty">输出将显示在这里...</div>
                  </section>
                </el-splitter-panel>
              </el-splitter>
            </el-splitter-panel>
          </el-splitter>
        </div>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.code-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.code-shell {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.code-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 10px 12px;
}

.code-language,
.code-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.code-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.language-select {
  width: 150px;
}

.filename-input {
  width: 190px;
}

.code-workbench {
  display: flex;
  min-height: 0;
  flex: 1;
}

.file-pane {
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.workbench-split {
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1;
}

.workbench-split :deep(.el-splitter-panel) {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.editor-pane,
.output-pane {
  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
}

.editor-pane {
  border-bottom: 0;
}

.editor-output-split {
  height: 100%;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.editor-output-split :deep(.el-splitter-panel) {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.editor-output-split :deep(.el-splitter-bar__dragger-vertical:before) {
  height: 2px;
}

.editor-output-split :deep(.el-splitter-bar__dragger-vertical:after) {
  height: 2px;
}

.pane-title {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 0 14px;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
}

.pane-path {
  margin-left: auto;
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 400;
}

.dot {
  height: 8px;
  width: 8px;
  border-radius: 999px;
  background: var(--el-color-primary);
}

.editor-wrap {
  min-height: 0;
  flex: 1;
  overflow: hidden;
  background: var(--el-bg-color);
}

.editor-wrap :deep(.cm-editor) {
  height: 100%;
}

.editor-wrap :deep(.cm-scroller) {
  overflow: auto;
}

.output-title {
  justify-content: space-between;
  font-size: 18px;
}

.output-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.output-text {
  margin: 0;
  flex: 1;
  overflow: auto;
  background: var(--el-fill-color-lighter);
  padding: 16px;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.65;
}

.output-empty {
  display: flex;
  flex: 1;
  align-items: flex-start;
  background: var(--el-fill-color-lighter);
  padding: 22px 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

@media (max-width: 800px) {
  .workbench-split {
    min-width: 480px;
  }
}
</style>
