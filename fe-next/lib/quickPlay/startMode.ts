import { QUICK_MODES, type QuickMode } from '@/components/quick-play/types';
import type { WheelSelection } from '@/components/quick-play/wheelGeometry';

const ALIASES: Record<string, QuickMode> = { hunt: 'word-hunt', wheel: 'wheel-rush' };

export function parseQuickPlayStartMode(param: string | null | undefined): WheelSelection | null {
  if (!param) return null;
  if (param === 'random') return 'random';
  if ((QUICK_MODES as readonly string[]).includes(param)) return param as QuickMode;
  return ALIASES[param] ?? null;
}

export function quickPlayHref(lang: string, mode: WheelSelection): string {
  return `/${lang}/quick-play?mode=${mode}`;
}
