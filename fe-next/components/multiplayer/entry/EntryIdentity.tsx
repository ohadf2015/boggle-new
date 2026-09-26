'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, Dices, Pencil } from 'lucide-react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { EloRankBadge } from '@/components/multiplayer/EloRankBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useEntryIdentity, type EntryIdentityInput } from './useEntryIdentity';
import { useEntrySfx } from './useEntrySfx';

const EntryAvatarBuilder = dynamic(() => import('./EntryAvatarBuilder'), { ssr: false });

const MAX_NAME = 20;
/** Rendered once at the largest size; CSS sizes it per breakpoint (64 phone · 112 desktop · 160 TV). */
const AVATAR_PX = 160;

/*
 * Shared by the ready card and its placeholder, so the swap never shifts.
 * TV sizes are stacked on desktop-tall (`desktop-tall:tv:*`): the stylesheet
 * emits desktop-tall utilities after tv ones, so a bare `tv:` value for a
 * property desktop-tall also sets never applies (tvVariantOrder.test.ts).
 */
// On a tall desktop / TV the card takes the column's spare height (content
// centred), so the left column runs top-to-bottom like the arenas beside it.
const CARD =
  'relative flex items-center gap-3 rounded-neo-lg border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard desktop-tall:flex-1 desktop-tall:flex-col desktop-tall:justify-center desktop-tall:gap-3 desktop-tall:px-6 desktop-tall:py-6 desktop-tall:text-center desktop-tall:tv:py-10';
const AVATAR_SLOT = 'relative shrink-0';
const AVATAR_BOX =
  'block h-16 w-16 desktop-tall:h-28 desktop-tall:w-28 desktop-tall:tv:h-40 desktop-tall:tv:w-40 overflow-hidden rounded-full border-3 border-neo-black';
const TEXT_COL = 'min-w-0 flex-1 desktop-tall:w-full desktop-tall:flex-none';
const TAGLINE =
  'hidden desktop-tall:block mb-1 font-neo-display text-3xl tv:text-5xl font-bold uppercase tracking-tight text-neo-lime';
const LABEL = 'block text-[11px] tv:text-base font-bold uppercase tracking-[0.15em] text-neo-cyan';
const NAME_ROW =
  'w-full pe-8 font-neo-display! desktop-tall:text-3xl! desktop-tall:tv:text-5xl! font-bold desktop-tall:ps-8 desktop-tall:text-center border-b-3 pb-0.5';
// One line height per breakpoint whatever the phone font size, so a long name
// (smaller type) never changes the row — or the card — height. Listed AFTER
// the size in cn(): tailwind-merge drops a leading-* that precedes a text-*.
const NAME_LEADING = 'leading-8! desktop-tall:leading-9! desktop-tall:tv:leading-none!';

/**
 * Phone type size for the name: at 24px Fredoka the field shows ~16 characters
 * and generated guest names run longer ("Unhinged Flamingo"), so it steps down
 * rather than clipping the player's own name. Desktop and TV have the room.
 */
function nameSizeClass(name: string): string {
  if (name.length > 17) return 'text-lg!';
  if (name.length > 14) return 'text-xl!';
  return 'text-2xl!';
}

/**
 * Identity is part of the entry (Gartic's strongest move, DESIGN §a): a 64px
 * avatar with a reroll badge (guests), an inline name field, and a rank badge
 * when signed in. Renders a same-size placeholder until storage and auth have
 * resolved, so nothing shifts and no guest identity flashes.
 */
export function EntryIdentity(props: EntryIdentityInput) {
  const { t } = useLanguage();
  const id = useEntryIdentity(props);
  const sfx = useEntrySfx();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [spin, setSpin] = useState(0);

  if (!id.ready || !id.avatar) {
    // Same rows, same classes as the ready card (contents hidden): the entry is
    // SSR'd with this placeholder, so any row it lacks is a layout shift on swap.
    return (
      <div data-testid="entry-identity-skeleton" aria-hidden="true" className={CARD}>
        <div data-slot="avatar" className={AVATAR_SLOT}>
          <div className={cn(AVATAR_BOX, 'bg-neo-navy')} />
        </div>
        <div data-slot="text" className={TEXT_COL}>
          <p data-slot="tagline" className={cn(TAGLINE, 'invisible')}>{t('mpUi.entry.tagline')}</p>
          <p data-slot="label" className={cn(LABEL, 'invisible')}>{t('mpUi.entry.playingAs')}</p>
          <div className={cn(NAME_ROW, 'text-2xl!', NAME_LEADING, 'border-neo-white/10 text-transparent')}>&nbsp;</div>
        </div>
      </div>
    );
  }

  const avatarKey = `${id.avatar.bgColor ?? ''}${id.avatar.skinColor ?? ''}${spin}`;

  return (
    <div data-testid="entry-identity" className={CARD}>
      <div data-slot="avatar" className={AVATAR_SLOT}>
        <button
          type="button"
          onClick={() => setBuilderOpen(true)}
          aria-label={t('mpUi.entry.editAvatar')}
          className="group block rounded-full focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
        >
          <span
            key={avatarKey}
            className={cn(AVATAR_BOX, 'bg-neo-navy shadow-hard-sm transition-transform duration-150 group-hover:-rotate-3 group-active:scale-95 animate-mp-stamp')}
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
              sfx.pop();
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

      <div data-slot="text" className={TEXT_COL}>
        <p data-slot="tagline" aria-hidden="true" className={TAGLINE}>
          {t('mpUi.entry.tagline')}
        </p>
        <label data-slot="label" htmlFor="entry-name" className={LABEL}>
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
              NAME_ROW,
              nameSizeClass(id.name),
              NAME_LEADING,
              'bg-transparent text-neo-white outline-hidden transition-colors placeholder:text-neo-white/50',
              id.error ? 'border-neo-red motion-safe:animate-neo-shake' : 'border-neo-white/25 focus:border-neo-lime',
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
