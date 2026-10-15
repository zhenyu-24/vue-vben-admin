import type { SysDeptResult, SysRoleResult } from '#/api';

import { describe, expect, it, vi } from 'vitest';

vi.mock('@vben/locales', () => ({ $t: (key: string) => key }));
vi.mock('#/api', () => ({ updateSysUserPermissionApi: vi.fn() }));

import {
  useAddSchema,
  useColumns,
  useEditSchema,
  useResetPwdSchema,
} from './data';

const departments: SysDeptResult[] = [
  {
    id: '2069061886627938310',
    name: 'Head Office',
    parent_id: null,
    sort: 0,
    status: 1,
    created_time: '',
    children: [
      {
        id: '2069061886627938311',
        name: 'Engineering',
        parent_id: '2069061886627938310',
        sort: 0,
        status: 1,
        created_time: '',
        children: null,
      },
    ],
  },
];

describe.each([
  ['edit', useEditSchema],
  ['add', useAddSchema],
] as const)('%s user department selection', (_, schema) => {
  it('keeps the entire department tree with selectable parents and children', () => {
    const field = schema([], departments).find(
      (item) => item.fieldName === 'dept_id',
    );
    expect(field?.component).toBe('TreeSelect');
    expect(field?.componentProps).toMatchObject({
      data: departments,
      nodeKey: 'id',
      props: { label: 'name', children: 'children' },
      checkStrictly: true,
      clearable: true,
      filterable: true,
    });
    expect(field?.componentProps).not.toHaveProperty('options');
  });

  it('supports an empty tree before options are loaded', () => {
    expect(
      schema().find((item) => item.fieldName === 'dept_id')?.componentProps,
    ).toMatchObject({ data: [] });
  });

  it('keeps inactive departments readable but not selectable without hiding active children', () => {
    const tree = [{ ...departments[0]!, status: 0 }];
    const props = schema([], tree).find((item) => item.fieldName === 'dept_id')
      ?.componentProps as {
      data: SysDeptResult[];
      props: { disabled: (department: SysDeptResult) => boolean };
    };
    expect(props.props.disabled(tree[0]!)).toBe(true);
    expect(props.props.disabled(tree[0]!.children![0]!)).toBe(false);
    expect(props.data).toBe(tree);
  });

  it('disables inactive roles without mutating the API result', () => {
    const roles = [1, 0].map((status, id) => ({
      id,
      name: `Role ${id}`,
      status,
      is_filter_scopes: false,
      created_time: '',
      updated_time: null,
    })) satisfies SysRoleResult[];
    expect(
      schema(roles).find((item) => item.fieldName === 'roles')?.componentProps,
    ).toMatchObject({
      options: [
        { id: 0, disabled: false },
        { id: 1, disabled: true },
      ],
    });
    expect(roles[1]).not.toHaveProperty('disabled');
  });
});

describe('user form modes', () => {
  it('only requests a password on creation and password reset', () => {
    expect(
      useEditSchema().some((field) => field.fieldName === 'password'),
    ).toBe(false);
    expect(
      useAddSchema().find((field) => field.fieldName === 'password'),
    ).toMatchObject({
      label: 'page.admin.userPage.form.password',
      rules: 'required',
    });
    expect(useResetPwdSchema()).toEqual([
      expect.objectContaining({
        fieldName: 'password',
        label: 'page.admin.userPage.form.newPassword',
      }),
    ]);
  });

  it('preserves mode-specific nickname validation', () => {
    expect(
      useEditSchema().find((field) => field.fieldName === 'nickname')?.rules,
    ).toBe('required');
    expect(
      useAddSchema().find((field) => field.fieldName === 'nickname')?.rules,
    ).toBeUndefined();
  });
});

describe('user table controls', () => {
  it.each(['status', 'is_superuser', 'is_staff', 'is_multi_login'])(
    'renders %s with inline state labels and a stable width',
    (field) => {
      const column = useColumns(vi.fn())?.find((item) => item.field === field);
      expect(column?.cellRender).toMatchObject({
        name: 'CellSwitch',
        props: {
          inlinePrompt: true,
          activeText: 'page.admin.userPage.status.enabledText',
          inactiveText: 'page.admin.userPage.status.disabledText',
          width: 76,
        },
      });
      if (field !== 'status') {
        expect(column?.cellRender?.props).toMatchObject({
          activeValue: true,
          inactiveValue: false,
        });
      }
    },
  );

  it('disables operation tooltips without removing delete confirmation', () => {
    const column = useColumns(vi.fn())?.find(
      (item) => item.field === 'operation',
    );
    expect(column?.showOverflow).toBe(false);
    expect(column?.cellRender?.options?.map((option) => option.code)).toEqual([
      'edit',
      'delete',
      'reset_password',
    ]);
  });
});
