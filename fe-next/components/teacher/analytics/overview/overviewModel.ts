import { AlertTriangle, CheckCircle2, CircleDashed, Moon, Sparkles, type LucideIcon } from 'lucide-react';
import type { StudentStatus } from '@/lib/education/pro/classInsights';

export const STATUSES: StudentStatus[] = ['needsHelp', 'inactive', 'notStarted', 'steady', 'thriving'];
export const ATTENTION: ReadonlySet<StudentStatus> = new Set(['needsHelp', 'inactive', 'notStarted']);

/** Colour is always paired with a distinct icon shape. `chip` is a solid fill with its own ink; `text` colours a bare icon on cream. */
export const STATUS_VIEW: Record<StudentStatus, { icon: LucideIcon; chip: string; text: string }> = {
  needsHelp: { icon: AlertTriangle, chip: 'border-neo-black bg-neo-red text-neo-black', text: 'text-edu-pink-ink' },
  inactive: { icon: Moon, chip: 'border-neo-black bg-neo-yellow text-neo-black', text: 'text-edu-yellow-ink' },
  notStarted: { icon: CircleDashed, chip: 'border-edu-line bg-edu-tile text-edu-ink', text: 'text-edu-ink/80' },
  steady: { icon: CheckCircle2, chip: 'border-neo-black bg-neo-cyan text-neo-black', text: 'text-edu-cyan-ink' },
  thriving: { icon: Sparkles, chip: 'border-neo-black bg-neo-lime text-neo-black', text: 'text-edu-lime-ink' },
};

export const pct = (v: number | null): number => Math.round((v ?? 0) * 100);

export function daysSince(date: string, today: string): number {
  return Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000));
}
