export type HelpAccent = 'lime' | 'pink' | 'cyan' | 'purple' | 'yellow' | 'orange';

/** Literal class names so Tailwind's scanner sees every one. */
export const HELP_ACCENT: Record<HelpAccent, { bg: string; text: string; border: string }> = {
  lime: { bg: 'bg-neo-lime', text: 'text-edu-lime-ink', border: 'border-neo-lime' },
  pink: { bg: 'bg-neo-pink', text: 'text-edu-pink-ink', border: 'border-neo-pink' },
  cyan: { bg: 'bg-neo-cyan', text: 'text-edu-cyan-ink', border: 'border-neo-cyan' },
  purple: { bg: 'bg-neo-purple', text: 'text-edu-purple-ink', border: 'border-neo-purple' },
  yellow: { bg: 'bg-neo-yellow', text: 'text-edu-yellow-ink', border: 'border-neo-yellow' },
  orange: { bg: 'bg-neo-orange', text: 'text-edu-orange-ink', border: 'border-neo-orange' },
};

/** Ink that stays readable on each accent fill. */
export const HELP_ACCENT_INK: Record<HelpAccent, string> = {
  lime: 'text-neo-navy',
  pink: 'text-edu-ink',
  cyan: 'text-neo-navy',
  purple: 'text-edu-ink',
  yellow: 'text-neo-navy',
  orange: 'text-neo-navy',
};
