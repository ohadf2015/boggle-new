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
});
