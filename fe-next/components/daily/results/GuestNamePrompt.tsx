'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { markGuestNameChosen } from '@/utils/guestManager';
import { isDefaultPlayerName } from '@/utils/defaultPlayerNames';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useGrowthRadarFlag } from '@/hooks/useGrowthRadarFlag';
import { proudHeadline } from './guestNameCopy';
import { MAX_GUEST_NAME_LENGTH, useGuestNameSave, type GuestNameT } from './useGuestNameSave';

// Growth Radar A/B (rec 11904): control = forced prompt, keep_name = skippable.
const SKIP_EXPERIMENT_KEY = 'daily-guest-name-skip';

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
 * Shown once, right after a guest's first daily finish: their result first,
 * then a live preview of their leaderboard row with the name they type.
 */
export function GuestNamePrompt({ name, guestFingerprint, rank, totalPlayers, onRenamed, onDone, t }: GuestNamePromptProps) {
  const isDefault = isDefaultPlayerName(name);
  // A generated name is not offered back; a name the guest typed elsewhere is.
  const [draft, setDraft] = useState(isDefault ? '' : name);
  const { save, saving, error } = useGuestNameSave(name, guestFingerprint, onRenamed, t);
  const canKeepName = useGrowthRadarFlag(SKIP_EXPERIMENT_KEY, true) === 'keep_name';
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    trackGrowthEvent('daily_guest_name_prompt_shown', { is_default: isDefault, rank: rank ?? null });
  }, [isDefault, rank]);

  const keepName = () => {
    markGuestNameChosen();
    trackGrowthEvent('daily_guest_name_kept', { is_default: isDefault });
    onDone();
  };

  const placeholder = t('wordHunt.results.guestNamePlaceholder', 'Your name');
  const preview = draft.trim() || (isDefault ? placeholder : name);

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        hideCloseButton
        noDescription
        className="max-w-sm"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <form
          data-testid="guest-name-prompt"
          className="flex flex-col gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save(draft, 'prompt').then((ok) => ok && onDone());
          }}
        >
          <DialogTitle className="font-neo-display font-black text-xl text-neo-lime">
            {proudHeadline(t, rank, totalPlayers)}
          </DialogTitle>
          <p className="text-sm font-bold text-neo-white">
            {t('wordHunt.results.guestNameProudBody', 'Put your name next to it so everyone sees who did it.')}
          </p>

          <div aria-hidden="true" data-testid="guest-name-preview" className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-neo-white/60">
              {t('wordHunt.results.guestNamePreviewLabel', "How you'll appear")}
            </span>
            <div className="flex items-center gap-2 px-3 py-2 rounded-neo border-2 border-neo-cyan bg-neo-cyan/20 shadow-hard-cyan">
              {rank ? <span className="font-neo-display font-black tabular-nums text-neo-cream">#{rank}</span> : null}
              <span className={`min-w-0 flex-1 truncate font-bold ${draft.trim() || !isDefault ? 'text-neo-cyan' : 'text-neo-white/40'}`}>
                {preview}
              </span>
              <span className="shrink-0 px-1.5 py-0.5 rounded-neo bg-neo-cyan text-neo-black text-[10px] font-black uppercase">
                {t('wordHunt.leaderboard.you', 'You')}
              </span>
            </div>
          </div>

          {isDefault && (
            <p data-testid="guest-name-default-hint" className="text-xs font-bold text-neo-yellow">
              {t('wordHunt.results.guestNameDefaultHint', 'Right now you show up as "{name}", a random name lots of players get.', { name })}
            </p>
          )}

          <div className="flex items-center gap-2">
            <input
              id="guest-name-prompt-input"
              type="text"
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_GUEST_NAME_LENGTH}
              autoComplete="nickname"
              enterKeyHint="done"
              autoFocus
              aria-label={t('wordHunt.results.guestNamePrompt', 'Save your score under your name')}
              className="flex-1 min-w-0 px-3 py-2 rounded-neo border-2 border-neo-cyan bg-neo-navy text-neo-white font-bold placeholder:text-neo-white/40"
            />
            <button
              type="submit"
              disabled={saving || !draft.trim()}
              className="shrink-0 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard-sm disabled:opacity-50"
            >
              {t('wordHunt.results.guestNameClaim', 'Show my name')}
            </button>
          </div>
          {error && <p role="alert" className="text-xs text-neo-red font-bold">{error}</p>}
          {canKeepName && (
            <button
              type="button"
              onClick={keepName}
              className="self-start text-xs font-bold opacity-70 underline underline-offset-2"
            >
              {t('wordHunt.results.guestNameKeep', 'Keep this name')}
            </button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
