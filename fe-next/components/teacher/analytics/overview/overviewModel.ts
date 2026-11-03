import { AlertTriangle, CheckCircle2, CircleDashed, Moon, Sparkles, type LucideIcon } from 'lucide-react';
import type { StudentStatus } from '@/lib/education/pro/classInsights';

export const STATUSES: StudentStatus[] = ['needsHelp', 'inactive', 'notStarted', 'steady', 'thriving'];
export const ATTENTION: ReadonlySet<StudentStatus> = new Set(['needsHelp', 'inactive', 'notStarted']);

/** Colour is always paired with a distinct icon shape. */
export const STATUS_VIEW: Record<StudentStatus, { icon: LucideIcon; chip: string; text: string }> = {
  needsHelp: { icon: AlertTriangle, chip: 'border-neo-red bg-neo-red/10', text: 'text-neo-red' },
  inactive: { icon: Moon, chip: 'border-neo-yellow bg-neo-yellow/10', text: 'text-neo-yellow' },
  notStarted: { icon: CircleDashed, chip: 'border-neo-cream/50 bg-neo-cream/5', text: 'text-neo-cream/80' },
  steady: { icon: CheckCircle2, chip: 'border-neo-cyan bg-neo-cyan/10', text: 'text-neo-cyan' },
  thriving: { icon: Sparkles, chip: 'border-neo-lime bg-neo-lime/10', text: 'text-neo-lime' },
};

export const pct = (v: number | null): number => Math.round((v ?? 0) * 100);

export function daysSince(date: string, today: string): number {
  return Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000));
}
