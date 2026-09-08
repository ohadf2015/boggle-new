import { describe, it, expect } from 'vitest';
import {
  buildMissGapWhatsAppCardShareUrl,
  buildMissGapWhatsAppCardPath,
  buildMissGapWhatsAppDeepLink,
  buildMissGapWhatsAppOgImageUrl,
  canShareMissGapWhatsApp,
  MISS_GAP_WHATSAPP_UTM,
} from '../missGapWhatsAppShare';

const input = {
  locale: 'en',
  lessonNames: ['Physics 101'],
  teacherName: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
  dueDate: '2026-09-15',
};

describe('missGapWhatsAppShare', () => {
  it('builds an absolute parent card URL on lexiclash.live with due + WhatsApp UTMs', () => {
    const url = buildMissGapWhatsAppCardShareUrl(input);
    expect(url.startsWith('https://www.lexiclash.live/en/education/miss-gap-whatsapp?')).toBe(
      true,
    );
    const u = new URL(url);
    expect(u.searchParams.get('lesson')).toBe('Physics 101');
    expect(u.searchParams.get('teacher')).toBe('Ms. Cohen');
    expect(u.searchParams.get('missed')).toBe('neutron,quark');
    expect(u.searchParams.get('due')).toBe('2026-09-15');
    expect(u.searchParams.get('lang')).toBe('en');
    expect(u.searchParams.get('utm_source')).toBe(MISS_GAP_WHATSAPP_UTM.utm_source);
    expect(u.searchParams.get('utm_medium')).toBe(MISS_GAP_WHATSAPP_UTM.utm_medium);
    expect(u.searchParams.get('utm_campaign')).toBe(MISS_GAP_WHATSAPP_UTM.utm_campaign);
    expect(url).not.toContain('Maya');
    expect(url).not.toContain('lexiclash.com');
  });

  it('builds a relative in-app path', () => {
    const path = buildMissGapWhatsAppCardPath(input);
    expect(path.startsWith('/en/education/miss-gap-whatsapp?')).toBe(true);
    expect(path).toContain('due=2026-09-15');
    expect(path).toContain('neutron');
  });

  it('builds a wa.me deep link with parent text + card URL', () => {
    const deep = buildMissGapWhatsAppDeepLink({
      text: 'Physics 101 — practise miss-gap words with your child: neutron, quark',
      input,
    });
    expect(deep.startsWith('https://wa.me/?text=')).toBe(true);
    const decoded = decodeURIComponent(deep.slice('https://wa.me/?text='.length));
    expect(decoded).toContain('Physics 101');
    expect(decoded).toContain('neutron');
    expect(decoded).toContain('/education/miss-gap-whatsapp');
    expect(decoded).toContain('due=2026-09-15');
    expect(decoded).toContain('utm_source=whatsapp');
  });

  it('reuses #972 OG image art for WhatsApp unfurls', () => {
    const url = buildMissGapWhatsAppOgImageUrl(input);
    expect(url.startsWith('https://www.lexiclash.live/api/og/miss-gap-practice?')).toBe(true);
    expect(url).toContain('neutron');
  });

  it('accepts already-normalized MissGapAssignmentPayload', () => {
    const url = buildMissGapWhatsAppCardShareUrl({
      locale: 'he',
      lesson: 'פיזיקה',
      teacher: 'גב׳ כהן',
      found: 1,
      total: 2,
      missedWords: ['קווארק'],
      dueDate: '2026-09-20',
    });
    expect(url).toContain('/he/education/miss-gap-whatsapp?');
    expect(new URL(url).searchParams.get('lang')).toBe('he');
    expect(new URL(url).searchParams.get('due')).toBe('2026-09-20');
  });

  it('canShareMissGapWhatsApp requires at least one missed word', () => {
    expect(canShareMissGapWhatsApp(input)).toBe(true);
    expect(
      canShareMissGapWhatsApp({
        ...input,
        missedWords: [],
      }),
    ).toBe(false);
  });
});
