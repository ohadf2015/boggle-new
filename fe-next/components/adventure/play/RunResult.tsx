'use client';

/** End-of-run card: stars pop in, rewards, world-skin reveal on a boss win, next/retry/map. */
import { useEffect } from 'react';
import { Star, RotateCcw, Map as MapIcon, ChevronRight } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { getCollectibleById } from '@/lib/adventure/collectibleConfig';
import { WORLD_SKIN_ITEM } from '@/lib/adventure/play/progress';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import BossDefeatFireworks from '@/components/celebration/BossDefeatFireworks';
import type { RunResult as Result } from './useAdventureRun';
import SkinSwatch from './SkinSwatch';
import { cn } from '@/lib/utils';

interface Props {
  world: number;
  isBoss: boolean;
  result: Result;
  hasNext: boolean;
  onNext: () => void;
  onRetry: () => void;
  onMap: () => void;
  onEquipSkin: (world: number) => void;
}

export default function RunResult({ world, isBoss, result, hasNext, onNext, onRetry, onMap, onEquipSkin }: Props) {
  const { t } = useLanguageSafe();
  const { playVictorySound, playDefeatSound, playBossDefeatSound } = useSoundEffects();
  const skinWon = result.rewards.includes(WORLD_SKIN_ITEM(world));

  useEffect(() => {
    if (!result.won) { playDefeatSound?.(); return; }
    if (isBoss) playBossDefeatSound?.(); else playVictorySound?.();
    if (result.stars >= 2) fireVictoryConfetti();
  }, [result, isBoss, playVictorySound, playDefeatSound, playBossDefeatSound]);

  const title = result.won
    ? t(isBoss ? 'adventurePlay.victory' : 'adventurePlay.cleared')
    : t(isBoss ? 'adventurePlay.defeat' : 'adventurePlay.failed');

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/70">
      {isBoss && result.won && <BossDefeatFireworks active bossTier={world >= 8 ? 'elite' : world >= 4 ? 'standard' : 'mini'} />}
      <div className="relative w-full max-w-sm rounded-2xl border-[3px] border-black bg-[#1a1a2e] shadow-[6px_6px_0_#000] p-5 text-center">
        <h2 className="font-neo-display font-bold text-2xl text-neo-cream">{title}</h2>

        <div className="mt-4 flex justify-center gap-3" aria-label={t('adventurePlay.starsEarned', { stars: result.stars })}>
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              className={cn(
                'w-12 h-12 stroke-black stroke-[2.5]',
                n <= result.stars ? 'fill-neo-yellow animate-[adv-pop_0.45s_ease-out_both]' : 'fill-white/10',
              )}
              style={{ animationDelay: `${n * 180}ms` }}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-neo-cream">
          <div className="rounded-xl border-2 border-black bg-black/40 py-2">
            <div className="text-xs opacity-70">{t('adventurePlay.score')}</div>
            <div className="font-neo-display text-xl font-bold tabular-nums">{result.score}</div>
          </div>
          <div className="rounded-xl border-2 border-black bg-black/40 py-2">
            <div className="text-xs opacity-70">{t('adventurePlay.words')}</div>
            <div className="font-neo-display text-xl font-bold tabular-nums">{result.validWords.length}</div>
          </div>
        </div>

        {skinWon && (
          <div className="mt-4 rounded-xl border-[3px] border-black bg-neo-yellow p-3 text-black">
            <div className="font-neo-display font-bold">{t('adventurePlay.skinUnlocked')}</div>
            <div className="mt-2 flex justify-center"><SkinSwatch world={world} /></div>
            <button
              type="button"
              onClick={() => onEquipSkin(world)}
              className="mt-2 w-full rounded-lg border-2 border-black bg-black text-neo-yellow font-bold py-2 active:translate-y-0.5"
            >
              {t('adventurePlay.equipSkin')}
            </button>
          </div>
        )}

        {result.rewards.filter((id) => id !== WORLD_SKIN_ITEM(world)).length > 0 && (
          <div className="mt-3 text-start">
            <div className="text-xs font-bold text-neo-cream/70 uppercase tracking-wide">{t('adventurePlay.newItems')}</div>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {result.rewards.filter((id) => id !== WORLD_SKIN_ITEM(world)).map((id) => {
                const item = getCollectibleById(id);
                return (
                  <li key={id} className="rounded-full border-2 border-black bg-neo-cyan text-black text-xs font-bold px-2.5 py-1">
                    {item ? t(item.nameKey) : id}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onMap} aria-label={t('adventurePlay.backToMap')}
            className="rounded-xl border-[3px] border-black bg-neo-cream text-black p-3 shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none">
            <MapIcon className="w-5 h-5" />
          </button>
          <button type="button" onClick={onRetry}
            className="flex-1 rounded-xl border-[3px] border-black bg-neo-cyan text-black font-bold py-3 shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none inline-flex items-center justify-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> {t('adventurePlay.retry')}
          </button>
          {result.won && hasNext && (
            <button type="button" onClick={onNext}
              className="flex-1 rounded-xl border-[3px] border-black bg-neo-lime text-black font-bold py-3 shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none inline-flex items-center justify-center gap-1">
              {t('adventurePlay.next')} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
