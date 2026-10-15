import { describe, expect, it } from 'vitest';

import { collectTreeIds, mergeCheckedIds, sameIds } from './helpers';

describe('role permissions', () => {
  it('collects all menu and button IDs, including string IDs and null children', () => {
    expect(
      collectTreeIds([
        { id: 1, children: [{ id: '2069061886627938311', children: null }] },
      ]),
    ).toEqual([1, '2069061886627938311']);
    expect(collectTreeIds(null)).toEqual([]);
  });

  it('includes partially checked ancestors and deduplicates equivalent identifiers', () => {
    expect(mergeCheckedIds([2, 3, '3'], [1, 2])).toEqual([2, '3', 1]);
    expect(mergeCheckedIds([])).toEqual([]);
  });

  it('detects removal, addition and clearing without depending on order or ID serialization', () => {
    expect(sameIds([1, '2'], [2, '1'])).toBe(true);
    expect(sameIds([1, 1], [1])).toBe(true);
    expect(sameIds([1, 2], [1])).toBe(false);
    expect(sameIds([], [1])).toBe(false);
    expect(sameIds([], [])).toBe(true);
  });
});
