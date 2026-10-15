import { describe, expect, it } from 'vitest';

import {
  diskPercentage,
  formatDuration,
  formatNumber,
  parseMemoryBytes,
  usageColor,
} from './format';

describe('monitor formatting', () => {
  it('localizes duration units', () => {
    expect(formatDuration('1 day 2 hours 3 minutes 4 seconds')).toBe(
      '1 天 2 小时 3 分钟 4 秒',
    );
    expect(formatDuration('--')).toBe('--');
  });

  it.each([
    ['1KB', 1024],
    ['1.5M', 1.5 * 1024 ** 2],
    ['2 GiB', 2 * 1024 ** 3],
    ['12B', 12],
    ['invalid', 0],
  ])('parses memory %s', (value, bytes) =>
    expect(parseMemoryBytes(String(value))).toBe(bytes),
  );

  it('formats finite metrics and clamps disk usage', () => {
    expect(formatNumber(1234.567)).toBe('1,234.57');
    expect(formatNumber(Number.NaN)).toBe('--');
    expect(formatNumber(undefined)).toBe('--');
    expect(diskPercentage('72.5%')).toBe(72.5);
    expect(diskPercentage('200%')).toBe(100);
    expect(diskPercentage('-10')).toBe(0);
    expect(diskPercentage('N/A')).toBe(0);
    expect(usageColor(91)).toBe('var(--el-color-danger)');
    expect(usageColor(85)).toBe('var(--el-color-warning)');
    expect(usageColor(20)).toBe('var(--el-color-primary)');
    expect(usageColor(undefined)).toBeUndefined();
  });
});
