/**
 * Regression: non-ASCII admin profile fields (Hebrew display_name) must not
 * land verbatim in HTTP headers. Node/undici enforce ByteString — codepoint
 * >255 throws TypeError and Next.js handlers crash with 500.
 */

import { vi, type Mock } from 'vitest';

const getUserMock = vi.fn();
const fromMock = vi.fn();

vi.mock('../../../modules/supabaseServer', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

import { adminAuth } from '../middleware';
import type { AdminRequest } from '../types';
import type { Response } from 'express';

describe('adminAuth header forwarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-uuid', email: 'admin@example.com' } },
      error: null,
    });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: {
                is_admin: true,
                username: 'אוהד',
                display_name: 'אוהד פישר',
                admin_role: 'superadmin',
              },
              error: null,
            }),
        }),
      }),
    });
  });

  it('encodes non-ASCII profile fields so headers stay ByteString-safe', async () => {
    const req = {
      headers: { authorization: 'Bearer token' },
      method: 'GET',
      path: '/admin/live-games',
    } as unknown as AdminRequest;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();

    await adminAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const username = req.headers['x-admin-username'] as string;
    const displayName = req.headers['x-admin-display-name'] as string;
    const email = req.headers['x-admin-email'] as string;

    for (const value of [username, displayName, email]) {
      for (let i = 0; i < value.length; i++) {
        expect(value.charCodeAt(i)).toBeLessThan(256);
      }
    }

    expect(decodeURIComponent(username)).toBe('אוהד');
    expect(decodeURIComponent(displayName)).toBe('אוהד פישר');
    expect(req.headers['x-admin-user-id']).toBe('user-uuid');
    expect((res.setHeader as Mock)).toHaveBeenCalledWith(
      'X-Request-Id',
      expect.stringMatching(/^admin-/),
    );
  });
});
