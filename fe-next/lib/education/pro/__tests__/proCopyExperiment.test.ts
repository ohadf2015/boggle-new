import { describe, it, expect } from 'vitest';
import {
  PRO_COPY_LOCALES,
  PRO_COPY_PLACEMENTS,
  proCopyLines,
  proCopyVariant,
  proOfferStage,
  type ProCopyVariant,
} from '@/lib/education/pro/proCopyExperiment';
import { resolveProOffer, type ProOfferState } from '@/lib/education/pro/proOfferCopy';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';

const DAY = 24 * 60 * 60 * 1000;
const NEVER: ProOfferState = { known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false };
const LIVE = (): ProOfferState => ({ ...NEVER, accessTrialExpires: new Date(Date.now() + 5 * DAY).toISOString() });
const ENDED: ProOfferState = { ...NEVER, accessTrialEnded: true };
const USED: ProOfferState = { ...NEVER, trialUsed: true };
const offerFor = (l: string, s: ProOfferState) => resolveProOffer(l, s, resultsTrialCopy(l));

describe('proCopyVariant (edu_pro_copy_v1 bucket)', () => {
  it('is deterministic per teacher id and defaults to b without one', () => {
    expect(proCopyVariant('3f2a9c4e-1111-4222-8333-444455556666')).toBe(proCopyVariant('3f2a9c4e-1111-4222-8333-444455556666'));
    expect(proCopyVariant(null)).toBe('b');
    expect(proCopyVariant(undefined)).toBe('b');
    expect(proCopyVariant('')).toBe('b');
  });

  it('splits teachers roughly 50/50', () => {
    let a = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (proCopyVariant(`teacher-${i}-${(i * 2654435761) >>> 0}`) === 'a') a++;
    expect(a / n).toBeGreaterThan(0.46);
    expect(a / n).toBeLessThan(0.54);
  });

  it('covers the results, class-ready and dashboard surfaces, not access_success', () => {
    expect([...PRO_COPY_PLACEMENTS].sort()).toEqual(['class_created', 'classroom_results', 'dashboard']);
  });
});

describe('proCopyLines', () => {
  it('maps every resolveProOffer outcome to its single-trial stage', () => {
    expect(proOfferStage(offerFor('en', NEVER))).toBe('never_trialed');
    expect(proOfferStage(offerFor('en', LIVE()))).toBe('access_trial_live');
    expect(proOfferStage(offerFor('en', ENDED))).toBe('access_trial_ended');
    expect(proOfferStage(offerFor('en', USED))).toBe('trial_used');
  });

  it('variant a leads with class reports and the $9/mo price', () => {
    const a = proCopyLines('en', 'a', offerFor('en', NEVER));
    expect(a.title).toBe('Keep your class reports — $9/mo');
    expect(a.body).toMatch(/who-struggled report.*word mastery.*CSV export/);
    expect(proCopyLines('en', 'a', offerFor('en', ENDED)).title).toBe('Get your class reports back — $9/mo');
  });

  it('variant b leads with the 14-day trial only for teachers who never had one', () => {
    expect(proCopyLines('en', 'b', offerFor('en', NEVER)).title).toBe('Try Teacher Pro free for 14 days');
    expect(proCopyLines('en', 'b', offerFor('en', NEVER), { placement: 'class_created' }).title).toBe('Try Teacher Pro free with your new class');
  });

  it('inside the free access trial both variants say "Keep Teacher Pro after your free trial", never a new trial', () => {
    const live = LIVE();
    for (const v of ['a', 'b'] as ProCopyVariant[]) {
      const c = proCopyLines('en', v, offerFor('en', live), { accessTrialExpires: live.accessTrialExpires });
      expect(c.title).toMatch(/Keep Teacher Pro after your free trial/i);
      expect(`${c.title} ${c.body}`).not.toMatch(/14|Try Teacher Pro free|Start your/);
      expect(c.body).not.toMatch(/\{date\}/);
    }
  });

  it('access trial ended or Polar trial used: no trial wording at all, straight $9/mo', () => {
    for (const state of [ENDED, USED]) {
      for (const v of ['a', 'b'] as ProCopyVariant[]) {
        const c = proCopyLines('en', v, offerFor('en', state));
        expect(`${c.title} ${c.body}`).not.toMatch(/14|Try Teacher Pro free|Start your|free for/);
      }
    }
  });

  it('has complete copy in all 6 locales for every variant and stage, with no unfilled placeholders', () => {
    expect(PRO_COPY_LOCALES.sort()).toEqual(['en', 'es', 'he', 'ja', 'ru', 'sv']);
    const live = LIVE();
    for (const l of PRO_COPY_LOCALES) {
      for (const v of ['a', 'b'] as ProCopyVariant[]) {
        for (const [state, placement] of [[NEVER, 'classroom_results'], [NEVER, 'class_created'], [live, 'dashboard'], [ENDED, 'classroom_results'], [USED, 'dashboard']] as const) {
          const c = proCopyLines(l, v, offerFor(l, state), { accessTrialExpires: state.accessTrialExpires, placement });
          expect(c.title.length).toBeGreaterThan(5);
          expect(c.body.length).toBeGreaterThan(5);
          expect(`${c.title}${c.body}`).not.toMatch(/\{\w+\}/);
        }
        // Trial length only appears for a never-trialed teacher in variant b.
        const ended = proCopyLines(l, v, offerFor(l, ENDED));
        expect(`${ended.title}${ended.body}`).not.toContain('14');
        const a = proCopyLines(l, 'a', offerFor(l, NEVER));
        expect(a.title).toContain('$9');
        expect(a.body).toContain('CSV');
      }
      expect(proCopyLines(l, 'b', offerFor(l, NEVER)).title).toContain('14');
    }
  });

  it('isolates the Hebrew price for RTL and falls back to English for unknown locales', () => {
    expect(proCopyLines('he', 'a', offerFor('he', NEVER)).title).toContain('\u2066$9\u2069');
    expect(proCopyLines('xx', 'a', offerFor('xx', NEVER)).title).toBe('Keep your class reports — $9/mo');
  });
});
