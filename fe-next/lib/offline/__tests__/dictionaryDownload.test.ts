import { describe, it, expect, vi } from 'vitest';
import { generateDictKey, type EncryptedBlob } from '../dictionaryCrypto';
import {
  downloadDictionary,
  loadOfflineDictionary,
  listDownloads,
  deleteDownload,
  getOrCreateKey,
  type DictBlobStore,
  type DictKeyStore,
  type StoredDict,
} from '../dictionaryDownload';

function fakeBlobStore(): DictBlobStore {
  const m = new Map<string, StoredDict>();
  return {
    get: (lang) => Promise.resolve(m.get(lang)),
    put: (lang, rec) => {
      m.set(lang, rec);
      return Promise.resolve();
    },
    delete: (lang) => {
      m.delete(lang);
      return Promise.resolve();
    },
    keys: () => Promise.resolve([...m.keys()]),
  };
}

function fakeKeyStore(): DictKeyStore {
  let key: CryptoKey | undefined;
  return {
    getKey: () => Promise.resolve(key),
    setKey: (k) => {
      key = k;
      return Promise.resolve();
    },
  };
}

describe('dictionaryDownload', () => {
  it('getOrCreateKey persists a generated key and reuses it', async () => {
    const keyStore = fakeKeyStore();
    const k1 = await getOrCreateKey(keyStore);
    const k2 = await getOrCreateKey(keyStore);
    expect(k1).toBe(k2); // reused, not regenerated
  });

  it('downloads, encrypts, and stores a dictionary', async () => {
    const blobStore = fakeBlobStore();
    const keyStore = fakeKeyStore();
    const fetchText = vi.fn(() => Promise.resolve('apple\nbanana\ncherry'));

    const result = await downloadDictionary('en', {
      blobStore,
      keyStore,
      fetchText,
      now: () => 1000,
    });

    expect(fetchText).toHaveBeenCalledWith('en');
    expect(result.wordCount).toBe(3);
    const stored = await blobStore.get('en');
    expect(stored).toBeDefined();
    expect(stored!.downloadedAt).toBe(1000);
    // Stored payload is ciphertext, not the plaintext word list.
    const asText = new TextDecoder().decode(new Uint8Array(stored!.data));
    expect(asText).not.toContain('banana');
  });

  it('loads a downloaded dictionary back as a Set of words', async () => {
    const blobStore = fakeBlobStore();
    const keyStore = fakeKeyStore();
    const fetchText = () => Promise.resolve('cat\ndog\nfox');

    await downloadDictionary('en', { blobStore, keyStore, fetchText, now: () => 1 });
    const words = await loadOfflineDictionary('en', { blobStore, keyStore });

    expect(words).toBeInstanceOf(Set);
    expect(words!.has('cat')).toBe(true);
    expect(words!.has('fox')).toBe(true);
    expect(words!.size).toBe(3);
  });

  it('returns null when a language was never downloaded', async () => {
    const words = await loadOfflineDictionary('ja', {
      blobStore: fakeBlobStore(),
      keyStore: fakeKeyStore(),
    });
    expect(words).toBeNull();
  });

  it('lists downloads with metadata and deletes them', async () => {
    const blobStore = fakeBlobStore();
    const keyStore = fakeKeyStore();
    const fetchText = () => Promise.resolve('a\nb');

    await downloadDictionary('en', { blobStore, keyStore, fetchText, now: () => 5 });
    await downloadDictionary('he', { blobStore, keyStore, fetchText, now: () => 7 });

    const list = await listDownloads(blobStore);
    expect(list.map((d) => d.lang).sort()).toEqual(['en', 'he']);
    const en = list.find((d) => d.lang === 'en')!;
    expect(en.wordCount).toBe(2);
    expect(en.downloadedAt).toBe(5);
    expect(en.sizeBytes).toBeGreaterThan(0);

    await deleteDownload('en', blobStore);
    const after = await listDownloads(blobStore);
    expect(after.map((d) => d.lang)).toEqual(['he']);
  });

  it('ignores blank lines and trims when counting/loading words', async () => {
    const blobStore = fakeBlobStore();
    const keyStore = fakeKeyStore();
    const fetchText = () => Promise.resolve('one\n\ntwo\n  \nthree\n');

    const result = await downloadDictionary('en', {
      blobStore,
      keyStore,
      fetchText,
      now: () => 1,
    });
    expect(result.wordCount).toBe(3);

    const words = await loadOfflineDictionary('en', { blobStore, keyStore });
    expect(words!.size).toBe(3);
    expect(words!.has('two')).toBe(true);
  });
});
