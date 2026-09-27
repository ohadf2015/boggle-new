/**
 * AES-GCM encryption for downloaded dictionaries at rest.
 *
 * SCOPE — be honest about what this buys: the dictionaries are PUBLIC (served
 * unauthenticated from /api/dictionary-words, and EN/ES/SV come from public npm
 * packages). This is therefore OBFUSCATION-grade — it stops casual inspection
 * of the on-device download store, not a determined extractor (one curl gets
 * the same data). The real protection it does provide:
 *   - the encryption key is a NON-EXTRACTABLE CryptoKey, so the key bytes never
 *     sit in JS-readable storage next to the ciphertext (no "key in plaintext
 *     beside the lock" anti-pattern);
 *   - AES-GCM gives tamper-detection (auth tag) for free.
 *
 * Pure crypto only — no IndexedDB here (see dictionaryDownload.ts for storage).
 */

const ALGO = 'AES-GCM';
const IV_BYTES = 12; // 96-bit nonce, the AES-GCM standard.

export interface EncryptedBlob {
  /** 12-byte AES-GCM IV, unique per record. */
  iv: Uint8Array;
  /** Ciphertext + appended 128-bit auth tag. */
  data: ArrayBuffer;
}

/** WebCrypto, available in browsers and Node 18+ (globalThis.crypto.subtle). */
function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('WebCrypto SubtleCrypto unavailable in this environment');
  }
  return c.subtle;
}

/**
 * Generate a fresh AES-GCM-256 key. `extractable: false` means JS can use it to
 * encrypt/decrypt but can never read the raw bytes out — so persisting the key
 * object in IndexedDB (CryptoKeys are structured-cloneable) does not leak it.
 */
export function generateDictKey(): Promise<CryptoKey> {
  return subtle().generateKey({ name: ALGO, length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptText(
  key: CryptoKey,
  plaintext: string,
): Promise<EncryptedBlob> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);
  // Cast to BufferSource: TS 5.7+ types these as Uint8Array<ArrayBufferLike>,
  // which the lib.dom AesGcmParams.iv / data signatures don't accept directly.
  const data = await subtle().encrypt(
    { name: ALGO, iv: iv as BufferSource },
    key,
    encoded as BufferSource,
  );
  return { iv, data };
}

export async function decryptText(
  key: CryptoKey,
  blob: EncryptedBlob,
): Promise<string> {
  const plain = await subtle().decrypt(
    { name: ALGO, iv: blob.iv as BufferSource },
    key,
    blob.data,
  );
  return new TextDecoder().decode(plain);
}
