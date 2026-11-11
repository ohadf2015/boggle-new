import { describe, it, expect } from 'vitest';
import { playerWelcome, getWelcomeSubject } from '../playerWelcome';
import { getWelcomeEmailModes } from '@/lib/email/welcomeModes';

const BASE = 'https://www.lexiclash.live';
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

function build(language: string, extra: { androidUrl?: string; recipientName?: string } = {}) {
  const modes = getWelcomeEmailModes(language, BASE);
  return {
    modes,
    ...playerWelcome({
      recipientName: extra.recipientName ?? 'Maya',
      language,
      unsubscribeUrl: `${BASE}/api/email/unsubscribe?token=x`,
      playUrl: `${BASE}/${language}`,
      videoUrl: `${BASE}/${language}?tour=1`,
      baseUrl: BASE,
      androidUrl: extra.androidUrl,
      modes,
    }),
  };
}

describe('playerWelcome', () => {
  it.each(LOCALES)('%s uses the neo layout with the welcome art and a hard-shadow button', (lang) => {
    const { html, subject, text } = build(lang);
    expect(html).toContain('/email/art/welcome.png');
    expect(html).toMatch(/border-(right|left)-width:6px/);
    expect(html).not.toMatch(/undefined|\[object|NaN/);
    expect(subject).toContain('Maya');
    expect(subject.length).toBeLessThanOrEqual(55);
    expect(html).toContain(`href="${BASE}/${lang}"`);
    expect(html).toContain(`${BASE}/api/email/unsubscribe?token=x`);
    expect(text).toContain(`${BASE}/api/email/unsubscribe?token=x`);
    expect(text).toContain(`${BASE}/${lang}`);
    expect(html).toContain(`href="${BASE}/${lang}/privacy"`);
  });

  it('keeps the subject helper for the admin preview and senders', () => {
    expect(getWelcomeSubject('en', 'Maya')).toContain('Maya');
    expect(getWelcomeSubject('fr', 'Maya')).toBe(getWelcomeSubject('en', 'Maya'));
  });

  it('renders every public mode cube image, linked to its route, with alt text', () => {
    const { modes, html } = build('en');
    for (const m of modes) {
      expect(html).toContain(m.cubeImageUrl);
      expect(html).toContain(`href="${m.href}"`);
      expect(html).toContain(`alt="${m.title}"`);
    }
    expect(html).toContain('Multiplayer');
  });

  it('lists the modes in the plain-text version too', () => {
    const { modes, text } = build('en');
    for (const m of modes) expect(text).toContain(m.href);
  });

  it('keeps the in-inbox tour clip linked to the video URL', () => {
    const { html } = build('en');
    expect(html).toContain(`${BASE}/email/welcome-video.gif`);
    expect(html).toContain(`href="${BASE}/en?tour=1"`);
  });

  it('excludes the not-yet-public crossword mode', () => {
    const { modes, html } = build('en');
    expect(modes.some((m) => m.key === 'crossword')).toBe(false);
    expect(html).not.toContain('/modes/cubes/crossword.png');
  });

  it('has no per-mode emoji badges or gradient strip', () => {
    const { html } = build('en');
    for (const emoji of ['🥊', '💥', '🎯', '🧩', '🗺️', '🏰', '👇', '✦']) expect(html).not.toContain(emoji);
    expect(html).not.toContain('linear-gradient');
  });

  it('renders Hebrew right-to-left with /he links', () => {
    const { modes, html } = build('he');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(`${BASE}/he/multiplayer`);
    expect(modes.every((m) => m.href.includes('/he/'))).toBe(true);
    expect(html).not.toContain('Play now');
  });

  it('renders Russian with Cyrillic copy and /ru links', () => {
    const { html } = build('ru');
    expect(html).toContain(`${BASE}/ru/multiplayer`);
    expect(/[Ѐ-ӿ]/.test(html)).toBe(true);
  });

  it('links the Android app with a welcome-email install referrer per locale', () => {
    const en = build('en').html;
    expect(en).toContain('https://play.google.com/store/apps/details?id=live.lexiclash.app');
    expect(en).toContain('utm_campaign%3Dwelcome_email');
    expect(en).toContain('Get it on Google Play');
    expect(build('he').html).toContain('utm_content%3Dhe');
  });

  it('lets a caller override the Android URL', () => {
    const { html } = build('en', { androidUrl: 'https://play.google.com/store/apps/details?id=custom.override' });
    expect(html).toContain('custom.override');
  });

  it('escapes a hostile display name', () => {
    const { html } = build('en', { recipientName: '<script>x</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
