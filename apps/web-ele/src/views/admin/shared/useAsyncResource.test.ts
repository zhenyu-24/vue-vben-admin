import { effectScope } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import { useAsyncResource } from './useAsyncResource';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('admin async resource', () => {
  it('loads on request, retains previous data on failure and allows retry', async () => {
    const scope = effectScope();
    const load = vi
      .fn()
      .mockResolvedValueOnce(['first'])
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(['retry']);
    const resource = scope.run(() => useAsyncResource(load, []))!;
    expect(load).not.toHaveBeenCalled();
    await resource.refresh();
    expect(resource.data.value).toEqual(['first']);
    await resource.refresh();
    expect(resource.data.value).toEqual(['first']);
    expect(resource.failed.value).toBe(true);
    expect(resource.loading.value).toBe(false);
    await resource.refresh();
    expect(resource.data.value).toEqual(['retry']);
    expect(resource.failed.value).toBe(false);
    scope.stop();
  });

  it('ignores stale failures while the latest request is loading', async () => {
    const scope = effectScope();
    const old = deferred<string>();
    const latest = deferred<string>();
    const load = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise);
    const resource = scope.run(() => useAsyncResource(load))!;
    const first = resource.refresh();
    const second = resource.refresh();
    old.reject(new Error('Stale error'));
    await first;
    expect(resource.failed.value).toBe(false);
    expect(resource.loading.value).toBe(true);
    latest.resolve('latest');
    await second;
    expect(resource.data.value).toBe('latest');
    expect(resource.loading.value).toBe(false);
    scope.stop();
  });

  it('does not let an older success overwrite the latest result', async () => {
    const scope = effectScope();
    const old = deferred<string>();
    const latest = deferred<string>();
    const load = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise);
    const resource = scope.run(() => useAsyncResource(load))!;
    const first = resource.refresh();
    const second = resource.refresh();
    latest.resolve('latest');
    await second;
    old.resolve('stale');
    await first;
    expect(resource.data.value).toBe('latest');
    scope.stop();
  });

  it.each(['invalidate', 'dispose'])(
    'does not apply a response after %s',
    async (action) => {
      const scope = effectScope();
      const pending = deferred<number>();
      const resource = scope.run(() =>
        useAsyncResource(() => pending.promise, 0),
      )!;
      const request = resource.refresh();
      if (action === 'dispose') scope.stop();
      else resource.invalidate();
      pending.resolve(42);
      await request;
      expect(resource.data.value).toBe(0);
      expect(resource.loading.value).toBe(false);
      scope.stop();
    },
  );
});
