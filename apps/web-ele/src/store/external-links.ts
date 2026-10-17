import type { ExternalLinkRecord } from '#/api/core/external-links';

import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

import { getExternalLinksApi } from '#/api/core/external-links';
import { buildExternalLinkTree } from '#/utils/external-links';

export const useExternalLinksStore = defineStore('external-links', () => {
  const records = ref<ExternalLinkRecord[]>([]);
  const available = ref(true);
  const tree = computed(() => buildExternalLinkTree(records.value));

  async function load() {
    try {
      records.value = await getExternalLinksApi();
      available.value = true;
    } catch (error) {
      const failure = error as {
        code?: number;
        response?: { status?: number };
      };
      const status = failure.response?.status ?? failure.code;
      if (status !== 404 && status !== 503) throw error;
      records.value = [];
      available.value = false;
    }
  }

  function $reset() {
    records.value = [];
    available.value = true;
  }

  return { $reset, available, load, records, tree };
});
