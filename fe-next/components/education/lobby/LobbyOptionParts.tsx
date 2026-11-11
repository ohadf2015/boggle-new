'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

/** One titled group in the Game options sheet. */
export function LobbyOptionGroup({ id, title, icon: Icon, children, testId }: { id: string; title: string; icon: LucideIcon; children: ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} aria-labelledby={id} className="flex flex-col gap-2.5 rounded-neo-lg border-2 border-neo-cream/35 bg-neo-navy-light p-3 @3xl/opts:p-4">
      <h3 id={id} className="flex items-center gap-2 font-neo-display text-base font-bold text-neo-cream">
        <Icon className="size-5 shrink-0 text-neo-cream/70" strokeWidth={2.5} aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A real on/off row: the whole label is the switch's name, the hint sits under it. */
export function LobbySwitchRow({ testId, label, hint, checked, onChange, disabled }: { testId: string; label: string; hint?: string; checked: boolean; onChange: (on: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-t border-neo-cream/15 pt-2 first-of-type:border-t-0 first-of-type:pt-0">
      <span className="flex min-w-0 flex-col">
        <span className="font-neo-body text-sm font-bold text-neo-cream">{label}</span>
        {hint ? <span className="font-neo-body text-xs leading-snug text-neo-cream/70">{hint}</span> : null}
      </span>
      <Switch data-testid={testId} checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
    </div>
  );
}
