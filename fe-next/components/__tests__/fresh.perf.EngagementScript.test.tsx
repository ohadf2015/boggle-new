/**
 * Piece D (perf), SPEC section 10 item 3: the GA4 gtag.js loader (~155KB br /
 * ~450KB parsed) must not download during first load. It now loads on the
 * visitor's first engagement (pointerdown / pointermove / keydown / touchstart /
 * scroll). Consent gating is untouched: GoogleConsentMode still defines
 * `window.gtag` + `dataLayer` inline before anything else, so every gtag()
 * call made before the script arrives is queued in dataLayer, not dropped.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, act } from '@testing-library/react';
import { EngagementScript, ENGAGEMENT_FALLBACK_MS } from '../EngagementScript';

const SRC = 'https://www.googletagmanager.com/gtag/js?id=G-TEST';
const scriptsFor = (src: string) =>
  Array.from(document.querySelectorAll('script')).filter((s) => s.getAttribute('src') === src);

describe('EngagementScript', () => {
  afterEach(() => {
    scriptsFor(SRC).forEach((s) => s.remove());
  });

  it('shouldNotInjectTheScriptOnFirstLoad', () => {
    // GIVEN the loader mounted in the layout
    render(<EngagementScript src={SRC} />);
    // THEN nothing is fetched before the visitor engages
    expect(scriptsFor(SRC)).toHaveLength(0);
  });

  it.each(['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll'])(
    'shouldInjectAnAsyncScriptOnTheFirst %s',
    (type) => {
      render(<EngagementScript src={SRC} />);
      act(() => {
        window.dispatchEvent(new Event(type));
      });
      const [script] = scriptsFor(SRC);
      expect(script).toBeTruthy();
      expect(script.async).toBe(true);
    },
  );

  it('shouldStillInjectForAVisitorWhoNeverEngages', () => {
    // GIVEN a visitor who lands and never touches the page (a bounce)
    vi.useFakeTimers();
    try {
      render(<EngagementScript src={SRC} />);
      // WHEN the fallback delay passes with no engagement
      act(() => {
        vi.advanceTimersByTime(ENGAGEMENT_FALLBACK_MS);
      });
      // THEN gtag.js still loads, so the pageview is not silently lost
      expect(scriptsFor(SRC)).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shouldInjectOnlyOnceAcrossManyEvents', () => {
    render(<EngagementScript src={SRC} />);
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('keydown'));
    });
    expect(scriptsFor(SRC)).toHaveLength(1);
  });

  it('shouldKeepQueuedGtagCallsInDataLayer', () => {
    // GIVEN the consent-mode stub (defined inline before this loader)
    const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
    w.dataLayer = [];
    w.gtag = function gtag() {
      w.dataLayer.push(arguments);
    };
    render(<EngagementScript src={SRC} />);
    // WHEN an event is tracked before the script loads
    w.gtag('event', 'early_event');
    // THEN it waits in the queue for gtag.js to replay
    expect(w.dataLayer).toHaveLength(1);
  });
});

describe('locale layout loads gtag.js on engagement', () => {
  it('shouldNotUseLazyOnloadForTheGtagLoader', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../app/[locale]/layout.tsx'), 'utf8');
    expect(src).not.toMatch(/<Script\s+src="https:\/\/www\.googletagmanager\.com\/gtag\/js/);
    expect(src).toMatch(/<EngagementScript\s+src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-7VLG16BJQH"/);
    // ga4-init (the inline dataLayer push) and consent mode stay as they were.
    expect(src).toContain('<Script id="ga4-init" strategy="lazyOnload">');
    expect(src).toContain('<GoogleConsentMode />');
  });
});
