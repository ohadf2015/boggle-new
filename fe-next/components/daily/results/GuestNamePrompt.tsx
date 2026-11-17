'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { isDefaultPlayerName } from '@/utils/defaultPlayerNames';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { proudRankLine } from './guestNameCopy';
import { MAX_GUEST_NAME_LENGTH, useGuestNameSave, type GuestNameT } from './useGuestNameSave';

interface GuestNamePromptProps {
  name: string;
  guestFingerprint: string | null;
  rank?: number | null;
  totalPlayers?: number | null;
  onRenamed: (name: string) => void;
  onDone: () => void;
  t: GuestNameT;
}

/**
 * An inline card in the results, after a guest's first daily finish: the name field is their
 * leaderboard row, so what they type is how they will appear. It never covers the result.
 */
export function GuestNamePrompt({ name, guestFingerprint, rank, totalPlayers, onRenamed, onDone, t }: GuestNamePromptProps) {
  const isDefault = isDefaultPlayerName(name);
  // A generated name is not offered back; a name the guest typed elsewhere is.
  const [draft, setDraft] = useState(isDefault ? '' : name);
  const { save, saving, error } = useGuestNameSave(name, guestFingerprint, onRenamed, t);
  const shownRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rankLine = proudRankLine(t, rank, totalPlayers);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    trackGrowthEvent('daily_guest_name_prompt_shown', { is_default: isDefault, rank: rank ?? null });
  }, [isDefault, rank]);

  return (
    <form
      data-testid="guest-name-prompt"
      className="w-full flex flex-col gap-2 mb-3 p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.trim()) {
          inputRef.current?.focus();
          return;
        }
        void save(draft, 'prompt').then((ok) => ok && onDone());
      }}
    >
      <div>
        <h3 data-testid="guest-name-headline" className="font-neo-display font-black text-lg leading-tight text-neo-lime">
          {t('wordHunt.results.guestNameProudOnBoard', "You made today's leaderboard!")}
        </h3>
        <p data-testid="guest-name-rank-line" className="min-h-[1.25rem] text-sm font-black text-neo-cyan">
          {rankLine}
        </p>
      </div>
      <p className="text-sm font-bold text-neo-white">
        {t('wordHunt.results.guestNameProudBody', 'Put your name next to it so everyone sees who did it.')}
      </p>

      <label
        data-testid="guest-name-row"
        htmlFor="guest-name-prompt-input"
        className="flex items-center gap-2 px-3 py-2 rounded-neo border-2 border-neo-cyan bg-neo-cyan/20 shadow-hard-cyan focus-within:ring-2 focus-within:ring-neo-lime"
      >
        {rank ? <span className="font-neo-display font-black tabular-nums text-neo-cream">#{rank}</span> : null}
        <input
          ref={inputRef}
          id="guest-name-prompt-input"
          type="text"
          value={draft}
          placeholder={t('wordHunt.results.guestNamePlaceholder', 'Your name')}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_GUEST_NAME_LENGTH}
          autoComplete="nickname"
          enterKeyHint="done"
          aria-label={t('wordHunt.results.guestNamePrompt', 'Save your score under your name')}
          className="min-w-0 flex-1 bg-transparent font-bold text-neo-cyan placeholder:text-neo-white/40 outline-none"
        />
        <span className="shrink-0 px-1.5 py-0.5 rounded-neo bg-neo-cyan text-neo-black text-[10px] font-black uppercase">
          {t('wordHunt.leaderboard.you', 'You')}
        </span>
      </label>

      {isDefault && (
        <p data-testid="guest-name-default-hint" className="text-xs font-medium text-neo-white/60">
          {t('wordHunt.results.guestNameDefaultHint', 'Right now you show up as "{name}", a random name lots of players get.', { name })}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className={cn(
          'self-stretch px-4 py-2.5 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-neo-display font-black uppercase tracking-wide shadow-hard',
          'active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
          saving && 'cursor-wait',
        )}
      >
        {t('wordHunt.results.guestNameClaim', 'Show my name')}
      </button>
      {error && <p role="alert" className="text-xs text-neo-red font-bold">{error}</p>}
    </form>
  );
}
