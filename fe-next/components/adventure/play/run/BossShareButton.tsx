'use client';

/**
 * Share the boss-defeat card from the run-complete screen.
 *
 * The art is the existing `/api/og/boss-defeat` renderer (it had no callers
 * until now). Three fallbacks, best first: native share WITH the image file →
 * native share of the link → clipboard. No emoji in the art or the text.
 */
import { useCallback, useState } from 'react';
import { Share2, Check, Loader2 } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { bossDefeatImageUrl, bossShareFilename, shareReady } from './bossShare';
import { cn } from '@/lib/utils';

interface Props {
  world: number;
  /** Best word of the run — stamped on the card as the killing blow. */
  word?: string | null;
  stars?: number | null;
  className?: string;
}

type State = 'idle' | 'busy' | 'copied';

export default function BossShareButton({ world, word, stars, className }: Props) {
  const { t } = useLanguageSafe();
  const { profile } = useAuth();
  const { playButtonClickSound } = useSoundEffects();
  const [state, setState] = useState<State>('idle');

  // The gate the broken share capture asked for. A run whose world, killing
  // word or star count has not resolved yet CANNOT be shared: the card would
  // rasterize with holes in it, and a share image is the one artifact that
  // travels. Disabled is honest; a placeholder card is not.
  const ready = shareReady({ world, word, player: '', stars });

  const share = useCallback(async () => {
    if (state === 'busy' || !ready) return;
    playButtonClickSound?.();
    setState('busy');
    const path = bossDefeatImageUrl({
      world,
      word: word ?? '',
      player: profile?.display_name ?? profile?.username ?? '',
      stars,
    });
    const url = typeof window !== 'undefined' ? new URL(path, window.location.origin).toString() : path;
    const text = t('adventurePlay.eco.shareText', { world });

    try {
      const file = await fetch(url)
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => (b ? new File([b], bossShareFilename(world), { type: b.type || 'image/png' }) : null))
        .catch(() => null);
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        setState('idle');
        return;
      }
      if (navigator.share) {
        await navigator.share({ text, url });
        setState('idle');
        return;
      }
      await navigator.clipboard.writeText(url);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      // A cancelled share sheet throws too — just go quiet, never alarm.
      setState('idle');
    }
  }, [state, ready, playButtonClickSound, world, word, profile, stars, t]);

  const Icon = state === 'busy' ? Loader2 : state === 'copied' ? Check : Share2;
  // Icon-only, matching the map button beside it: the label is the widest word
  // in several locales ("Поделиться", and the copied state is wider still), so
  // a labelled button would resize the run-complete row mid-tap at 390px.
  return (
    <button
      type="button"
      onClick={() => void share()}
      disabled={!ready}
      data-testid="boss-share"
      aria-label={state === 'copied' ? t('adventurePlay.eco.shareCopied') : t('adventurePlay.eco.share')}
      title={t('adventurePlay.eco.share')}
      className={cn(
        'shrink-0 rounded-xl border-[3px] border-black bg-neo-pink p-3 text-black shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_#000]',
        !ready && 'cursor-not-allowed opacity-50 active:translate-y-0 active:shadow-[4px_4px_0_#000]',
        className,
      )}
    >
      <Icon className={cn('h-5 w-5', state === 'busy' && 'animate-spin')} aria-hidden />
    </button>
  );
}
