import type {
  SysAddUserParams,
  SysDeptResult,
  SysResetPasswordParams,
  SysRoleResult,
  SysUserResult,
} from '#/api';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useVbenForm } from '#/adapter/form';
import {
  createSysUserApi,
  getAllSysDeptApi,
  getAllSysRoleApi,
  resetSysUserPasswordApi,
  updateSysUserApi,
} from '#/api';

import { useFormSubmit } from '../shared/useFormSubmit';
import { useAddSchema, useEditSchema, useResetPwdSchema } from './data';
import { toUserPayload } from './helpers';

export function useUserModals(onRefresh: () => Promise<void>) {
  const editing = ref<SysUserResult>();
  const ready = ref(false);
  let openVersion = 0;
  let roleOptions: SysRoleResult[] = [];
  let departmentOptions: SysDeptResult[] = [];
  const userModalTitle = computed(() =>
    $t(
      editing.value
        ? 'page.admin.userPage.modal.edit'
        : 'page.admin.userPage.modal.add',
    ),
  );
  const [UserForm, userFormApi] = useVbenForm({
    showDefaultActions: false,
    schema: useAddSchema(),
  });
  const [UserModal, userModalApi] = useVbenModal({
    destroyOnClose: true,
    async onOpenChange(isOpen) {
      const version = ++openVersion;
      if (!isOpen) return;
      const data = userModalApi.getData<Partial<SysUserResult>>();
      editing.value =
        data.id === undefined ? undefined : (data as SysUserResult);
      ready.value = false;
      userModalApi.setState({ loading: true, confirmDisabled: true });
      try {
        updateSchemas();
        await userFormApi.resetForm();
        const [roles, departments] = await Promise.all([
          getAllSysRoleApi(),
          getAllSysDeptApi(),
        ]);
        if (version !== openVersion) return;
        roleOptions = roles;
        departmentOptions = departments;
        updateSchemas();
        await userFormApi.setValues({
          username: data.username ?? '',
          nickname: data.nickname ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          roles: data.roles?.map((role) => role.id) ?? [],
          dept_id: data.dept?.id ?? data.dept_id ?? undefined,
        });
        ready.value = true;
        userModalApi.setState({ confirmDisabled: false });
      } catch {
        if (version === openVersion) await userModalApi.close();
      } finally {
        if (version === openVersion) userModalApi.setState({ loading: false });
      }
    },
    onConfirm: useFormSubmit<SysAddUserParams>({
      form: () => userFormApi,
      modal: (): ReturnType<typeof useVbenModal>[1] => userModalApi,
      canSubmit: () => ready.value,
      async save(values) {
        const data = toUserPayload({
          ...values,
          avatar: editing.value?.avatar,
        });
        await (editing.value
          ? updateSysUserApi(editing.value.id, data)
          : createSysUserApi({ ...data, password: values.password }));
      },
      successMessage: () => $t('page.admin.userPage.message.operationSuccess'),
      onSuccess: onRefresh,
    }),
  });

  const [ResetPwdForm, resetPwdFormApi] = useVbenForm({
    layout: 'vertical',
    showDefaultActions: false,
    schema: useResetPwdSchema(),
  });

  const [ResetPwdModal, resetPwdModalApi] = useVbenModal({
    destroyOnClose: true,
    centered: true,
    onConfirm: useFormSubmit<SysResetPasswordParams>({
      form: () => resetPwdFormApi,
      modal: (): ReturnType<typeof useVbenModal>[1] => resetPwdModalApi,
      async save(data) {
        const { id } = resetPwdModalApi.getData<SysUserResult>();
        await resetSysUserPasswordApi(id, data);
      },
      successMessage: () => $t('page.admin.userPage.message.operationSuccess'),
    }),
    async onOpenChange(isOpen) {
      if (isOpen) await resetPwdFormApi.resetForm();
    },
  });

  function updateSchemas() {
    userFormApi.setState({
      schema: (editing.value ? useEditSchema : useAddSchema)(
        roleOptions,
        departmentOptions,
      ),
    });
    resetPwdFormApi.setState({ schema: useResetPwdSchema() });
  }

  return {
    UserForm,
    UserModal,
    userModalApi,
    userModalTitle,
    ResetPwdForm,
    ResetPwdModal,
    resetPwdModalApi,
    updateSchemas,
  };
}
