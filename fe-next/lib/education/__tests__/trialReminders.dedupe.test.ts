/**
 * One teacher, one email — even when they hold several approved request rows.
 *
 * Idempotency for trial reminders lives in the `trial_reminders_sent` array on each
 * `teacher_access_requests` ROW. That is correct per row and wrong per person: five addresses
 * in production hold duplicate approved rows (one holds three), created when a teacher
 * submitted the access form more than once. Double-submit was later stopped at creation
 * (`baf78c10e`, `1c9bd5de7`) but the historical rows remain, and nothing deduplicated at send
 * time — so enabling the reminder cron would have sent one teacher three identical copies of
 * every reminder and four others two apiece.
 *
 * Duplicate mail to the same address is the fastest way to get a sender domain reputation-flagged,
 * which would take down every transactional email the product sends, not just these.
 *
 * Deduping at the send path rather than cleaning the rows is deliberate: it also covers any
 * duplicate that slips in later, and it needs no destructive edit to a teacher's own records.
 */
import { describe, it, expect } from 'vitest';
import { dedupeDueByEmail } from '../trialReminders';

/** Minimal shape of what the cron builds before sending. */
const due = (id: string, email: string, expires: string, bucket = 't+3') => ({
  row: { id, email, trial_expires_at: expires },
  bucket,
});

describe('dedupeDueByEmail', () => {
  it('keeps every distinct teacher', () => {
    const out = dedupeDueByEmail([
      due('a', 'one@school.org', '2026-08-01T00:00:00Z'),
      due('b', 'two@school.org', '2026-08-01T00:00:00Z'),
    ]);
    expect(out).toHaveLength(2);
  });

  it('collapses duplicate rows for the same address to a single send', () => {
    const out = dedupeDueByEmail([
      due('a', 'jimiiin95@goedu.kr', '2026-08-24T00:00:00Z'),
      due('b', 'jimiiin95@goedu.kr', '2026-08-24T00:00:00Z'),
      due('c', 'jimiiin95@goedu.kr', '2026-08-24T00:00:00Z'),
    ]);
    expect(out).toHaveLength(1);
  });

  it('matches addresses case-insensitively and ignores surrounding whitespace', () => {
    // The form does not normalise what a teacher types.
    const out = dedupeDueByEmail([
      due('a', 'Sara.AlShayeb59@gmail.com', '2026-08-02T00:00:00Z'),
      due('b', '  sara.alshayeb59@gmail.com ', '2026-08-02T00:00:00Z'),
    ]);
    expect(out).toHaveLength(1);
  });

  it('keeps the row with the most recent trial, so the bucket reflects their real state', () => {
    // A teacher who re-requested has a fresher trial; reminding them about the stale one
    // would tell them their trial ended when it has not.
    const out = dedupeDueByEmail([
      due('old', 'teacher@school.org', '2026-07-01T00:00:00Z', 't+3'),
      due('new', 'teacher@school.org', '2026-08-25T00:00:00Z', 't-0'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].row.id).toBe('new');
    expect(out[0].bucket).toBe('t-0');
  });

  it('does not reorder or drop anything when there are no duplicates', () => {
    const input = [
      due('a', 'one@school.org', '2026-08-01T00:00:00Z'),
      due('b', 'two@school.org', '2026-08-02T00:00:00Z'),
      due('c', 'three@school.org', '2026-08-03T00:00:00Z'),
    ];
    expect(dedupeDueByEmail(input).map((d) => d.row.id)).toEqual(['a', 'b', 'c']);
  });

  it('survives a null or missing expiry without throwing', () => {
    const out = dedupeDueByEmail([
      { row: { id: 'a', email: 'x@y.org', trial_expires_at: null }, bucket: 't+3' },
      { row: { id: 'b', email: 'x@y.org', trial_expires_at: '2026-08-01T00:00:00Z' }, bucket: 't+3' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].row.id).toBe('b'); // a real date beats no date
  });
});
