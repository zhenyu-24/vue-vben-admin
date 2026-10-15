import type { Ref, ShallowRef } from 'vue';

import { onScopeDispose, ref, shallowRef } from 'vue';

interface AsyncResource<T> {
  data: ShallowRef<T>;
  loading: Ref<boolean>;
  failed: Ref<boolean>;
  refresh: () => Promise<void>;
  invalidate: () => void;
}

export function useAsyncResource<T>(
  load: () => Promise<T>,
  initialValue: T,
): AsyncResource<T>;
export function useAsyncResource<T>(
  load: () => Promise<T>,
): AsyncResource<T | undefined>;
export function useAsyncResource<T>(
  load: () => Promise<T>,
  initialValue?: T,
): AsyncResource<T | undefined> {
  const data = shallowRef(initialValue);
  const loading = ref(false);
  const failed = ref(false);
  let version = 0;

  function invalidate() {
    version++;
    loading.value = false;
    failed.value = false;
  }

  async function refresh() {
    const current = ++version;
    loading.value = true;
    failed.value = false;
    try {
      const result = await load();
      if (current === version) data.value = result;
    } catch {
      if (current === version) failed.value = true;
    } finally {
      if (current === version) loading.value = false;
    }
  }

  onScopeDispose(invalidate);
  return { data, loading, failed, refresh, invalidate };
}
