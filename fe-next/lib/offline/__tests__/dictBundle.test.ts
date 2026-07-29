import { describe, expect, it } from 'vitest';
import { gunzipSync } from 'node:zlib';
import { buildDictBlob, parseDictBlob } from '../dictBundle';

describe('dict bundle format', () => {
  it('buildDictBlob serializes words as gzipped LF-delimited bytes', () => {
    const blob = buildDictBlob(['hello', 'world', 'lexiclash']);
    const decompressed = gunzipSync(blob).toString('utf8');
    expect(decompressed).toBe('hello\nworld\nlexiclash');
  });

  it('parseDictBlob round-trips through gzip', () => {
    const blob = buildDictBlob(['alpha', 'beta', 'gamma']);
    expect(parseDictBlob(blob)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('buildDictBlob lower-cases and trims input', () => {
    const blob = buildDictBlob(['  Hello ', 'WORLD', 'leXi']);
    expect(parseDictBlob(blob)).toEqual(['hello', 'world', 'lexi']);
  });

  it('buildDictBlob deduplicates case-insensitively', () => {
    const blob = buildDictBlob(['hello', 'HELLO', 'Hello']);
    expect(parseDictBlob(blob)).toEqual(['hello']);
  });

  it('buildDictBlob drops empty entries', () => {
    const blob = buildDictBlob(['hello', '', '   ', 'world']);
    expect(parseDictBlob(blob)).toEqual(['hello', 'world']);
  });

  it('parseDictBlob tolerates trailing newline', () => {
    const { gzipSync } = require('node:zlib');
    const blob = gzipSync(Buffer.from('hello\nworld\n'));
    expect(parseDictBlob(blob)).toEqual(['hello', 'world']);
  });

  it('blob compresses meaningfully for realistic English vocab size', () => {
    const fakeDict = Array.from({ length: 5000 }, (_, i) => `word${i}`);
    const blob = buildDictBlob(fakeDict);
    const raw = fakeDict.join('\n').length;
    expect(blob.byteLength).toBeLessThan(raw * 0.4);
  });
});
