import type { SysId } from '#/types/api';

interface IdTree {
  id: SysId;
  children?: IdTree[] | null;
}

export function collectTreeIds(tree: IdTree[] | null): SysId[] {
  return (tree ?? []).flatMap((node) => [
    node.id,
    ...collectTreeIds(node.children ?? []),
  ]);
}

export function mergeCheckedIds(
  checked: SysId[],
  halfChecked: SysId[] = [],
): SysId[] {
  return [
    ...new Map(
      [...checked, ...halfChecked].map((id) => [String(id), id]),
    ).values(),
  ];
}

export function sameIds(left: SysId[], right: SysId[]): boolean {
  const leftSet = new Set(left.map(String));
  const rightSet = new Set(right.map(String));
  return (
    leftSet.size === rightSet.size &&
    [...leftSet].every((id) => rightSet.has(id))
  );
}
