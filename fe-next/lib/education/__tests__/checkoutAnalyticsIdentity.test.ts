import { describe, it, expect } from 'vitest';
import {
  readPosthogCookieIdentity,
  resolveCheckoutAnalyticsIdentity,
  withAnalyticsIdentity,
} from '../checkoutAnalyticsIdentity';

const TOKEN = 'phc_abc123';
const phCookie = (value: Record<string, unknown>, name = `ph_${TOKEN}_posthog`) =>
  `${name}=${encodeURIComponent(JSON.stringify(value))}`;

describe('readPosthogCookieIdentity', () => {
  it('Given the posthog-js persistence cookie, When read, Then it returns the browser distinct id, session id and user state', () => {
    const header = `boggle_language=en; ${phCookie({ distinct_id: '0192-anon', $sesid: [1730000000000, 'sess-1', 1730000000000], $user_state: 'anonymous' })}`;
    expect(readPosthogCookieIdentity(header)).toEqual({ distinctId: '0192-anon', sessionId: 'sess-1', userState: 'anonymous' });
  });

  it('Given no posthog cookie, a window-id cookie only, or a broken value, When read, Then it returns null', () => {
    expect(readPosthogCookieIdentity(null)).toBeNull();
    expect(readPosthogCookieIdentity('boggle_language=he')).toBeNull();
    expect(readPosthogCookieIdentity(`ph_${TOKEN}_window_id=abc`)).toBeNull();
    expect(readPosthogCookieIdentity(`ph_${TOKEN}_posthog=%7Bnot-json`)).toBeNull();
  });
});

describe('resolveCheckoutAnalyticsIdentity', () => {
  it('Given an anonymous browser id (identify never ran), When resolved, Then server events use the browser id', () => {
    const header = phCookie({ distinct_id: 'anon-1', $sesid: [1, 'sess-9', 1], $user_state: 'anonymous' });
    expect(resolveCheckoutAnalyticsIdentity({ userId: 'u1', cookieHeader: header })).toEqual({
      distinctId: 'anon-1',
      sessionId: 'sess-9',
      source: 'browser_cookie',
    });
  });

  it('Given the browser is already identified as this teacher, When resolved, Then the teacher id is kept and the session rides along', () => {
    const header = phCookie({ distinct_id: 'u1', $sesid: [1, 'sess-2', 1], $user_state: 'identified' });
    expect(resolveCheckoutAnalyticsIdentity({ userId: 'u1', cookieHeader: header })).toEqual({
      distinctId: 'u1',
      sessionId: 'sess-2',
      source: 'browser_cookie',
    });
  });

  it('Given a shared classroom PC identified as another account, When resolved, Then the cookie id is ignored', () => {
    const header = phCookie({ distinct_id: 'other-teacher', $sesid: [1, 'sess-3', 1], $user_state: 'identified' });
    expect(resolveCheckoutAnalyticsIdentity({ userId: 'u1', cookieHeader: header })).toEqual({
      distinctId: 'u1',
      sessionId: null,
      source: 'user_id',
    });
  });

  it('Given the cookieless sentinel, an empty id or an oversized id, When resolved, Then it falls back to the user id', () => {
    for (const bad of ['$posthog_cookieless', '', 'x'.repeat(300)]) {
      const header = phCookie({ distinct_id: bad, $user_state: 'anonymous' });
      expect(resolveCheckoutAnalyticsIdentity({ userId: 'u1', cookieHeader: header }).distinctId).toBe('u1');
    }
  });

  it('Given a forged anonymous cookie carrying another account id (UUIDv4), When resolved, Then events stay on the user id with no session', () => {
    const victim = '3f2b8c1e-9a4d-4b7e-8c2f-1d5e6a7b8c9d';
    const header = phCookie({ distinct_id: victim, $sesid: [1, '0192f0aa-1111-7222-8333-444455556666', 1], $user_state: 'anonymous' });
    expect(resolveCheckoutAnalyticsIdentity({ userId: 'u1', cookieHeader: header })).toEqual({
      distinctId: 'u1',
      sessionId: null,
      source: 'user_id',
    });
  });

  it('Given a real posthog-js anonymous id (UUIDv7), When resolved, Then the browser id is kept', () => {
    const anon = '0192f0aa-1111-7222-8333-444455556666';
    const header = phCookie({ distinct_id: anon, $user_state: 'anonymous' });
    expect(resolveCheckoutAnalyticsIdentity({ userId: 'u1', cookieHeader: header }).distinctId).toBe(anon);
  });

  it('Given an oversized or odd session id, When read, Then the session is dropped and the browser id kept', () => {
    for (const bad of ['s'.repeat(65), 'sess 1', 'sess<script>', '']) {
      const header = phCookie({ distinct_id: 'anon-1', $sesid: [1, bad, 1], $user_state: 'anonymous' });
      expect(resolveCheckoutAnalyticsIdentity({ userId: 'u1', cookieHeader: header })).toEqual({
        distinctId: 'anon-1',
        sessionId: null,
        source: 'browser_cookie',
      });
    }
  });

  it('Given no cookie at all, When resolved, Then the user id is used', () => {
    expect(resolveCheckoutAnalyticsIdentity({ userId: 'u1', cookieHeader: null })).toEqual({
      distinctId: 'u1',
      sessionId: null,
      source: 'user_id',
    });
  });
});

describe('withAnalyticsIdentity', () => {
  it('Given a server event built for the user id, When stamped, Then it is sent as the browser id and keeps teacher_id', () => {
    const ev = withAnalyticsIdentity(
      { distinctId: 'u1', event: 'edu_pro_checkout_started', properties: { teacher_id: 'u1', product: 'teacher_pro' } },
      { distinctId: 'anon-1', sessionId: 'sess-9', source: 'browser_cookie' },
      'u1',
    );
    expect(ev.distinctId).toBe('anon-1');
    expect(ev.properties).toMatchObject({
      teacher_id: 'u1',
      user_id: 'u1',
      product: 'teacher_pro',
      $session_id: 'sess-9',
      analytics_identity_source: 'browser_cookie',
    });
  });

  it('Given no browser session, When stamped, Then no $session_id key is added', () => {
    const ev = withAnalyticsIdentity(
      { distinctId: 'u1', event: 'checkout_started', properties: {} },
      { distinctId: 'u1', sessionId: null, source: 'user_id' },
      'u1',
    );
    expect(ev.properties).not.toHaveProperty('$session_id');
    expect(ev.properties.analytics_identity_source).toBe('user_id');
  });
});

describe('withPolarMetadataIdentity', () => {
  const ev = { distinctId: 'u1', event: 'paid', properties: {} };
  it('Given the browser id in checkout metadata, Then the webhook event is that person, labelled polar_metadata', async () => {
    const { withPolarMetadataIdentity } = await import('../checkoutAnalyticsIdentity');
    const out = withPolarMetadataIdentity(ev, { posthog_distinct_id: 'anon-1' }, 'u1');
    expect(out.distinctId).toBe('anon-1');
    expect(out.properties).toMatchObject({ teacher_id: 'u1', analytics_identity_source: 'polar_metadata' });
  });
  it('Given no id, the cookieless sentinel or no user, Then the event is unchanged', async () => {
    const { withPolarMetadataIdentity } = await import('../checkoutAnalyticsIdentity');
    expect(withPolarMetadataIdentity(ev, undefined, 'u1')).toBe(ev);
    expect(withPolarMetadataIdentity(ev, { posthog_distinct_id: '$posthog_cookieless' }, 'u1')).toBe(ev);
    expect(withPolarMetadataIdentity(ev, { posthog_distinct_id: 'anon-1' }, undefined)).toBe(ev);
  });
  it('Given metadata carrying another account id (UUIDv4), Then the webhook event stays on the user id', async () => {
    const { withPolarMetadataIdentity } = await import('../checkoutAnalyticsIdentity');
    expect(withPolarMetadataIdentity(ev, { posthog_distinct_id: '3f2b8c1e-9a4d-4b7e-8c2f-1d5e6a7b8c9d' }, 'u1')).toBe(ev);
  });
});
