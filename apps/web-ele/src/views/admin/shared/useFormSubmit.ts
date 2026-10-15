import type { useVbenModal } from '@vben/common-ui';

import type { useVbenForm } from '#/adapter/form';

import { ElMessage } from 'element-plus';

interface FormSubmitOptions<T> {
  form: () => ReturnType<typeof useVbenForm>[1];
  modal: () => ReturnType<typeof useVbenModal>[1];
  save: (values: T) => Promise<unknown>;
  successMessage: () => string;
  canSubmit?: () => boolean;
  onSuccess?: () => Promise<unknown>;
}

export function useFormSubmit<T extends Record<string, any>>(
  options: FormSubmitOptions<T>,
): () => Promise<void> {
  let submitting = false;

  return async () => {
    if (submitting || options.canSubmit?.() === false) return;
    submitting = true;
    const modal = options.modal();
    try {
      const form = options.form();
      if (!(await form.validate()).valid) return;
      modal.lock();
      await options.save(await form.getValues<T>());
      ElMessage.success(options.successMessage());
      await modal.close();
      await options.onSuccess?.();
    } catch {
      // API errors are displayed by the request interceptor; retain input for retry.
    } finally {
      modal.unlock();
      submitting = false;
    }
  };
}
