/**
 * Spanish INP p75 is 432ms against English 216ms and we cannot say why.
 *
 * Ruled out with measurements 2026-08-29: message-catalogue size (Hebrew's is
 * BIGGER at INP 184), page weight (/es transfers 2.28MB vs /en 2.84MB),
 * dictionary parse (66ms, and the chunked alternative is 4x slower), and chunk
 * mix (identical top scripts under a 4x-throttled LoAF probe, which showed no
 * meaningful es/en gap at all).
 *
 * It does not reproduce locally, and `web_vitals.metadata` stores only
 * `navigationTiming` — no interaction target, no phase breakdown. So the field
 * data literally cannot answer the question. This adds the attribution that can.
 */
import { describe, it, expect } from 'vitest';
import { summarizeInpAttribution } from '../inpAttribution';

const attribution = {
  interactionTarget: '#play-button',
  interactionType: 'pointer',
  interactionTime: 4321.5,
  inputDelay: 180.4,
  processingDuration: 42.2,
  presentationDelay: 96.9,
  loadState: 'dom-interactive',
  longAnimationFrameEntries: [
    {
      duration: 210,
      blockingDuration: 160,
      scripts: [
        { sourceURL: 'https://x/_next/static/chunks/aaa.js', duration: 120, invoker: 'x.onclick' },
        { sourceURL: 'https://x/_next/static/chunks/bbb.js', duration: 40, invoker: 'y' },
      ],
    },
  ],
};

describe('summarizeInpAttribution', () => {
  it('keeps the fields that localise a slow interaction', () => {
    const s = summarizeInpAttribution(attribution)!;
    expect(s.target).toBe('#play-button');
    expect(s.type).toBe('pointer');
    expect(s.loadState).toBe('dom-interactive');
    // Rounded — sub-millisecond precision is noise and bloats every row.
    expect(s.inputDelay).toBe(180);
    expect(s.processingDuration).toBe(42);
    expect(s.presentationDelay).toBe(97);
  });

  it('names the single most expensive script, which is the actual lead', () => {
    const s = summarizeInpAttribution(attribution)!;
    expect(s.topScript).toBe('/_next/static/chunks/aaa.js');
    expect(s.topScriptMs).toBe(120);
    expect(s.blockingDuration).toBe(160);
  });

  it('strips the origin so rows group across locales and deploys', () => {
    const s = summarizeInpAttribution({
      ...attribution,
      longAnimationFrameEntries: [{
        duration: 1, blockingDuration: 0,
        scripts: [{ sourceURL: 'https://www.lexiclash.live/_next/static/chunks/z.js', duration: 5, invoker: 'a' }],
      }],
    })!;
    expect(s.topScript).toBe('/_next/static/chunks/z.js');
  });

  it('truncates an over-long interaction target rather than storing an essay', () => {
    const s = summarizeInpAttribution({ ...attribution, interactionTarget: 'div'.repeat(200) })!;
    expect(s.target!.length).toBeLessThanOrEqual(120);
  });

  it('survives a browser that reports no LoAF entries', () => {
    const s = summarizeInpAttribution({ ...attribution, longAnimationFrameEntries: [] })!;
    expect(s.topScript).toBeUndefined();
    expect(s.blockingDuration).toBe(0);
    expect(s.target).toBe('#play-button');
  });

  it('returns undefined when there is no attribution at all', () => {
    expect(summarizeInpAttribution(undefined)).toBeUndefined();
    expect(summarizeInpAttribution({})).toBeUndefined();
  });
});
