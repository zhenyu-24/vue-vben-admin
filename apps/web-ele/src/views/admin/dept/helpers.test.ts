import type { SysDeptResult } from '#/api';

import { describe, expect, it } from 'vitest';

import { findParentId, getParentOptions, toDeptPayload } from './helpers';

function department(
  id: number | string,
  children?: SysDeptResult[],
): SysDeptResult {
  return {
    id,
    children,
    name: `Dept ${id}`,
    parent_id: null,
    sort: 0,
    status: 1,
    created_time: '',
  };
}

describe('department editing', () => {
  it('resolves exact parent IDs from tree links instead of rounded foreign keys', () => {
    const parent = '2048601264366944257';
    const child = '2048601264366944258';
    const tree = [
      department(parent, [{ ...department(child), parent_id: Number(parent) }]),
    ];
    expect(String(tree[0]?.children?.[0]?.parent_id)).not.toBe(parent);
    expect(findParentId(tree, child)).toBe(parent);
    expect(findParentId(tree, parent)).toBeNull();
    expect(findParentId(tree, 'missing')).toBeUndefined();
  });

  it('preserves a parent outside the visible tree instead of clearing the association', () => {
    const orphan = { ...department(2), parent_id: 'hidden-parent' };
    expect(findParentId([orphan], 2)).toBe('hidden-parent');
  });

  it('excludes the edited department and its descendants without mutating the tree', () => {
    const child = department(2, [department(3)]);
    const tree = [department(1, [child, department(4)]), department(5)];
    expect(
      getParentOptions(tree, '2')[0]?.children?.map((item) => item.id),
    ).toEqual([4]);
    expect(tree[0]?.children).toHaveLength(2);
    expect(child.children).toHaveLength(1);
  });

  it('keeps all parents for a new department and accepts null children', () => {
    expect(getParentOptions([{ ...department(1), children: null }])).toEqual([
      department(1, []),
    ]);
  });

  it('submits null for cleared optional fields and preserves zero and disabled status', () => {
    expect(
      toDeptPayload({
        name: ' Dept ',
        parent_id: '',
        sort: 0,
        status: 0,
        phone: ' ',
        email: '',
        leader: undefined,
      }),
    ).toEqual({
      name: 'Dept',
      parent_id: null,
      sort: 0,
      status: 0,
      phone: null,
      email: null,
      leader: null,
    });
  });

  it('preserves string identifiers and sends only writable fields', () => {
    const source = {
      ...department('2069061886627938311'),
      parent_id: '2069061886627938310',
      phone: '13800138000',
    };
    expect(toDeptPayload(source)).toEqual({
      name: source.name,
      parent_id: source.parent_id,
      sort: 0,
      status: 1,
      phone: source.phone,
      leader: null,
      email: null,
    });
  });
});
