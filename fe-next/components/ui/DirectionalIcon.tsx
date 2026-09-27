import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * An icon whose horizontal direction is meaningful (back/forward arrows,
 * exit icons) — auto-flips in RTL so it points toward the correct edge.
 *
 * Flip rule is icon-shape-aware:
 * - Symmetric arrows (ArrowLeft/ChevronRight/…) → `rtl:rotate-180` (default).
 * - Asymmetric directional icons (LogOut = door + arrow) → pass `mirror`,
 *   which uses `rtl:scale-x-[-1]`. Rotating those would flip them upside-down.
 *
 * Relies on the ancestor `<html dir="rtl">` set from the active locale.
 */
interface DirectionalIconProps {
  icon: LucideIcon;
  className?: string;
  /** Mirror instead of rotate — for asymmetric icons (e.g. LogOut). */
  mirror?: boolean;
}

export function DirectionalIcon({ icon: Icon, className, mirror }: DirectionalIconProps) {
  return (
    <Icon
      aria-hidden="true"
      className={cn(className, mirror ? 'rtl:scale-x-[-1]' : 'rtl:rotate-180')}
    />
  );
}
