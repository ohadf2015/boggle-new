/**
 * The receipt is what survives a reload.
 *
 * Found live 2026-09-12: finish the homework, then let anything re-mount the
 * page (the cookie banner's accept does exactly this, so does a pull-to-refresh
 * on a phone) and the screen was back to "Start — 5 words". The turn-in link,
 * the score and the take-home card were all gone, with nothing to tell the
 * student their run had counted — even though the row was already in the
 * database.
 *
 * This is deliberately NOT a second copy of the class streak (pitfalls Class 1
 * — the streak has exactly one source, the server). It is narrower: this device
 * finished THIS assignment, at this accuracy, on this day. Nobody else's number
 * lives here, so nothing can disagree with the server about it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  readMissGapReceipt,
  writeMissGapReceipt,
} from '../missGapReceipt';

describe('missGapReceipt', () => {
  beforeEach(() => window.localStorage.clear());

  it('given no run on this device, reports nothing', () => {
    expect(readMissGapReceipt('week 3::ms g', '2099-01-01')).toBeNull();
  });

  it('given a recorded run, reads back the accuracy and the day', () => {
    writeMissGapReceipt('week 3::ms g', '2099-01-01', {
      accuracy: 80,
      completedOn: '2026-09-12',
    });
    expect(readMissGapReceipt('week 3::ms g', '2099-01-01')).toEqual({
      accuracy: 80,
      completedOn: '2026-09-12',
    });
  });

  /** Next week's homework is a different assignment, not a finished one. */
  it('is scoped to one assignment, not to the class', () => {
    writeMissGapReceipt('week 3::ms g', '2099-01-01', {
      accuracy: 80,
      completedOn: '2026-09-12',
    });
    expect(readMissGapReceipt('week 3::ms g', '2099-02-02')).toBeNull();
    expect(readMissGapReceipt('week 4::ms g', '2099-01-01')).toBeNull();
  });

  it('clamps a nonsense accuracy instead of trusting storage', () => {
    window.localStorage.setItem(
      'lexiclash_miss_gap_receipt_week%203%3A%3Ams%20g|2099-01-01',
      JSON.stringify({ accuracy: 9000, completedOn: 'not-a-day' }),
    );
    const receipt = readMissGapReceipt('week 3::ms g', '2099-01-01');
    expect(receipt?.accuracy).toBe(100);
    expect(receipt?.completedOn).toBe('');
  });

  it('survives unreadable storage without throwing', () => {
    window.localStorage.setItem(
      'lexiclash_miss_gap_receipt_week%203%3A%3Ams%20g|2099-01-01',
      '{not json',
    );
    expect(() => readMissGapReceipt('week 3::ms g', '2099-01-01')).not.toThrow();
    expect(readMissGapReceipt('week 3::ms g', '2099-01-01')).toBeNull();
  });

  it('ignores a call with no assignment to file it under', () => {
    writeMissGapReceipt('', '', { accuracy: 50, completedOn: '2026-09-12' });
    expect(readMissGapReceipt('', '')).toBeNull();
  });
});
