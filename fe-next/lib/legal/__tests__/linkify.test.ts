import { describe, it, expect } from 'vitest';
import { linkify } from '../linkify';

/**
 * Legal-page copy embeds real https:// URLs as plain prose (the required
 * verbatim Google API Services User Data Policy link, myaccount.google.com/
 * permissions, etc). `linkify` splits that prose into text/url segments so
 * the page can render actual <a> tags instead of unclickable text.
 */
describe('linkify', () => {
  it('returns a single text segment for plain text with no URL', () => {
    expect(linkify('Hello world')).toEqual([{ type: 'text', value: 'Hello world' }]);
  });

  it('extracts a bare URL', () => {
    expect(linkify('https://example.com')).toEqual([{ type: 'url', value: 'https://example.com' }]);
  });

  it('splits text around an embedded URL', () => {
    expect(linkify('See https://example.com for more.')).toEqual([
      { type: 'text', value: 'See ' },
      { type: 'url', value: 'https://example.com' },
      { type: 'text', value: ' for more.' },
    ]);
  });

  it('strips a trailing sentence-ending period from the URL, keeping it as text', () => {
    const parts = linkify('Details: https://developers.google.com/terms/api-services-user-data-policy.');
    expect(parts).toEqual([
      { type: 'text', value: 'Details: ' },
      { type: 'url', value: 'https://developers.google.com/terms/api-services-user-data-policy' },
      { type: 'text', value: '.' },
    ]);
  });

  it('handles multiple URLs in the same string', () => {
    const parts = linkify('a https://one.com b https://two.com c');
    expect(parts.filter((p) => p.type === 'url').map((p) => p.value)).toEqual([
      'https://one.com',
      'https://two.com',
    ]);
  });

  it('does not touch a bare domain mention with no protocol', () => {
    expect(linkify('visit example.com today')).toEqual([{ type: 'text', value: 'visit example.com today' }]);
  });
});
