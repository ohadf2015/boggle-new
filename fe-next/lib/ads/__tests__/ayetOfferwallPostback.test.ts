import { describe, it, expect } from 'vitest';
import {
  canonicalQueryString,
  computeAyetSignature,
  verifyAyetSignature,
  parseAyetPostback,
} from '../ayetOfferwallPostback';

/**
 * The single most important test: a KNOWN-ANSWER VECTOR from ayeT's official HMAC
 * docs. If our canonicalization + HMAC reproduce this exact hash, the flip-live
 * test conversion (owner checklist step 8) will succeed. If it ever drifts, every
 * legit postback would 403 silently in prod — so this test is the guardrail.
 *
 * Source: docs.ayetstudios.com — Callback Verification → HMAC Security Hash.
 *   sorted query: amount=0.10&click_id=1234abcd5678021&offer_name=TEST+OFFER&
 *                 payout=1.50&transaction_id=8ee08f32ae611231b0a49d1bd66e9bf193132561&
 *                 user_id=testuser123456
 *   api key:      9f2228fea0d8e7ce10b2ac36053db14c
 *   => HMAC-SHA256 62a32725866780ada1dec3d62232645f2801e05a91df7b0202e9b780f804f04b
 */
const KAT_PARAMS = {
  transaction_id: '8ee08f32ae611231b0a49d1bd66e9bf193132561',
  user_id: 'testuser123456',
  amount: '0.10',
  payout: '1.50',
  offer_name: 'TEST OFFER', // raw value; canonical form must encode the space as '+'
  click_id: '1234abcd5678021',
};
const KAT_KEY = '9f2228fea0d8e7ce10b2ac36053db14c';
const KAT_HASH = '62a32725866780ada1dec3d62232645f2801e05a91df7b0202e9b780f804f04b';

describe('ayetOfferwallPostback — canonicalization (PHP urlencode parity)', () => {
  it('sorts keys alphabetically and encodes space as + (PHP urlencode)', () => {
    expect(canonicalQueryString(KAT_PARAMS)).toBe(
      'amount=0.10&click_id=1234abcd5678021&offer_name=TEST+OFFER&payout=1.50&transaction_id=8ee08f32ae611231b0a49d1bd66e9bf193132561&user_id=testuser123456',
    );
  });

  it('encodes PHP-specific chars that encodeURIComponent leaves bare (! * \' ( ) ~)', () => {
    // PHP urlencode percent-encodes these; encodeURIComponent does not.
    expect(canonicalQueryString({ k: "a!*'()~b" })).toBe('k=a%21%2A%27%28%29%7Eb');
  });
});

describe('ayetOfferwallPostback — HMAC (known-answer vector)', () => {
  it('reproduces the exact hash from ayeT docs', () => {
    expect(computeAyetSignature(KAT_PARAMS, KAT_KEY)).toBe(KAT_HASH);
  });
});

describe('ayetOfferwallPostback — verifyAyetSignature', () => {
  it('accepts a correct signature (constant-time)', () => {
    expect(verifyAyetSignature(KAT_PARAMS, KAT_HASH, KAT_KEY)).toBe(true);
  });

  it('rejects a tampered amount (signature no longer matches)', () => {
    expect(verifyAyetSignature({ ...KAT_PARAMS, amount: '9999' }, KAT_HASH, KAT_KEY)).toBe(false);
  });

  it('rejects a missing/empty header hash', () => {
    expect(verifyAyetSignature(KAT_PARAMS, '', KAT_KEY)).toBe(false);
    expect(verifyAyetSignature(KAT_PARAMS, undefined as unknown as string, KAT_KEY)).toBe(false);
  });

  it('rejects when the secret is wrong', () => {
    expect(verifyAyetSignature(KAT_PARAMS, KAT_HASH, 'wrong-key')).toBe(false);
  });

  it('is case-insensitive on the hex digest (ayeT may send upper or lower)', () => {
    expect(verifyAyetSignature(KAT_PARAMS, KAT_HASH.toUpperCase(), KAT_KEY)).toBe(true);
  });
});

describe('ayetOfferwallPostback — parseAyetPostback', () => {
  const base = {
    transaction_id: 'tx_123',
    external_identifier: 'user-uuid-abc',
    amount: '500',
    payout_usd: '0.36',
    offer_id: 'off_1',
    offer_name: 'Some Offer',
  };

  it('extracts the credited subset and coerces numerics', () => {
    const r = parseAyetPostback(base);
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.transactionId).toBe('tx_123');
    expect(r.userId).toBe('user-uuid-abc');
    expect(r.currencyAmount).toBe(500);
    expect(r.payoutUsd).toBeCloseTo(0.36);
    expect(r.isChargeback).toBe(false);
  });

  it('flags a chargeback from is_chargeback=1', () => {
    const r = parseAyetPostback({ ...base, is_chargeback: '1' });
    if ('error' in r) throw new Error('expected parse success');
    expect(r.isChargeback).toBe(true);
  });

  it('flags a chargeback from a negative payout_usd', () => {
    const r = parseAyetPostback({ ...base, payout_usd: '-0.36' });
    if ('error' in r) throw new Error('expected parse success');
    expect(r.isChargeback).toBe(true);
  });

  it('flags a chargeback from an r- prefixed reversal transaction_id', () => {
    const r = parseAyetPostback({ ...base, transaction_id: 'r-tx_123' });
    if ('error' in r) throw new Error('expected parse success');
    expect(r.isChargeback).toBe(true);
  });

  it('rejects when transaction_id is missing', () => {
    const r = parseAyetPostback({ external_identifier: 'u', amount: '1' });
    expect('error' in r).toBe(true);
  });

  it('rejects when external_identifier is missing', () => {
    const r = parseAyetPostback({ transaction_id: 't', amount: '1' });
    expect('error' in r).toBe(true);
  });

  it('rejects a non-numeric amount', () => {
    const r = parseAyetPostback({ ...base, amount: 'abc' });
    expect('error' in r).toBe(true);
  });
});
