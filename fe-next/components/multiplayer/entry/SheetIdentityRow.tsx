'use client';

import { useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { useSheetIdentity } from './useSheetIdentity';

/**
 * "Playing as [avatar] Name ✎" — or the name field when there is no usable name
 * yet (or the player tapped ✎). Shared by the create and join sheets.
 */
export function SheetIdentityRow({ id, onEnter }: {
  id: ReturnType<typeof useSheetIdentity>;
  onEnter?: () => void;
}) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const editing = !id.nameKnown;

  useEffect(() => {
    if (id.error) inputRef.current?.focus();
  }, [id.error]);

  return (
    <div className="flex items-center gap-3 tv:gap-4 rounded-neo border-2 border-neo-black bg-neo-navy p-2.5 tv:p-4">
      <span className="h-12 w-12 tv:h-[72px] tv:w-[72px] shrink-0 overflow-hidden rounded-full border-2 border-neo-black bg-neo-navy-light">
        {id.avatar && (
          <AvatarRenderer config={id.avatar} size={72} mode="multiplayer" circular disableEffects className="h-full w-full" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] tv:text-base font-bold uppercase tracking-[0.15em] text-neo-cyan">{t('mpUi.entry.playingAs')}</p>
        {editing ? (
          <>
            <input
              ref={inputRef}
              value={id.name}
              onChange={(e) => id.setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
              maxLength={20}
              dir="auto"
              autoComplete="nickname"
              aria-label={t('mpUi.entry.nameAria')}
              aria-invalid={id.error ? true : undefined}
              placeholder={t('mpUi.entry.namePlaceholder')}
              className={cn(
                'w-full bg-transparent font-neo-display! text-xl! tv:text-3xl! font-bold text-neo-white outline-hidden border-b-3 pb-0.5 placeholder:text-neo-white/50',
                id.error ? 'border-neo-red motion-safe:animate-neo-shake' : 'border-neo-white/25 focus:border-neo-lime',
              )}
            />
            {id.error && (
              <p role="alert" className="mt-1 text-xs tv:text-base font-bold text-neo-red">{t(id.error)}</p>
            )}
          </>
        ) : (
          <p dir="auto" className="truncate font-neo-display text-xl tv:text-3xl font-bold text-neo-white">{id.name}</p>
        )}
      </div>
      {!editing && (
        <button
          type="button"
          onClick={id.editName}
          aria-label={t('mpUi.entry.editName')}
          className="flex h-10 w-10 tv:h-14 tv:w-14 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white shadow-hard-sm active:translate-y-0.5 active:shadow-hard-pressed"
        >
          <Pencil aria-hidden="true" className="h-4 w-4 tv:h-6 tv:w-6" />
        </button>
      )}
    </div>
  );
}
