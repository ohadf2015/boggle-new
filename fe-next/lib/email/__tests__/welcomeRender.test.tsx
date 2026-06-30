// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from '@react-email/components';
import WelcomeEmail from '@/emails/welcome';
import { getWelcomeEmailModes } from '@/lib/email/welcomeModes';

const BASE = 'https://www.lexiclash.live';

function renderHtml(language: string) {
  const modes = getWelcomeEmailModes(language, BASE);
  return {
    modes,
    html: render(
      WelcomeEmail({
        recipientName: 'Maya',
        language,
        unsubscribeUrl: `${BASE}/api/email/unsubscribe?token=x`,
        playUrl: `${BASE}/${language}`,
        videoUrl: `${BASE}/${language}?tour=1`,
        baseUrl: BASE,
        modes,
      }),
    ),
  };
}

describe('WelcomeEmail — dynamic cube-image mode grid', () => {
  it('renders every public mode cube image as an <img>', async () => {
    const { modes, html } = renderHtml('en');
    const out = await html;
    for (const m of modes) {
      expect(out).toContain(m.cubeImageUrl);
    }
  });

  it('makes each mode tile a link to its route', async () => {
    const { modes, html } = renderHtml('en');
    const out = await html;
    for (const m of modes) {
      expect(out).toContain(`href="${m.href}"`);
    }
  });

  it('shows the localized mode title text', async () => {
    const { modes, html } = renderHtml('en');
    const out = await html;
    expect(out).toContain(modes[0].title); // "Multiplayer"
  });

  it('drops the rainbow gradient strip (less AI-slop colour)', async () => {
    const out = await renderHtml('en').html;
    expect(out).not.toContain('linear-gradient(90deg');
  });

  it('drops the old per-mode emoji badges', async () => {
    const out = await renderHtml('en').html;
    for (const emoji of ['🥊', '💥', '🎯', '🧩', '🗺️', '🏰', '👇', '✦']) {
      expect(out).not.toContain(emoji);
    }
  });

  it('gives every cube image a non-empty alt (blocked-image fallback)', async () => {
    const out = await renderHtml('en').html;
    // crude: no empty alt attributes on the cube imgs
    expect(out).not.toContain('alt=""');
  });

  it('renders in Hebrew (RTL) without throwing and links stay /he', async () => {
    const { modes, html } = renderHtml('he');
    const out = await html;
    expect(out).toContain(`${BASE}/he/multiplayer`);
    expect(modes.every((m) => m.href.includes('/he/'))).toBe(true);
  });

  it('never uses pure #000000 (Gmail dark-mode inverts it to white, killing the CTA)', async () => {
    // Gmail (Android) dark mode force-swaps pure #000000 → #FFFFFF. That turned
    // the lime CTA's dark text + border + hard-shadow white (unreadable on lime).
    // The whole email uses an off-black instead so dark mode leaves it alone.
    const out = await renderHtml('en').html;
    expect(out.toLowerCase()).not.toContain('#000000');
  });

  it('paints the CTA label in a dark off-black so it reads on the bright lime button', async () => {
    const out = await renderHtml('en').html;
    expect(out.toLowerCase()).toContain('#0a0a0a');
  });

  it('excludes the not-yet-public crossword mode from the grid', async () => {
    const { modes, html } = renderHtml('en');
    const out = await html;
    expect(modes.some((m) => m.key === 'crossword')).toBe(false);
    expect(out).not.toContain('/modes/cubes/crossword.png');
  });
});

describe('WelcomeEmail — Android app download callout', () => {
  it('links to the Google Play listing for the native Android app', async () => {
    const out = await renderHtml('en').html;
    expect(out).toContain(
      'https://play.google.com/store/apps/details?id=live.lexiclash.app',
    );
  });

  it('tags the Play Store link with a welcome-email install referrer (attribution)', async () => {
    const out = await renderHtml('en').html;
    expect(out).toContain('utm_campaign%3Dwelcome_email');
  });

  it('shows the localized "Get it on Google Play" call to action', async () => {
    const out = await renderHtml('en').html;
    expect(out).toContain('Get it on Google Play');
  });

  it('renders the Android callout in Hebrew (RTL) with a he attribution tag', async () => {
    const out = await renderHtml('he').html;
    expect(out).toContain(
      'https://play.google.com/store/apps/details?id=live.lexiclash.app',
    );
    expect(out).toContain('utm_content%3Dhe');
  });

  it('lets a caller override the Android URL', async () => {
    const out = await render(
      WelcomeEmail({
        recipientName: 'Maya',
        language: 'en',
        unsubscribeUrl: `${BASE}/api/email/unsubscribe?token=x`,
        playUrl: `${BASE}/en`,
        videoUrl: `${BASE}/en?tour=1`,
        baseUrl: BASE,
        androidUrl: 'https://play.google.com/store/apps/details?id=custom.override',
        modes: getWelcomeEmailModes('en', BASE),
      }),
    );
    expect(out).toContain('custom.override');
  });
});
