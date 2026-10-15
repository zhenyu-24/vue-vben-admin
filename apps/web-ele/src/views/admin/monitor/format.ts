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
