import { neoInfoToast, neoWarningToast } from '@/components/NeoToast';

/**
 * Server-side refusals that say nothing about the word itself. They get their
 * own message instead of "not a word", and they never cost the combo.
 */
const SERVER_REFUSALS: Record<string, { key: string; tone: 'info' | 'warn' }> = {
  frozen: { key: 'mpUi.round.rejectFrozen', tone: 'info' },
  boss_frozen: { key: 'mpUi.round.rejectFrozen', tone: 'info' },
  rate_limited: { key: 'mpUi.round.rejectRateLimited', tone: 'warn' },
  error: { key: 'mpUi.round.rejectError', tone: 'warn' },
};

/** Shows the refusal and returns true, or returns false for a real word rejection. */
export function showServerRefusal(reason: unknown, t: (key: string) => string): boolean {
  const refusal = typeof reason === 'string' ? SERVER_REFUSALS[reason] : undefined;
  if (!refusal) return false;
  const show = refusal.tone === 'info' ? neoInfoToast : neoWarningToast;
  show(t(refusal.key), { id: `mp-refusal-${refusal.key}`, duration: 2000 });
  return true;
}
