import { describe, it, expect } from 'vitest';
import {
  generateDictKey,
  encryptText,
  decryptText,
} from '../dictionaryCrypto';

describe('dictionaryCrypto', () => {
  it('round-trips text through encrypt → decrypt', async () => {
    const key = await generateDictKey();
    const plaintext = 'apple\nbanana\ncherry\nдыня\nתפוח';

    const blob = await encryptText(key, plaintext);
    const decrypted = await decryptText(key, blob);

    expect(decrypted).toBe(plaintext);
  });

  it('produces ciphertext that does not contain the plaintext', async () => {
    const key = await generateDictKey();
    const blob = await encryptText(key, 'secretword');
    const bytes = new Uint8Array(blob.data);
    const asText = new TextDecoder().decode(bytes);
    expect(asText).not.toContain('secretword');
  });

  it('uses a fresh IV per encryption (no deterministic ciphertext)', async () => {
    const key = await generateDictKey();
    const a = await encryptText(key, 'same input');
    const b = await encryptText(key, 'same input');
    // Different IV → different ciphertext for identical plaintext.
    expect(Array.from(a.iv)).not.toEqual(Array.from(b.iv));
    expect(new Uint8Array(a.data)).not.toEqual(new Uint8Array(b.data));
  });

  it('fails to decrypt with a different key', async () => {
    const k1 = await generateDictKey();
    const k2 = await generateDictKey();
    const blob = await encryptText(k1, 'hello');
    await expect(decryptText(k2, blob)).rejects.toBeTruthy();
  });

  it('fails to decrypt tampered ciphertext (AES-GCM auth tag)', async () => {
    const key = await generateDictKey();
    const blob = await encryptText(key, 'integrity matters');
    const tampered = new Uint8Array(blob.data);
    tampered[0] ^= 0xff;
    await expect(
      decryptText(key, { iv: blob.iv, data: tampered.buffer }),
    ).rejects.toBeTruthy();
  });

  it('generates a NON-EXTRACTABLE key (raw bytes cannot be exported)', async () => {
    const key = await generateDictKey();
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toBeTruthy();
  });
});
