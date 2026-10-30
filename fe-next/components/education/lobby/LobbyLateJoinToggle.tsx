'use client';

import { DoorOpen } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

/** Whether students can still join once the round has started (server `allowLateJoin`). */
export function LobbyLateJoinToggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-neo border-2 border-neo-cream/35 bg-neo-navy-light px-3 py-2">
      <span className="flex min-w-0 flex-col">
        <span id="lobby-late-join-label" className="inline-flex items-center gap-1.5 font-neo-display text-sm font-bold text-neo-cream">
          <DoorOpen className="size-4 text-neo-cream/70" strokeWidth={3} aria-hidden="true" />
          {label}
        </span>
        <span className="font-neo-body text-xs text-neo-cream/70">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export default LobbyLateJoinToggle;
