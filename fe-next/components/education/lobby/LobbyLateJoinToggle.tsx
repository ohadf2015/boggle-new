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
    <div className="flex items-center justify-between gap-3 rounded-neo border-[2px] border-neo-cream/70 bg-neo-navy/80 px-3 py-2">
      <span className="flex min-w-0 flex-col">
        <span id="lobby-late-join-label" className="inline-flex items-center gap-1.5 font-neo-display text-xs font-black uppercase text-neo-white/80">
          <DoorOpen className="size-4 text-neo-cyan" strokeWidth={3} aria-hidden="true" />
          {label}
        </span>
        <span className="font-neo-body text-xs text-neo-cream/70">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export default LobbyLateJoinToggle;
