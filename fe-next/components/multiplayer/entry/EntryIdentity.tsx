'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, Dices, Pencil } from 'lucide-react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { EloRankBadge } from '@/components/multiplayer/EloRankBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useEntryIdentity, type EntryIdentityInput } from './useEntryIdentity';

const EntryAvatarBuilder = dynamic(() => import('./EntryAvatarBuilder'), { ssr: false });

const MAX_NAME = 20;
/** Rendered once at the largest size; CSS sizes it per breakpoint (64 phone · 112 desktop · 160 TV). */
const AVATAR_PX = 160;

/**
 * Identity is part of the entry (Gartic's strongest move, DESIGN §a): a 64px
 * avatar with a reroll badge (guests), an inline name field, and a rank badge
 * when signed in. Renders a same-size placeholder until storage and auth have
 * resolved, so nothing shifts and no guest identity flashes.
 */
export function EntryIdentity(props: EntryIdentityInput) {
  const { t } = useLanguage();
  const id = useEntryIdentity(props);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [spin, setSpin] = useState(0);

  const card =
    'relative flex items-center gap-3 rounded-neo-lg border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard desktop-tall:flex-col desktop-tall:gap-3 desktop-tall:px-6 desktop-tall:py-6 desktop-tall:text-center tv:py-10';

  if (!id.ready || !id.avatar) {
    return (
      <div data-testid="entry-identity-skeleton" aria-hidden="true" className={card}>
        <div className="h-16 w-16 desktop-tall:h-28 desktop-tall:w-28 tv:h-40 tv:w-40 shrink-0 rounded-full border-3 border-neo-black bg-neo-navy" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-3 w-20 rounded bg-neo-navy" />
          <div className="h-7 w-40 max-w-full rounded bg-neo-navy" />
        </div>
      </div>
    );
  }

  const avatarKey = `${id.avatar.bgColor ?? ''}${id.avatar.skinColor ?? ''}${spin}`;

  return (
    <div data-testid="entry-identity" className={card}>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setBuilderOpen(true)}
          aria-label={t('mpUi.entry.editAvatar')}
          className="group block rounded-full focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
        >
          <span
            key={avatarKey}
            className="block h-16 w-16 desktop-tall:h-28 desktop-tall:w-28 tv:h-40 tv:w-40 overflow-hidden rounded-full border-3 border-neo-black bg-neo-navy shadow-hard-sm transition-transform duration-150 group-hover:-rotate-3 group-active:scale-95 animate-mp-stamp"
          >
            <AvatarRenderer config={id.avatar} size={AVATAR_PX} mode="multiplayer" circular className="h-full w-full" />
          </span>
          {!id.canReroll && (
            <span className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-neo-black bg-neo-cyan shadow-hard-sm">
              <Pencil aria-hidden="true" className="h-3 w-3 text-neo-black" />
            </span>
          )}
        </button>
        {id.canReroll && (
          <button
            type="button"
            onClick={() => {
              id.reroll();
              setSpin((s) => s + 1);
            }}
            aria-label={t('mpUi.entry.rerollAvatar')}
            className="absolute -bottom-1.5 -end-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-neo-black bg-neo-yellow text-neo-black shadow-hard-sm transition-transform hover:scale-110 active:scale-90 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
          >
            <Dices
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-300 motion-reduce:transition-none"
              style={{ transform: `rotate(${spin * 180}deg)` }}
            />
          </button>
        )}
      </div>

      <div className="min-w-0 flex-1 desktop-tall:w-full desktop-tall:flex-none">
        <p aria-hidden="true" className="hidden desktop-tall:block mb-1 font-neo-display text-3xl tv:text-5xl font-bold uppercase tracking-tight text-neo-lime">
          {t('mpUi.entry.tagline')}
        </p>
        <label htmlFor="entry-name" className="block text-[11px] tv:text-base font-bold uppercase tracking-[0.15em] text-neo-cyan">
          {t('mpUi.entry.playingAs')}
        </label>
        <div className="relative">
          <input
            id="entry-name"
            value={id.name}
            onChange={(e) => id.setName(e.target.value)}
            onBlur={id.commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                id.commitName();
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            maxLength={MAX_NAME}
            dir="auto"
            autoComplete="nickname"
            enterKeyHint="done"
            aria-label={t('mpUi.entry.nameAria')}
            aria-invalid={id.error ? true : undefined}
            aria-describedby={id.error ? 'entry-name-error' : undefined}
            placeholder={t('mpUi.entry.namePlaceholder')}
            className={cn(
              'w-full bg-transparent pe-8 font-neo-display! text-2xl! desktop-tall:text-3xl! tv:text-5xl! font-bold text-neo-white outline-hidden desktop-tall:ps-8 desktop-tall:text-center',
              'border-b-3 pb-0.5 transition-colors placeholder:text-neo-white/50',
              id.error ? 'border-neo-red animate-neo-shake' : 'border-neo-white/25 focus:border-neo-lime',
            )}
          />
          {id.saved && (
            <span
              data-testid="entry-name-saved"
              aria-hidden="true"
              className="absolute end-0 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-neo-black bg-neo-lime animate-mp-stamp"
            >
              <Check className="h-3.5 w-3.5 text-neo-black" />
            </span>
          )}
        </div>
        {id.error && (
          <p id="entry-name-error" role="alert" className="mt-1 text-xs font-bold text-neo-red">
            {t(id.error)}
          </p>
        )}
      </div>

      {id.rating != null && (
        <div className="shrink-0 self-start desktop-tall:absolute desktop-tall:top-3 desktop-tall:end-3">
          <EloRankBadge rating={id.rating} size="compact" />
        </div>
      )}

      {builderOpen && (
        <EntryAvatarBuilder
          isOpen={builderOpen}
          onClose={() => setBuilderOpen(false)}
          onSave={id.saveAvatar}
          initialConfig={id.avatar}
          isAuthenticated={props.isAuthenticated}
        />
      )}
    </div>
  );
}
