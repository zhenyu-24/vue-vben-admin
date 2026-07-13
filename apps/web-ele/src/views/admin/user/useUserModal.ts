import type {
  SysAddUserParams,
  SysResetPasswordParams,
  SysUpdateUserParams,
} from '#/api';

import { ref } from 'vue';

import { $t } from '@vben/locales';

import { ElMessage } from 'element-plus';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createSysUserApi,
  resetSysUserPasswordApi,
  updateSysUserApi,
} from '#/api';
import {
  useAddSchema,
  useEditSchema,
  useResetPwdSchema,
} from './data';

export function useUserModals(onRefresh: () => void) {
  const editUserId = ref<number>(0);

  // --- 编辑用户 ---
  const [EditForm, editFormApi] = useVbenForm({
    showDefaultActions: false,
    schema: useEditSchema(),
  });

  const [editModal, editModalApi] = useVbenModal({
    destroyOnClose: true,
    async onConfirm() {
      const { valid } = await editFormApi.validate();
      if (valid) {
        editModalApi.lock();
        const data = await editFormApi.getValues<SysUpdateUserParams>();
        data.dept_id = data.dept_id ?? null;
        try {
          await updateSysUserApi(editUserId.value, data);
          ElMessage.success($t('page.admin.userPage.message.operationSuccess'));
          await editModalApi.close();
          onRefresh();
        } finally {
          editModalApi.unlock();
        }
      }
    },
    onOpenChange(isOpen) {
      if (isOpen) {
        const data = editModalApi.getData<any>();
        editFormApi.resetForm();
        if (data) {
          editFormApi.setValues({
            ...data,
            roles: data.roles?.map((item: any) => item.id) || [],
            dept_id: data.dept?.id ?? undefined,
          });
        }
      }
    },
  });

  // --- 添加用户 ---
  const [AddForm, addFormApi] = useVbenForm({
    showDefaultActions: false,
    schema: useAddSchema(),
  });

  const [addModal, addModalApi] = useVbenModal({
    destroyOnClose: true,
    async onConfirm() {
      const { valid } = await addFormApi.validate();
      if (valid) {
        addModalApi.lock();
        const data = await addFormApi.getValues<SysAddUserParams>();
        data.dept_id = data.dept_id ?? null;
        try {
          await createSysUserApi(data);
          ElMessage.success($t('page.admin.userPage.message.operationSuccess'));
          await addModalApi.close();
          onRefresh();
        } finally {
          addModalApi.unlock();
        }
      }
    },
    onOpenChange(isOpen) {
      if (isOpen) {
        addFormApi.resetForm();
      }
    },
  });

  // --- 重置密码 ---
  const [ResetPwdForm, resetPwdFormApi] = useVbenForm({
    layout: 'vertical',
    showDefaultActions: false,
    schema: useResetPwdSchema(),
  });

  const [resetPwdModal, resetPwdModalApi] = useVbenModal({
    destroyOnClose: true,
    centered: true,
    async onConfirm() {
      const { valid } = await resetPwdFormApi.validate();
      if (valid) {
        resetPwdModalApi.lock();
        const data = await resetPwdFormApi.getValues<SysResetPasswordParams>();
        try {
          await resetSysUserPasswordApi(editUserId.value, data);
          ElMessage.success($t('page.admin.userPage.message.operationSuccess'));
          await resetPwdModalApi.close();
        } finally {
          resetPwdModalApi.unlock();
        }
      }
    },
    onOpenChange(isOpen) {
      if (isOpen) {
        resetPwdFormApi.resetForm();
      }
    },
  });

  /** 动态设置 roles / dept 选项 */
  function setFormSelectOptions(
    roles: { label: string; value: any }[],
    depts: { label: string; value: any }[],
  ) {
    [editFormApi, addFormApi].forEach((api) => {
      const cur = [...(api.state?.schema ?? [])];
      cur.forEach((item, idx) => {
        if (item.fieldName === 'roles') {
          cur[idx] = { ...item, componentProps: { ...item.componentProps, options: roles } };
        } else if (item.fieldName === 'dept_id') {
          cur[idx] = { ...item, componentProps: { ...item.componentProps, options: depts } };
        }
      });
      api.setState({ schema: cur });
    });
  }

  /** 更新国际化 schema */
  function updateSchemas() {
    editFormApi.setState({ schema: useEditSchema() });
    addFormApi.setState({ schema: useAddSchema() });
    resetPwdFormApi.setState({ schema: useResetPwdSchema() });
  }

  return {
    // 编辑用户
    EditForm,
    editFormApi,
    editModalApi,
    editUserId,
    // 添加用户
    AddForm,
    addFormApi,
    addModalApi,
    // 重置密码
    ResetPwdForm,
    resetPwdFormApi,
    resetPwdModalApi,
    // 工具方法
    setFormSelectOptions,
    updateSchemas,
  };
}
