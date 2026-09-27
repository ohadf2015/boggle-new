/**
 * Splits prose containing raw `https://` URLs into text/url segments, so a
 * legal page can render real `<a>` tags for links it's required to give the
 * user (Google's API Services User Data Policy, myaccount.google.com/
 * permissions, etc) instead of unclickable plain text.
 *
 * Pure — no DOM, no React. `app/[locale]/legal/privacy/PageClient.tsx` maps
 * the segments to <span>/<a>.
 */

export type LinkifyPart = { type: 'text'; value: string } | { type: 'url'; value: string };

// Trailing punctuation that's almost always sentence/list punctuation, not
// part of the URL itself (e.g. "...policy." or "...policy.)"). We can't be
// perfect (a URL can legitimately end in these), but this covers every URL
// this codebase's legal copy actually embeds.
const TRAILING_PUNCTUATION = /[).,;:]+$/;
const URL_PATTERN = /https?:\/\/[^\s]+/g;

export function linkify(text: string): LinkifyPart[] {
  const parts: LinkifyPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    let raw = match[0];
    const trailingMatch = raw.match(TRAILING_PUNCTUATION);
    let trailing = '';
    if (trailingMatch) {
      trailing = trailingMatch[0];
      raw = raw.slice(0, raw.length - trailing.length);
    }

    if (start > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, start) });
    parts.push({ type: 'url', value: raw });
    lastIndex = start + raw.length;

    if (trailing) {
      parts.push({ type: 'text', value: trailing });
      lastIndex += trailing.length;
    }
  }

  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
  if (parts.length === 0) parts.push({ type: 'text', value: text });
  return parts;
}
