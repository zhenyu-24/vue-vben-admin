import DOMPurify from 'dompurify';
import { marked } from 'marked';

export function noticeContentHtml(content = ''): string {
  // Tiptap emits block HTML; parsing it as Markdown again can alter the text.
  const html = /^\s*<(?:p|h[1-6]|div|ul|ol|blockquote|pre|hr|img|table)\b/i.test(
    content,
  )
    ? content
    : marked.parse(content, { async: false, breaks: true });
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

function noticeDocument(content: string): Document {
  return new DOMParser().parseFromString(noticeContentHtml(content), 'text/html');
}

export function noticeContentText(content = ''): string {
  const { body } = noticeDocument(content);
  for (const element of body.querySelectorAll(
    'p, h1, h2, h3, h4, h5, h6, div, li, blockquote, pre, tr',
  )) {
    element.append(' ');
  }
  for (const element of body.querySelectorAll('br')) {
    element.replaceWith(' ');
  }
  return body.textContent?.replaceAll(/\s+/g, ' ').trim() ?? '';
}

export function hasNoticeContent(content: string): boolean {
  const { body } = noticeDocument(content);
  return !!(
    body.textContent?.replaceAll(/[\s\u200B-\u200D\uFEFF]/g, '') ||
    body.querySelector('img[src]')
  );
}
