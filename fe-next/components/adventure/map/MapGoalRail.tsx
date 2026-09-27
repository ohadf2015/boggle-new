'use client';

/**
 * Right rail — the GOAL and the vocabulary, on wide screens only.
 *
 * The boss portrait gets to be a portrait instead of a 32px strip, and the
 * full-width red banner can stop eating a row of vertical space.
 *
 * The seven-row legend used to sit here permanently. Every node already carries
 * its own name, so the rail was spending a third of the screen's chrome
 * explaining icons the player can read off the map — it is a button now, the
 * same sheet a phone opens.
 */
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import { BOSS_ROW } from '@/lib/adventure/play/runMap';
import { ListTree } from 'lucide-react';

export default function MapGoalRail({ world, onLegend }: { world: number; onLegend: () => void }) {
  const { t } = useLanguageSafe();
  const boss = getBossConfig(world);
  return (
    <aside
      className="relative z-20 flex w-[13.5rem] shrink-0 flex-col gap-3 overflow-y-auto border-s-[3px] border-black bg-[#0f1b3d]/92 p-3"
      data-testid="map-goal-rail"
    >
      <div className="rounded-xl border-[3px] border-black bg-neo-red/90 p-3 shadow-[4px_4px_0_#000]">
        <h2 className="font-neo-display text-xs font-bold uppercase tracking-[0.18em]">
          {t('adventurePlay.map.depth', { step: BOSS_ROW + 1 })}
        </h2>
        <div className="mt-2 flex items-center gap-2">
          {boss && (
            // eslint-disable-next-line @next/next/no-img-element -- static boss portrait
            <img src={boss.images.idle} alt="" aria-hidden
              className="h-16 w-16 shrink-0 rounded-lg border-[3px] border-black bg-black/40 object-contain" />
          )}
          <span className="font-neo-display text-base font-bold leading-tight">
            {t('adventurePlay.map.bossAhead', { name: boss ? t(boss.displayName) : t('adventurePlay.map.kind.boss') })}
          </span>
        </div>
      </div>
      <button type="button" onClick={onLegend}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border-[3px] border-black bg-neo-cyan px-2 py-2 text-sm font-bold text-black shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none">
        <ListTree className="w-4 h-4" aria-hidden /> {t('adventurePlay.map.legend')}
      </button>
    </aside>
  );
}
