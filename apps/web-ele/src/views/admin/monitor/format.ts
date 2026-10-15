export function formatDuration(value: string) {
  return value
    .replace(/\bdays?\b/gi, '天')
    .replace(/\bhours?\b/gi, '小时')
    .replace(/\bminutes?\b/gi, '分钟')
    .replace(/\bseconds?\b/gi, '秒');
}

export function parseMemoryBytes(value: string) {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*([BKMGT]?)(?:I?B)?$/i);
  if (!match?.[1]) return 0;
  const exponent = ['B', 'K', 'M', 'G', 'T'].indexOf(
    (match[2] || 'B').toUpperCase(),
  );
  return Number(match[1]) * 1024 ** exponent;
}
const numberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

export function formatNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? numberFormatter.format(value)
    : '--';
}

export function usageColor(value: unknown) {
  const usage = Number(value);
  if (!Number.isFinite(usage)) return undefined;
  if (usage >= 90) return 'var(--el-color-danger)';
  if (usage >= 80) return 'var(--el-color-warning)';
  return 'var(--el-color-primary)';
}

export function diskPercentage(value: unknown) {
  const usage = Number.parseFloat(String(value));
  return Number.isFinite(usage) ? Math.min(100, Math.max(0, usage)) : 0;
}
