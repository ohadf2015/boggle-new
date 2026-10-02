export type HelpAccent = 'lime' | 'pink' | 'cyan' | 'purple' | 'yellow' | 'orange';

/** Literal class names so Tailwind's scanner sees every one. */
export const HELP_ACCENT: Record<HelpAccent, { bg: string; text: string; border: string }> = {
  lime: { bg: 'bg-neo-lime', text: 'text-neo-lime', border: 'border-neo-lime' },
  pink: { bg: 'bg-neo-pink', text: 'text-neo-pink', border: 'border-neo-pink' },
  cyan: { bg: 'bg-neo-cyan', text: 'text-neo-cyan', border: 'border-neo-cyan' },
  purple: { bg: 'bg-neo-purple', text: 'text-neo-purple', border: 'border-neo-purple' },
  yellow: { bg: 'bg-neo-yellow', text: 'text-neo-yellow', border: 'border-neo-yellow' },
  orange: { bg: 'bg-neo-orange', text: 'text-neo-orange', border: 'border-neo-orange' },
};

/** Ink that stays readable on each accent fill. */
export const HELP_ACCENT_INK: Record<HelpAccent, string> = {
  lime: 'text-neo-navy',
  pink: 'text-neo-white',
  cyan: 'text-neo-navy',
  purple: 'text-neo-white',
  yellow: 'text-neo-navy',
  orange: 'text-neo-navy',
};
