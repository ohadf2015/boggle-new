import { describe, it, expect } from 'vitest';
import { currentLocale } from '../ServiceWorkerRegistration';

describe('currentLocale (which shells the SW warms)', () => {
  it.each([
    ['/he/daily', '', 'he'],
    ['/en', 'he', 'en'],
    ['/', 'sv', 'sv'],
    ['/', 'ja-JP', 'ja'],
    ['/admin', '', null],
    ['/', 'fr', null],
  ])('%s with lang %s -> %s', (path, lang, expected) => {
    expect(currentLocale(path, lang)).toBe(expected);
  });
});
