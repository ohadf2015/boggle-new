/**
 * One decision for "what do we ask this teacher to do about Teacher Pro", shared by
 * every entry point (class-ready card, results card, access-success page) so the
 * wording and the checkout mode can never drift apart.
 *
 * Rules (PRs #1439 / #1440):
 * - inside the free access trial  -> "Keep Teacher Pro after your free trial"
 *   (checkout trial runs only to the end of the access window, server-side)
 * - access trial already ended    -> straight $9/mo, no trial wording
 * - Polar trial already used      -> plain upgrade
 * - never trialed / unknown read  -> the 14-day trial
 */
import { accessTrialLive, keepAfterTrialCopy } from '@/lib/education/pro/keepAfterTrialCopy';
import { trialEndedCopy } from '@/lib/education/pro/trialEndedCopy';
import type { ResultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';

export type ProOfferKind = 'trial' | 'keep_after_trial' | 'paid';

export interface ProOfferState {
  /** True only after a successful status read. */
  known: boolean;
  trialUsed: boolean;
  accessTrialExpires: string | null;
  accessTrialEnded: boolean;
}

export interface ProOffer {
  offer: ProOfferKind;
  /** Browser/server `cta` value: the trial ask, or a plain Teacher Pro ask. */
  cta: 'teacher_pro_trial' | 'teacher_pro';
  /** Button text. */
  label: string;
  /** Line under the button. */
  note: string;
  /** Card heading override (keep / ended); null keeps the placement's own title. */
  title: string | null;
  /** Whether the checkout POST should ask for the trial (server still caps the days). */
  checkoutTrial: boolean;
}

export function resolveProOffer(language: string, state: ProOfferState, base: ResultsTrialCopy): ProOffer {
  // An unknown read still offers the trial: /teacher/upgrade and the checkout route re-check eligibility.
  const ended = state.accessTrialEnded === true && !accessTrialLive(state.accessTrialExpires);
  const offerTrial = !(state.known && state.trialUsed) && !ended;
  if (offerTrial && accessTrialLive(state.accessTrialExpires)) {
    const keep = keepAfterTrialCopy(language, state.accessTrialExpires);
    return { offer: 'keep_after_trial', cta: 'teacher_pro_trial', label: keep.cta, note: keep.note, title: keep.title, checkoutTrial: true };
  }
  if (ended) {
    const e = trialEndedCopy(language);
    return { offer: 'paid', cta: 'teacher_pro', label: e.cta, note: e.note, title: e.title, checkoutTrial: false };
  }
  if (offerTrial) {
    return { offer: 'trial', cta: 'teacher_pro_trial', label: base.trialCta, note: base.trialNote, title: null, checkoutTrial: true };
  }
  return { offer: 'paid', cta: 'teacher_pro', label: base.upgradeCta, note: base.upgradeNote, title: null, checkoutTrial: false };
}
