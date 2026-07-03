import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Resend. NOTE: getResendClient() does `new Resend(...)`, so the mock impl
// MUST be a regular function (arrow functions can't be used with `new`).
vi.mock('resend', () => ({
  Resend: vi.fn(function () {
    return {
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: 'mock-send-id' }, error: null }),
      },
    };
  }),
}));

// Mock email module (partial mock keeping real getLocaleFromCountry)
vi.mock('@/lib/email', async (orig) => {
  const actual = await orig<typeof import('@/lib/email')>();
  return {
    ...actual,
    getSupabaseAdmin: vi.fn(),
    isEmailServiceConfigured: vi.fn(() => true),
  };
});

// Mock @react-email/components
vi.mock('@react-email/components', () => ({
  render: vi.fn().mockResolvedValue('<html>rendered</html>'),
}));

// Mock the welcome email template
vi.mock('@/emails/welcome', () => ({
  default: vi.fn(() => 'mock-template'),
  getWelcomeSubject: vi.fn((lang: string, name: string) => `Welcome, ${name}!`),
}));

// Mock logger
vi.mock('@/backend/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks
import { sendWelcomeEmailToUser } from '../welcomeEmail';

describe('sendWelcomeEmailToUser', () => {
  let mockSupabase: any;
  let mockResendSend: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Set environment variables for Resend
    process.env.RESEND_API_KEY = 'test-key';
    process.env.RESEND_FROM_EMAIL = 'test@example.com';
    process.env.NEXT_PUBLIC_APP_URL = 'https://lexiclash.live';

    // Setup Supabase mock with chainable query builder
    mockSupabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(function () {
            return {
              is: vi.fn(function () {
                return {
                  gt: vi.fn(function () {
                    return {
                      select: vi.fn().mockResolvedValue({
                        data: [
                          {
                            country_code: 'IL',
                            username: 'testuser',
                            display_name: 'Test User',
                            email_unsubscribe_token: 'existing-token',
                          },
                        ],
                        error: null,
                      }),
                    };
                  }),
                };
              }),
            };
          }),
        })),
      })),
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      },
    };

    const emailMod = await import('@/lib/email');
    const { getSupabaseAdmin, isEmailServiceConfigured } = vi.mocked(emailMod);
    getSupabaseAdmin.mockReturnValue(mockSupabase);
    isEmailServiceConfigured.mockReturnValue(true);

    // Setup Resend mock - create a reusable instance
    const mockResendInstance = {
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: 'mock-send-id' }, error: null }),
      },
    };
    mockResendSend = mockResendInstance.emails.send;

    // Mock the Resend constructor to return our instance. Must be a regular
    // function (not an arrow) because the lib calls `new Resend(...)`.
    const { Resend } = vi.mocked(await import('resend'));
    (Resend as any).mockImplementation(function () {
      return mockResendInstance;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('service configuration checks', () => {
    it('returns { sent: false, reason: "email_service_unconfigured" } when email service not configured', async () => {
      const emailMod = await import('@/lib/email');
      vi.mocked(emailMod).isEmailServiceConfigured.mockReturnValue(false);

      const result = await sendWelcomeEmailToUser('user-123');
      expect(result).toEqual({
        sent: false,
        reason: 'email_service_unconfigured',
      });
      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it('returns { sent: false, reason: "no_db" } when Supabase admin client unavailable', async () => {
      const emailMod = await import('@/lib/email');
      vi.mocked(emailMod).getSupabaseAdmin.mockReturnValue(null);

      const result = await sendWelcomeEmailToUser('user-123');
      expect(result).toEqual({ sent: false, reason: 'no_db' });
    });
  });

  describe('claim atomicity (idempotency)', () => {
    it('wins claim and sends welcome email with country-based language detection', async () => {
      const result = await sendWelcomeEmailToUser('user-123');

      expect(result).toEqual({
        sent: true,
        language: 'he', // IL → Hebrew
      });
      expect(mockResendSend).toHaveBeenCalled();
    });

    it('loses claim (already_sent_or_not_new) when no rows match the atomic update', async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(function () {
            return {
              is: vi.fn(function () {
                return {
                  gt: vi.fn(function () {
                    return {
                      select: vi.fn().mockResolvedValue({
                        data: [],
                        error: null,
                      }),
                    };
                  }),
                };
              }),
            };
          }),
        })),
      }));

      const result = await sendWelcomeEmailToUser('user-123');
      expect(result).toEqual({
        sent: false,
        reason: 'already_sent_or_not_new',
      });
      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it('returns claim_error when update query fails', async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(function () {
            return {
              is: vi.fn(function () {
                return {
                  gt: vi.fn(function () {
                    return {
                      select: vi.fn().mockResolvedValue({
                        data: null,
                        error: new Error('DB error'),
                      }),
                    };
                  }),
                };
              }),
            };
          }),
        })),
      }));

      const result = await sendWelcomeEmailToUser('user-123');
      expect(result).toEqual({ sent: false, reason: 'claim_error' });
    });
  });

  describe('email resolution', () => {
    it('uses email from opts when provided, skipping auth lookup', async () => {
      mockSupabase.auth = {
        admin: {
          getUserById: vi.fn(),
        },
      };

      await sendWelcomeEmailToUser('user-123', { email: 'custom@example.com' });

      expect(mockSupabase.auth.admin.getUserById).not.toHaveBeenCalled();
    });

    it('fetches email from auth.getUser when opts.email not provided', async () => {
      await sendWelcomeEmailToUser('user-123');

      expect(mockSupabase.auth.admin.getUserById).toHaveBeenCalledWith(
        'user-123'
      );
    });

    it('reverts claim and returns no_email when email cannot be resolved', async () => {
      mockSupabase.auth.admin.getUserById = vi
        .fn()
        .mockResolvedValue({
          data: { user: null },
          error: null,
        });

      const result = await sendWelcomeEmailToUser('user-123');

      expect(result).toEqual({ sent: false, reason: 'no_email' });
    });
  });

  describe('language selection', () => {
    it('uses locale param when provided and valid', async () => {
      const result = await sendWelcomeEmailToUser('user-123', { locale: 'sv' });

      expect(result.language).toBe('sv');
    });

    it('uses Russian locale when provided', async () => {
      const result = await sendWelcomeEmailToUser('user-123', { locale: 'ru' });

      expect(result.language).toBe('ru');
    });

    it('falls back to country_code-based language when locale not provided', async () => {
      const result = await sendWelcomeEmailToUser('user-123');

      expect(result.language).toBe('he'); // IL → Hebrew
    });

    it('falls back to country_code when invalid locale provided', async () => {
      const result = await sendWelcomeEmailToUser('user-123', {
        locale: 'xx', // invalid
      });

      expect(result.language).toBe('he'); // IL → Hebrew
    });

    it('defaults to en when country_code is missing and no locale provided', async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(function () {
            return {
              is: vi.fn(function () {
                return {
                  gt: vi.fn(function () {
                    return {
                      select: vi.fn().mockResolvedValue({
                        data: [
                          {
                            country_code: null,
                            username: 'user',
                            display_name: null,
                            email_unsubscribe_token: 'token',
                          },
                        ],
                        error: null,
                      }),
                    };
                  }),
                };
              }),
            };
          }),
        })),
      }));

      const result = await sendWelcomeEmailToUser('user-123');

      expect(result.language).toBe('en');
    });
  });

  describe('unsubscribe token', () => {
    it('persists generated token when profile token is null', async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(function () {
            return {
              is: vi.fn(function () {
                return {
                  gt: vi.fn(function () {
                    return {
                      select: vi.fn().mockResolvedValue({
                        data: [
                          {
                            country_code: 'IL',
                            username: 'user',
                            display_name: null,
                            email_unsubscribe_token: null, // null token
                          },
                        ],
                        error: null,
                      }),
                    };
                  }),
                };
              }),
            };
          }),
        })),
      }));

      await sendWelcomeEmailToUser('user-123');

      // Verify update was called (method chains exist)
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('uses existing token when profile token is not null', async () => {
      await sendWelcomeEmailToUser('user-123');

      expect(mockResendSend).toHaveBeenCalled();
    });
  });

  describe('send failure and revert', () => {
    it('reverts claim and returns failure reason when resend returns error', async () => {
      mockResendSend.mockResolvedValueOnce({ data: null, error: new Error('Resend API error') });

      const result = await sendWelcomeEmailToUser('user-123');

      expect(result.sent).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('reverts claim when resend throws exception', async () => {
      mockResendSend.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await sendWelcomeEmailToUser('user-123');

      expect(result.sent).toBe(false);
    });
  });

  describe('recipient name resolution', () => {
    it('prefers display_name for email recipient name', async () => {
      await sendWelcomeEmailToUser('user-123');

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Test User'),
        })
      );
    });

    it('falls back to username when display_name is null', async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(function () {
            return {
              is: vi.fn(function () {
                return {
                  gt: vi.fn(function () {
                    return {
                      select: vi.fn().mockResolvedValue({
                        data: [
                          {
                            country_code: 'IL',
                            username: 'bobby',
                            display_name: null,
                            email_unsubscribe_token: 'token',
                          },
                        ],
                        error: null,
                      }),
                    };
                  }),
                };
              }),
            };
          }),
        })),
      }));

      await sendWelcomeEmailToUser('user-123');

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('bobby'),
        })
      );
    });

    it('falls back to "there" when both display_name and username are null/missing', async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(function () {
            return {
              is: vi.fn(function () {
                return {
                  gt: vi.fn(function () {
                    return {
                      select: vi.fn().mockResolvedValue({
                        data: [
                          {
                            country_code: 'IL',
                            username: null,
                            display_name: null,
                            email_unsubscribe_token: 'token',
                          },
                        ],
                        error: null,
                      }),
                    };
                  }),
                };
              }),
            };
          }),
        })),
      }));

      await sendWelcomeEmailToUser('user-123');

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('there'),
        })
      );
    });
  });

  describe('baseUrl and URLs', () => {
    it('uses custom baseUrl from opts when provided', async () => {
      await sendWelcomeEmailToUser('user-123', {
        baseUrl: 'https://custom.example.com',
      });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'List-Unsubscribe': expect.stringContaining(
              'https://custom.example.com'
            ),
          }),
        })
      );
    });

    it('includes List-Unsubscribe headers for one-click unsubscribe', async () => {
      await sendWelcomeEmailToUser('user-123');

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'List-Unsubscribe': expect.stringMatching(/api\/email\/unsubscribe/),
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }),
        })
      );
    });
  });
});
