import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }));

import { ElMessage } from 'element-plus';

import { useFormSubmit } from './useFormSubmit';

function setup() {
  const form = {
    validate: vi.fn().mockResolvedValue({ valid: true }),
    getValues: vi.fn().mockResolvedValue({ name: 'Test' }),
  };
  const modal = {
    lock: vi.fn(),
    unlock: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const save = vi.fn().mockResolvedValue(undefined);
  const onSuccess = vi.fn().mockResolvedValue(undefined);
  const canSubmit = vi.fn().mockReturnValue(true);
  const submit = useFormSubmit({
    form: () =>
      form as unknown as ReturnType<
        Parameters<typeof useFormSubmit>[0]['form']
      >,
    modal: () =>
      modal as unknown as ReturnType<
        Parameters<typeof useFormSubmit>[0]['modal']
      >,
    save,
    canSubmit,
    onSuccess,
    successMessage: () => 'Saved',
  });
  return { form, modal, save, onSuccess, canSubmit, submit };
}

beforeEach(() => vi.clearAllMocks());

describe('admin form submission', () => {
  it('validates, saves values, closes and refreshes exactly once', async () => {
    const { form, modal, save, onSuccess, submit } = setup();
    await submit();
    expect(form.validate).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith({ name: 'Test' });
    expect(modal.lock).toHaveBeenCalledOnce();
    expect(modal.close).toHaveBeenCalledOnce();
    expect(modal.unlock).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(ElMessage.success).toHaveBeenCalledWith('Saved');
  });

  it('does not submit unready or invalid forms', async () => {
    const { form, save, canSubmit, submit } = setup();
    canSubmit.mockReturnValueOnce(false);
    await submit();
    expect(form.validate).not.toHaveBeenCalled();
    form.validate.mockResolvedValueOnce({ valid: false });
    await submit();
    expect(save).not.toHaveBeenCalled();
  });

  it('blocks duplicate requests even while validation is pending', async () => {
    const { form, save, submit } = setup();
    let resolve!: (result: { valid: boolean }) => void;
    form.validate.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const first = submit();
    await submit();
    expect(form.validate).toHaveBeenCalledOnce();
    resolve({ valid: true });
    await first;
    expect(save).toHaveBeenCalledOnce();
  });

  it.each(['validation', 'save'])(
    'unlocks after %s failure, keeps the modal and permits retry',
    async (failure) => {
      const { form, modal, save, onSuccess, submit } = setup();
      (failure === 'validation' ? form.validate : save).mockRejectedValueOnce(
        new Error('Failed'),
      );
      await submit();
      expect(modal.close).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(modal.unlock).toHaveBeenCalledOnce();
      await submit();
      expect(modal.close).toHaveBeenCalledOnce();
    },
  );
});
