'use client';

import { useState } from 'react';
import { Globe, Lock, Users } from 'lucide-react';
import type { RoomVisibility } from '@/shared/types/game';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'lc-room-visibility';

const OPTIONS = [
  { value: 'public', icon: Globe, label: 'mpUi.entry.visibilityPublic', hint: 'mpUi.entry.visibilityPublicHint' },
  { value: 'friends', icon: Users, label: 'mpUi.entry.visibilityFriends', hint: 'mpUi.entry.visibilityFriendsHint' },
  { value: 'private', icon: Lock, label: 'mpUi.entry.visibilityPrivate', hint: 'mpUi.entry.visibilityPrivateHint' },
] as const;

export function readStoredVisibility(): RoomVisibility {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'friends' || v === 'private' ? v : 'public';
  } catch {
    return 'public';
  }
}

export function storeVisibility(v: RoomVisibility): void {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch { /* private mode: the choice just isn't remembered */ }
}

export function RoomVisibilityPicker({ value, onChange, friendsLocked, t }: {
  value: RoomVisibility;
  onChange: (v: RoomVisibility) => void;
  friendsLocked: boolean;
  t: (key: string) => string;
}) {
  const [showLockReason, setShowLockReason] = useState(false);
  const hint = showLockReason ? 'mpUi.entry.visibilityFriendsGuest' : OPTIONS.find((o) => o.value === value)!.hint;

  return (
    <div>
      <p id="create-visibility-label" className="mb-2 text-[11px] tv:text-base font-bold uppercase tracking-[0.15em] text-neo-white/85">{t('mpUi.entry.visibility')}</p>
      <div className="grid grid-cols-3 gap-2 tv:gap-3" role="radiogroup" aria-labelledby="create-visibility-label">
        {OPTIONS.map(({ value: v, icon: Icon, label }) => {
          const active = v === value;
          const locked = v === 'friends' && friendsLocked;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={locked || undefined}
              data-testid={`create-visibility-${v}`}
              onClick={() => {
                setShowLockReason(locked);
                if (!locked) onChange(v);
              }}
              className={cn(
                'flex h-11 tv:h-16 min-w-0 items-center justify-center gap-1.5 rounded-neo border-2 px-2 font-neo-display text-sm tv:text-xl font-bold shadow-hard-sm transition-transform duration-100 active:translate-y-0.5 active:shadow-hard-pressed',
                active ? 'border-neo-black bg-neo-lime text-neo-black' : 'border-neo-cream/40 bg-neo-navy text-neo-white',
                locked && 'opacity-50',
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4 tv:h-6 tv:w-6 shrink-0" />
              <span className="truncate">{t(label)}</span>
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-1.5 text-xs tv:text-lg text-neo-white/70">{t(hint)}</p>
    </div>
  );
}
