import type {
  VbenFormProps as FormProps,
  VbenFormSchema as FormSchema,
} from '@vben/common-ui';

import type { ComponentPropsMap, ComponentType } from './component';

import { setupVbenForm, useVbenForm as useForm, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

// 表单初始化（注册全局规则 + 组件映射）
async function initSetupVbenForm() {
  setupVbenForm<ComponentType>({
    config: {
      // 映射不同组件的值绑定属性名
      modelPropNameMap: {
        Checkbox: 'checked',
        Radio: 'checked',
        Switch: 'checked',
        Upload: 'fileList',
        CheckboxGroup: 'model-value',
      },
    },
    defineRules: {
      // 输入项目必填国际化适配
      required: (value, _params, ctx) => {
        if (value === undefined || value === null || value.length === 0) {
          return $t('ui.formRules.required', [ctx.label]);
        }
        return true;
      },
      // 选择项目必填国际化适配
      selectRequired: (value, _params, ctx) => {
        if (value === undefined || value === null) {
          return $t('ui.formRules.selectRequired', [ctx.label]);
        }
        return true;
      },
    },
  });
}

//  表单 Hook（创建表单实例）
// 返回一个元组：
// - [0] — Form 组件（渲染到模板里）
// - [1] — FormApi 实例（操作表单的编程接口）
const useVbenForm = useForm<ComponentType, ComponentPropsMap>;

export { initSetupVbenForm, useVbenForm, z };

// 表单项定义的类型(表单项的结构: fieldName, label, component等)
export type VbenFormSchema = FormSchema<ComponentType, ComponentPropsMap>;
// 表单整体属性的类型(布局、行为、回调、表单项、按钮等)
export type VbenFormProps = FormProps<ComponentType, ComponentPropsMap>;
