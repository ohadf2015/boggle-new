/**
 * Progress digest — last-lesson numbers a free teacher can already see,
 * laid out like a report so the Pro paywall has something real to sit under.
 *
 * Deliberately last-game only. Cross-game trends and printable PDFs stay
 * behind ProGate (`feature="reports"`). A digest that quietly needed Pro
 * data would be invisible to the teachers the edu funnel is for.
 */

import { deriveClassPulse, type ClassPulse, type ClassPulseInput } from './classPulse';

export interface ProgressDigest extends ClassPulse {
  /** Share of lesson words found by at least one student; null when unknown. */
  coveragePct: number | null;
}

export interface ProgressDigestInput extends ClassPulseInput {
  coveragePct?: number | null;
}

export function deriveProgressDigest({
  coveragePct,
  ...pulseInput
}: ProgressDigestInput): ProgressDigest {
  const pulse = deriveClassPulse(pulseInput);
  const hasLesson =
    pulse.state !== 'noRoster' && pulse.state !== 'neverPlayed' && pulse.state !== 'unknown';
  return {
    ...pulse,
    coveragePct: hasLesson ? (coveragePct ?? null) : null,
  };
}
