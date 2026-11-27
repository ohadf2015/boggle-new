import { AlertTriangle, CheckCircle2, CircleDashed, Moon, Sparkles, type LucideIcon } from 'lucide-react';
import type { StudentStatus } from '@/lib/education/pro/classInsights';

export const STATUSES: StudentStatus[] = ['needsHelp', 'inactive', 'notStarted', 'steady', 'thriving'];
export const ATTENTION: ReadonlySet<StudentStatus> = new Set(['needsHelp', 'inactive', 'notStarted']);

/** Colour is always paired with a distinct icon shape. */
export const STATUS_VIEW: Record<StudentStatus, { icon: LucideIcon; chip: string; text: string }> = {
  needsHelp: { icon: AlertTriangle, chip: 'border-neo-red bg-neo-red/10', text: 'text-neo-red' },
  inactive: { icon: Moon, chip: 'border-neo-yellow bg-neo-yellow/10', text: 'text-edu-yellow-ink' },
  notStarted: { icon: CircleDashed, chip: 'border-edu-line bg-edu-ink/5', text: 'text-edu-ink/80' },
  steady: { icon: CheckCircle2, chip: 'border-neo-cyan bg-neo-cyan/10', text: 'text-edu-cyan-ink' },
  thriving: { icon: Sparkles, chip: 'border-neo-lime bg-neo-lime/10', text: 'text-edu-lime-ink' },
};

export const pct = (v: number | null): number => Math.round((v ?? 0) * 100);

export function daysSince(date: string, today: string): number {
  return Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000));
}
