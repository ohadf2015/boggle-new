/**
 * Tests for curator proposal validation + ratification reward math.
 * TDD: written BEFORE implementation.
 *
 * A curator action is always a proposal (never a direct master write). When an
 * admin ratifies it, the curator earns prestige points and possibly a one-time
 * coin milestone bonus — both computed purely here so the route just persists.
 */
import { describe, it, expect } from 'vitest';
import {
  validateProposalInput,
  buildProposalRow,
  computeRatifyReward,
  type ProposalInput,
} from '../curatorProposal';

const base: ProposalInput = {
  kind: 'word_approve',
  language: 'he',
  targetRef: 'שלום',
  payload: {},
};

describe('validateProposalInput', () => {
  it('accepts a well-formed word proposal', () => {
    expect(validateProposalInput(base).ok).toBe(true);
  });

  it('rejects an unknown kind', () => {
    expect(validateProposalInput({ ...base, kind: 'nope' as never }).ok).toBe(false);
  });

  it('rejects an unsupported language', () => {
    expect(validateProposalInput({ ...base, language: 'fr' }).ok).toBe(false);
  });

  it('rejects an empty / whitespace target', () => {
    expect(validateProposalInput({ ...base, targetRef: '   ' }).ok).toBe(false);
  });

  it('requires a valid verdict in the payload for a puzzle_verdict', () => {
    const good: ProposalInput = { kind: 'puzzle_verdict', language: 'en', targetRef: 'en-o-001', payload: { verdict: 'bad' } };
    expect(validateProposalInput(good).ok).toBe(true);
    expect(validateProposalInput({ ...good, payload: { verdict: 'maybe' } }).ok).toBe(false);
    expect(validateProposalInput({ ...good, payload: {} }).ok).toBe(false);
  });
});

describe('buildProposalRow', () => {
  it('builds an insert row owned by the curator, always status=proposed', () => {
    const row = buildProposalRow({ ...base, targetRef: '  שלום  ' }, 'cur-1');
    expect(row.curator_id).toBe('cur-1');
    expect(row.language).toBe('he');
    expect(row.kind).toBe('word_approve');
    expect(row.target_ref).toBe('שלום'); // trimmed
    expect(row.status).toBe('proposed'); // never self-ratified
    expect(row.payload).toEqual({});
  });

  it('never lets a caller force a non-proposed status via payload', () => {
    const row = buildProposalRow(
      { ...base, payload: { status: 'ratified', sneaky: true } as Record<string, unknown> },
      'cur-1'
    );
    expect(row.status).toBe('proposed');
    // arbitrary payload data is preserved, but it is just data — not a column
    expect((row.payload as Record<string, unknown>).sneaky).toBe(true);
  });
});

describe('computeRatifyReward', () => {
  it('awards the kind points and advances the lifetime total', () => {
    const r = computeRatifyReward('word_approve', 0);
    expect(r.points).toBe(10);
    expect(r.newPoints).toBe(10);
    expect(r.coinBonus).toBe(0); // first coin milestone is at 50
  });

  it('pays a coin milestone exactly when crossed', () => {
    const r = computeRatifyReward('word_approve', 45); // 45 -> 55 crosses 50
    expect(r.newPoints).toBe(55);
    expect(r.coinBonus).toBeGreaterThan(0);
  });

  it('pays nothing extra when a milestone was already passed', () => {
    const r = computeRatifyReward('word_reject', 100); // 100 -> 106, no milestone between
    expect(r.coinBonus).toBe(0);
  });

  it('an unknown kind awards zero (defensive)', () => {
    const r = computeRatifyReward('bogus' as never, 0);
    expect(r.points).toBe(0);
    expect(r.newPoints).toBe(0);
  });
});
