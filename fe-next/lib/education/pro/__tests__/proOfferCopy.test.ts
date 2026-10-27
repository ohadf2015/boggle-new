import { describe, it, expect } from 'vitest';
import { resolveProOffer, type ProOfferState } from '../proOfferCopy';
import { classCreatedTrialCopy, resultsTrialCopy } from '../trialCtaCopy';
import { keepAfterTrialCopy } from '../keepAfterTrialCopy';
import { trialEndedCopy } from '../trialEndedCopy';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
const never: ProOfferState = { known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false };
const future = () => new Date(Date.now() + 9 * 86400_000).toISOString();

describe('resolveProOffer: one wording for every Teacher Pro entry', () => {
  it.each(LOCALES)('%s: never-trialed gets the 14-day trial, in-trial keeps Pro, ended goes to $9/mo', (l) => {
    const base = classCreatedTrialCopy(l);
    const trial = resolveProOffer(l, never, base);
    expect(trial).toMatchObject({ offer: 'trial', cta: 'teacher_pro_trial', label: base.trialCta, checkoutTrial: true });
    const exp = future();
    const keep = resolveProOffer(l, { ...never, accessTrialExpires: exp }, base);
    expect(keep).toMatchObject({ offer: 'keep_after_trial', label: keepAfterTrialCopy(l, exp).cta, checkoutTrial: true });
    const ended = resolveProOffer(l, { ...never, accessTrialEnded: true }, base);
    expect(ended).toMatchObject({ offer: 'paid', cta: 'teacher_pro', label: trialEndedCopy(l).cta, checkoutTrial: false });
    expect(new Set([trial.label, keep.label, ended.label]).size).toBe(3);
  });

  it('class-ready and results placements agree on every button and note', () => {
    for (const l of LOCALES) {
      const a = resolveProOffer(l, never, classCreatedTrialCopy(l));
      const b = resolveProOffer(l, never, { ...resultsTrialCopy(l) });
      expect(a.label).toBe(b.label);
      expect(a.note).toBe(b.note);
    }
  });

  it('an unknown read still offers the trial; a used trial gets the plain upgrade', () => {
    const base = classCreatedTrialCopy('en');
    expect(resolveProOffer('en', { ...never, known: false, trialUsed: true }, base).offer).toBe('trial');
    expect(resolveProOffer('en', { ...never, trialUsed: true }, base)).toMatchObject({ offer: 'paid', cta: 'teacher_pro', checkoutTrial: false });
  });

  it('an access trial that lapsed in the past is treated as ended', () => {
    const base = classCreatedTrialCopy('en');
    const r = resolveProOffer('en', { ...never, accessTrialExpires: new Date(Date.now() - 1000).toISOString(), accessTrialEnded: true }, base);
    expect(r.offer).toBe('paid');
  });
});
