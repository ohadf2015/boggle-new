import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendEmailSpy } = vi.hoisted(() => ({ sendEmailSpy: vi.fn(async () => ({ ok: true })) }));
vi.mock('../send', () => ({ sendEmail: sendEmailSpy }));

import {
  lifecycleUnsubscribeUrl,
  withUnsubscribeFooter,
  loadLifecycleAudience,
  sendLifecycleEmail,
  reachFor,
} from '../lifecycleUnsubscribe';

const TOKEN = 'a'.repeat(64);

function fakeDb(profiles: { data: unknown; error: { message: string } | null }, updateError: { message: string } | null = null) {
  const updates: Array<{ values: Record<string, unknown>; id: unknown }> = [];
  return {
    updates,
    from: (table: string) => {
      if (table !== 'profiles') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({ in: async () => profiles }),
        update: (values: Record<string, unknown>) => ({
          eq: async (_col: string, id: unknown) => {
            updates.push({ values, id });
            return { data: null, error: updateError };
          },
        }),
      };
    },
  };
}

describe('lifecycleUnsubscribeUrl', () => {
  it('points at the existing unsubscribe route with the token in the query string', () => {
    expect(lifecycleUnsubscribeUrl(TOKEN)).toBe(`https://www.lexiclash.live/api/email/unsubscribe?token=${TOKEN}`);
  });
});

describe('withUnsubscribeFooter', () => {
  const url = lifecycleUnsubscribeUrl(TOKEN);

  it('inserts a footer link before </body>', () => {
    const out = withUnsubscribeFooter('<html><body><p>hi</p></body></html>', url, 'en');
    expect(out).toMatch(new RegExp(`<a href="${url.replace(/[?]/g, '\\?')}"[^>]*>Unsubscribe from teacher emails</a>[\\s\\S]*</body>`));
    expect(out.indexOf('Unsubscribe')).toBeLessThan(out.indexOf('</body>'));
  });

  it('appends the footer when the html has no body tag', () => {
    const out = withUnsubscribeFooter('<p>hi</p>', url, 'en');
    expect(out.startsWith('<p>hi</p>')).toBe(true);
    expect(out).toContain(url);
  });

  it('localizes the link text and direction', () => {
    const he = withUnsubscribeFooter('<body></body>', url, 'he');
    expect(he).toContain('dir="rtl"');
    expect(he).not.toContain('Unsubscribe from teacher emails');
    for (const locale of ['sv', 'ja', 'es', 'ru'] as const) {
      expect(withUnsubscribeFooter('<body></body>', url, locale)).not.toContain('Unsubscribe from teacher emails');
    }
  });
});

describe('loadLifecycleAudience', () => {
  it('returns the stored token for subscribed users', async () => {
    const db = fakeDb({ data: [{ id: 'u1', daily_email_subscribed: null, email_unsubscribe_token: TOKEN }], error: null });
    const audience = await loadLifecycleAudience(db as never, ['u1'], { mint: true });
    expect(audience.contacts.get('u1')).toBe(TOKEN);
    expect(db.updates).toHaveLength(0);
  });

  it('marks users who opted out as unsubscribed and never contacts them', async () => {
    const db = fakeDb({ data: [{ id: 'u1', daily_email_subscribed: false, email_unsubscribe_token: TOKEN }], error: null });
    const audience = await loadLifecycleAudience(db as never, ['u1'], { mint: true });
    expect(audience.contacts.has('u1')).toBe(false);
    expect(audience.unsubscribed.has('u1')).toBe(true);
  });

  it('mints and stores a token for a profile that has none', async () => {
    const db = fakeDb({ data: [{ id: 'u1', daily_email_subscribed: true, email_unsubscribe_token: null }], error: null });
    const audience = await loadLifecycleAudience(db as never, ['u1'], { mint: true });
    const token = audience.contacts.get('u1');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(db.updates).toEqual([{ values: { email_unsubscribe_token: token }, id: 'u1' }]);
  });

  it('treats a user whose token could not be stored as unreachable', async () => {
    const db = fakeDb({ data: [{ id: 'u1', daily_email_subscribed: true, email_unsubscribe_token: null }], error: null }, { message: 'boom' });
    const audience = await loadLifecycleAudience(db as never, ['u1'], { mint: true });
    expect(audience.contacts.has('u1')).toBe(false);
    expect(audience.unreachable.has('u1')).toBe(true);
  });

  it('does not write in dry mode but still counts the user as reachable', async () => {
    const db = fakeDb({ data: [{ id: 'u1', daily_email_subscribed: true, email_unsubscribe_token: null }], error: null });
    const audience = await loadLifecycleAudience(db as never, ['u1'], { mint: false });
    expect(audience.contacts.has('u1')).toBe(true);
    expect(db.updates).toHaveLength(0);
  });

  it('treats a user with no profile row as unreachable', async () => {
    const db = fakeDb({ data: [], error: null });
    const audience = await loadLifecycleAudience(db as never, ['ghost'], { mint: true });
    expect(audience.unreachable.has('ghost')).toBe(true);
  });

  it('throws when the profiles lookup fails, so the caller sends nothing', async () => {
    const db = fakeDb({ data: null, error: { message: 'timeout' } });
    await expect(loadLifecycleAudience(db as never, ['u1'], { mint: true })).rejects.toThrow(/profiles/);
  });

  it('skips the query entirely for an empty list', async () => {
    const audience = await loadLifecycleAudience({ from: () => { throw new Error('no'); } } as never, [], { mint: true });
    expect(audience.contacts.size).toBe(0);
  });
});

describe('sendLifecycleEmail', () => {
  beforeEach(() => sendEmailSpy.mockClear());

  it('adds RFC 8058 one-click headers and the footer', async () => {
    await sendLifecycleEmail({ to: 't@school.edu', subject: 's', html: '<body></body>', locale: 'en', token: TOKEN, replyTo: 'r@x.org' });
    const arg = sendEmailSpy.mock.calls[0][0] as Record<string, any>;
    const url = lifecycleUnsubscribeUrl(TOKEN);
    expect(arg.headers).toEqual({
      'List-Unsubscribe': `<${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
    expect(arg.html).toContain(url);
    expect(arg.replyTo).toBe('r@x.org');
    expect(arg.to).toBe('t@school.edu');
  });
});

describe('reachFor', () => {
  const audience = {
    contacts: new Map([['u1', TOKEN]]),
    unsubscribed: new Set(['u2']),
    unreachable: new Set(['u3']),
  };

  it('returns the token of a reachable account', () => {
    expect(reachFor(audience, ['u1'])).toEqual({ token: TOKEN });
    expect(reachFor(audience, [null, 'u3', 'u1'])).toEqual({ token: TOKEN });
  });

  it('refuses the whole address when any of its accounts unsubscribed', () => {
    expect(reachFor(audience, ['u1', 'u2'])).toEqual({ skip: 'unsubscribed' });
  });

  it('is unreachable with no usable account', () => {
    expect(reachFor(audience, [null])).toEqual({ skip: 'unreachable' });
    expect(reachFor(audience, ['u3'])).toEqual({ skip: 'unreachable' });
    expect(reachFor(audience, [])).toEqual({ skip: 'unreachable' });
  });
});
