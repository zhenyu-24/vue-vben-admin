import type { SysDeptParams, SysDeptResult } from '#/api';
import type { SysId } from '#/types/api';

export function findParentId(
  tree: SysDeptResult[],
  id: SysId,
  parentId?: SysId,
): null | SysId | undefined {
  for (const node of tree) {
    if (String(node.id) === String(id)) return parentId ?? node.parent_id;
    const found = findParentId(node.children ?? [], id, node.id);
    if (found !== undefined) return found;
  }
}

export function getParentOptions(
  tree: SysDeptResult[],
  editingId?: SysId,
): SysDeptResult[] {
  return tree
    .filter((node) => String(node.id) !== String(editingId))
    .map((node) => ({
      ...node,
      children: getParentOptions(node.children ?? [], editingId),
    }));
}

export function toDeptPayload(values: SysDeptParams): SysDeptParams {
  return {
    name: values.name.trim(),
    parent_id: values.parent_id === '' ? null : (values.parent_id ?? null),
    sort: values.sort ?? 0,
    leader: values.leader?.trim() || null,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    status: values.status,
  };
}
