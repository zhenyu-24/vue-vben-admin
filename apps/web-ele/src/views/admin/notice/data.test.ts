import { describe, expect, it } from 'vitest';

import { noticeValues } from './data';

describe('notice form values', () => {
  it('starts every new notice with clean defaults', () => {
    expect(noticeValues()).toEqual({
      title: '',
      content: '',
      type: 0,
      status: 1,
    });
    expect(noticeValues(null)).toEqual(noticeValues());
  });

  it('preserves explicit zero values and excludes server-only fields', () => {
    const notice = {
      id: 9,
      title: 'Test',
      content: '# Content',
      type: 1,
      status: 0,
      created_time: '2026-10-16',
    };
    expect(noticeValues(notice)).toEqual({
      title: 'Test',
      content: '# Content',
      type: 1,
      status: 0,
    });
  });
});
