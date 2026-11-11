import { describe, expect, it } from 'vitest';
import { renderNeoEmail, type NeoEmail } from '../neoEmail';

const base: NeoEmail = {
  lang: 'en',
  dir: 'ltr',
  preheader: 'Your class is one minute away',
  accent: 'lime',
  art: 'projector',
  kicker: 'For teachers',
  headline: 'Your class is <ready>',
  greeting: 'Hi Dana,',
  blocks: [
    { type: 'p', text: 'Lead line', strong: true },
    { type: 'callout', title: 'Tip', text: 'Press practice first' },
    { type: 'stats', items: [{ value: '12', label: 'students' }, { value: '3', label: 'rounds' }] },
    { type: 'steps', items: ['Make a class', 'Share the code'] },
    { type: 'tiles', word: 'PLAY' },
  ],
  cta: { label: 'Open my class', href: 'https://www.lexiclash.live/en/teacher?a=1&b=2' },
  secondary: { label: 'See the guide', href: 'https://www.lexiclash.live/en/guide' },
  signoff: 'Ohad, who built LexiClash',
  unsubscribe: { label: 'Unsubscribe', href: 'https://www.lexiclash.live/u/abc' },
};

describe('renderNeoEmail', () => {
  it('escapes user text and keeps every block as live text', () => {
    const html = renderNeoEmail(base);
    expect(html).toContain('Your class is &lt;ready&gt;');
    for (const s of ['Lead line', 'Press practice first', '12', 'students', 'Make a class', 'Open my class', 'See the guide', 'Unsubscribe']) {
      expect(html).toContain(s);
    }
    expect(html).not.toMatch(/undefined|\[object/);
  });

  it('draws the hard shadow on the reading-end side and flips it for RTL', () => {
    const ltr = renderNeoEmail(base);
    const rtl = renderNeoEmail({ ...base, lang: 'he', dir: 'rtl' });
    expect(ltr).toContain('border-right-width:7px');
    expect(rtl).toContain('border-left-width:7px');
    expect(rtl).toContain('dir="rtl"');
  });

  it('serves art as an absolute https PNG with empty alt', () => {
    const html = renderNeoEmail(base);
    expect(html).toMatch(/<img[^>]+src="https:\/\/www\.lexiclash\.live\/email\/art\/projector\.png"[^>]+alt=""/);
  });

  it('renders one letter tile per character', () => {
    const html = renderNeoEmail(base);
    expect(html.match(/data-tile/g)).toHaveLength(4);
  });

  it('lays tiles out in the word’s own script direction, not the email’s', () => {
    const rtl = renderNeoEmail({ ...base, dir: 'rtl', blocks: [{ type: 'tiles', word: 'PLAY' }, { type: 'tiles', word: 'שלום' }] });
    expect(rtl).toMatch(/dir="ltr"[^>]*><tr><td data-tile[^>]*>.{0,400}>P</s);
    expect(rtl).toMatch(/dir="rtl"[^>]*><tr><td data-tile[^>]*>.{0,400}>ש</s);
  });

  it('keeps line breaks inside a callout', () => {
    const html = renderNeoEmail({ ...base, blocks: [{ type: 'callout', text: 'line one\nline <two>' }] });
    expect(html).toContain('line one<br>line &lt;two&gt;');
  });

  it('never uses pure black, which Gmail Android dark mode inverts', () => {
    expect(renderNeoEmail(base).toLowerCase()).not.toMatch(/#000000\b|#000\b/);
  });

  it('omits optional parts cleanly', () => {
    const html = renderNeoEmail({ ...base, art: undefined, secondary: undefined, unsubscribe: undefined, greeting: undefined, signoff: undefined });
    expect(html).not.toContain('/email/art/');
    expect(html).not.toContain('Unsubscribe');
    expect(html.length).toBeLessThan(40_000);
  });
});
