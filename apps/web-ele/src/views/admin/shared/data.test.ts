import { describe, expect, it, vi } from 'vitest';

vi.mock('@vben/locales', () => ({ $t: (key: string) => key }));
vi.mock('#/adapter/form', () => ({ z: {} }));

import { useColumns as deptColumns } from '../dept/data';
import { useColumns as roleColumns } from '../role/data';
import { statusCellRender, statusOptions } from './data';

describe.each([
  ['role', roleColumns],
  ['department', deptColumns],
] as const)('%s deletion', (_, columns) => {
  it('does not reserve ID 1 for a built-in record', () => {
    const operation = columns(vi.fn())?.find(
      (column) => column.field === 'operation',
    );
    const remove = operation?.cellRender?.options?.find(
      (option) => option.code === 'delete',
    );
    expect(remove).toMatchObject({ code: 'delete', text: 'common.delete' });
    expect(remove).not.toHaveProperty('disabled');
  });

  it('does not show a combined tooltip over operation buttons', () => {
    expect(
      columns(vi.fn())?.find((column) => column.field === 'operation'),
    ).toHaveProperty('showOverflow', false);
  });
});

describe('organization status configuration', () => {
  it('uses numeric values for role and department status', () => {
    expect(statusOptions().map((option) => option.value)).toEqual([1, 0]);
    expect(statusCellRender().options).toEqual([
      expect.objectContaining({ value: 1, color: 'success' }),
      expect.objectContaining({ value: 0, color: 'error' }),
    ]);
  });

  it('does not expose the unused role data filter column', () => {
    expect(roleColumns(vi.fn())?.map((column) => column.field)).not.toContain(
      'is_filter_scopes',
    );
  });
});
