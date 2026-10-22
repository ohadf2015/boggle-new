import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

import { sendEmail } from '../send';

describe('sendEmail — Resend call cap', () => {
  const OLD = { ...process.env };

  beforeEach(() => {
    mockSend.mockReset();
    process.env.RESEND_API_KEY = 'test_key';
  });
  afterEach(() => {
    process.env = { ...OLD };
    vi.useRealTimers();
  });

  it('sends normally and returns the message id', async () => {
    mockSend.mockResolvedValue({ data: { id: 'em1' }, error: null });
    const res = await sendEmail({ to: 'a@b.org', subject: 'hi', html: '<p>hi</p>' });
    expect(res).toEqual({ ok: true, id: 'em1' });
  });

  it('passes custom headers through to Resend', async () => {
    mockSend.mockResolvedValue({ data: { id: 'em2' }, error: null });
    const headers = { 'List-Unsubscribe': '<https://x.test/u?token=a>' };
    await sendEmail({ to: 'a@b.org', subject: 'hi', html: '<p>hi</p>', headers });
    expect(mockSend.mock.calls[0][0].headers).toEqual(headers);
  });

  it('omits the headers key when none are given', async () => {
    mockSend.mockResolvedValue({ data: { id: 'em3' }, error: null });
    await sendEmail({ to: 'a@b.org', subject: 'hi', html: '<p>hi</p>' });
    expect(mockSend.mock.calls[0][0]).not.toHaveProperty('headers');
  });

  it('reports a provider error without throwing', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'invalid from address' } });
    const res = await sendEmail({ to: 'a@b.org', subject: 'hi', html: '<p>hi</p>' });
    expect(res).toEqual({ ok: false, error: 'invalid from address' });
  });

  it('gives up and reports a timeout instead of hanging forever when Resend never responds', async () => {
    vi.useFakeTimers();
    mockSend.mockReturnValue(new Promise(() => { /* never resolves */ }));

    const resultPromise = sendEmail({ to: 'a@b.org', subject: 'hi', html: '<p>hi</p>' });
    await vi.advanceTimersByTimeAsync(10_001);

    const res = await resultPromise;
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/timed out/i);
  });
});
