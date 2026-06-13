import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

import { sendTestWelcomeEmail } from '../../welcomeEmail';

describe('sendTestWelcomeEmail — admin test send', () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });
  });
  afterEach(() => {
    process.env = { ...OLD };
  });

  it('fails cleanly when the email service is not configured', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    const res = await sendTestWelcomeEmail('me@example.com');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not configured/i);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('renders + sends a [TEST]-prefixed welcome email with the cube mode grid', async () => {
    process.env.RESEND_API_KEY = 'test_key';
    process.env.RESEND_FROM_EMAIL = 'noreply@lexiclash.live';

    const res = await sendTestWelcomeEmail('me@example.com', 'Maya', 'en');
    expect(res.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);

    const arg = mockSend.mock.calls[0][0];
    expect(arg.to).toBe('me@example.com');
    expect(arg.subject).toMatch(/^\[TEST\]/);
    // Real render path: the dynamic cube mode grid must be present
    expect(arg.html).toContain('/modes/cubes/');
    expect(arg.html).toContain('Multiplayer'); // localized arena title
  });

  it('localizes by language (Hebrew subject + links)', async () => {
    process.env.RESEND_API_KEY = 'test_key';
    process.env.RESEND_FROM_EMAIL = 'noreply@lexiclash.live';

    await sendTestWelcomeEmail('me@example.com', 'מאיה', 'he');
    const arg = mockSend.mock.calls[0][0];
    expect(arg.html).toMatch(/\/he\/multiplayer/);
  });
});
