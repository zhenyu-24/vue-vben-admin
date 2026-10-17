import type {
  ExternalLinkNode,
  ExternalLinkRecord,
} from '#/api/core/external-links';

import { useAppConfig } from '@vben/hooks';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

export function externalLinkIcon(icon = '') {
  if (icon.startsWith('/static/upload/')) {
    return new URL(icon, new URL(apiURL, window.location.origin)).href;
  }
  return icon || 'lucide:globe';
}

export function externalLinkPath(id: number | string) {
  return `/external-pages/page/${id}`;
}

export function externalGroupPath(id: number | string) {
  return `/external-pages/group/${id}`;
}

export function isSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !!url.hostname &&
      !url.username &&
      !url.password &&
      !/[\s\\]/u.test(value) &&
      ![...value].some((char) => char.charCodeAt(0) < 32)
    );
  } catch {
    return false;
  }
}

export function buildExternalLinkTree(records: ExternalLinkRecord[]) {
  const nodes = new Map(
    records.map((record) => [
      String(record.id),
      { ...record, children: [] } as ExternalLinkNode,
    ]),
  );
  const roots: ExternalLinkNode[] = [];
  for (const node of nodes.values()) {
    const visited = new Set([String(node.id)]);
    let ancestor = node.parent_id;
    let valid = true;
    while (ancestor !== null) {
      const parent = nodes.get(String(ancestor));
      if (!parent || parent.kind !== 'group' || visited.has(String(ancestor))) {
        valid = false;
        break;
      }
      visited.add(String(ancestor));
      ancestor = parent.parent_id;
    }
    if (!valid) continue;
    if (node.parent_id === null) roots.push(node);
    else nodes.get(String(node.parent_id))?.children.push(node);
  }
  function sort(items: ExternalLinkNode[]) {
    items.sort(
      (a, b) => a.sort - b.sort || String(a.id).localeCompare(String(b.id)),
    );
    items.forEach((item) => sort(item.children));
  }
  sort(roots);
  return roots;
}
