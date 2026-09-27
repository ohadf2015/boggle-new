/**
 * The cookie sheet must not SHRINK a shell-locked screen.
 *
 * Measured live on `/en/teacher` at 390x844, first visit: the consent sheet
 * sets `html.has-cookie-consent` + `--cookie-consent-height: 398px`, and the
 * reservation rule pads `body.screen-fit` by that amount. On an ordinary
 * scrolling page that is right — content shifts up clear of the fixed band.
 * On a shell-locked page it is exactly wrong: the shell is sized to the
 * viewport, so 398px of body padding does not move anything up, it takes 398px
 * AWAY. The shell computed 446px tall inside an 844px viewport and the bottom
 * tab bar floated mid-screen with the last rows of content clipped — the
 * "content clipped and unreachable" symptom in the overlay notes, and pitfall
 * class 1 (two owners of one value; the later writer wins and nobody notices).
 *
 * So the education shell opts out of the body reservation and takes it on its
 * own scroll region instead: the page still never scrolls, the tab bar stays
 * at the bottom of the viewport, and the last row of scrollable content still
 * clears the sheet.
 *
 * Read as source rather than rendered: these are cascade facts (specificity and
 * document order), which jsdom does not resolve for arbitrary stylesheets.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const css = readFileSync(path.join(ROOT, 'app', 'globals.css'), 'utf8');

const OPT_OUT = 'html.has-cookie-consent body.edu-shell-locked';
const RESERVE = 'html.has-cookie-consent .edu-shell-scroll';

describe('cookie-consent reservation vs the education shell', () => {
  it('cancels the body-level reservation for a shell-locked screen', () => {
    expect(css).toContain(OPT_OUT);
  });

  it('wins the cascade: same specificity, so it must come later in the file', () => {
    // `html.has-cookie-consent body.screen-fit` and the opt-out are both
    // (0,2,2). Document order is the only tiebreak.
    const generic = css.indexOf('html.has-cookie-consent body.screen-fit');
    const optOut = css.indexOf(OPT_OUT);
    expect(generic).toBeGreaterThan(-1);
    expect(optOut).toBeGreaterThan(generic);
  });

  it('still keeps the bottom-stack (nav / ad banner) reservation', () => {
    const block = css.slice(css.indexOf(OPT_OUT), css.indexOf(OPT_OUT) + 240);
    expect(block).toContain('--bottom-stack-height');
    expect(block).not.toContain('--cookie-consent-height');
  });

  it('moves the sheet reservation onto the one region that scrolls', () => {
    expect(css).toContain(RESERVE);
    const block = css.slice(css.indexOf(RESERVE), css.indexOf(RESERVE) + 200);
    expect(block).toContain('--cookie-consent-height');
  });

  it('tags the scroll region so that rule has something to match', () => {
    const shell = readFileSync(
      path.join(ROOT, 'components', 'education', 'shell', 'EducationShell.tsx'),
      'utf8',
    );
    expect(shell).toContain('edu-shell-scroll');
  });
});
