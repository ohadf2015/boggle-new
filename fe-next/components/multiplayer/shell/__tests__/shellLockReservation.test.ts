/**
 * Cookie / bottom-stack reservations must not shrink a locked multiplayer shell.
 *
 * Same class of bug as the education shell (consentReservation.test.ts): a
 * 100dvh locked body with padding-bottom for a hidden nav, a suppressed
 * banner, or the cookie sheet leaves the lobby footer floating mid-screen
 * over an empty band, and the mode cards clip above it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.join(__dirname, '../../../../app/globals.css'), 'utf8');

const COOKIE_OPT_OUT = `html.has-cookie-consent body.screen-fit-locked,
html.has-cookie-consent body.mp-shell-locked`;
const BANNER_OPT_OUT = `html:is(.has-global-bottom-nav, .has-admob-banner, .has-web-anchor-ad) body.screen-fit-locked,
html:is(.has-global-bottom-nav, .has-admob-banner, .has-web-anchor-ad) body.mp-shell-locked`;

describe('bottom reservation vs the multiplayer shell lock', () => {
  it('cancels the cookie-sheet body reservation for mp-shell-locked and screen-fit-locked', () => {
    expect(css).toContain(COOKIE_OPT_OUT);
    const block = css.slice(css.indexOf(COOKIE_OPT_OUT), css.indexOf('}', css.indexOf(COOKIE_OPT_OUT)));
    expect(block).toMatch(/padding-bottom:\s*0\s*;/);
  });

  it('wins the cascade over the generic cookie reservation', () => {
    const generic = css.indexOf('html.has-cookie-consent body.screen-fit');
    expect(generic).toBeGreaterThan(-1);
    expect(css.indexOf(COOKIE_OPT_OUT)).toBeGreaterThan(generic);
  });

  it('reserves only a live banner height, never the nav floor or cookie sheet', () => {
    expect(css).toContain(BANNER_OPT_OUT);
    const block = css.slice(css.indexOf(BANNER_OPT_OUT), css.indexOf('}', css.indexOf(BANNER_OPT_OUT)));
    expect(block).toContain('--admob-banner-height');
    expect(block).not.toContain('--bottom-stack-height');
    expect(block).not.toContain('--cookie-consent-height');
  });

  it('wins over the generic banner reservation in the cascade', () => {
    const generic = css.indexOf('html.has-admob-banner body.screen-fit');
    expect(generic).toBeGreaterThan(-1);
    expect(css.indexOf(BANNER_OPT_OUT)).toBeGreaterThan(generic);
  });
});
