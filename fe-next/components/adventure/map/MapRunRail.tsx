'use client';

/**
 * Left rail — the STAKE, on wide screens only.
 *
 * On a phone these live as chips crushed into the header. On a TV that header
 * row is the only thing using the extra width, and the map is left as a narrow
 * column floating in navy. So past 768px the run state moves out here: it fills
 * a margin that was dead space, it reads from a sofa, and it gives the lattice
 * the whole middle of the screen.
 */
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import { Hearts } from '../play/RunHud';
import RelicBar from '../play/run/RelicBar';
import GoldCounter from '../play/run/GoldCounter';

interface Props {
  run: PublicRun | null;
  step: number;
  total: number;
}

// The walked path used to get a third panel here, a ladder of eight rows that
// was empty on floor 1 and never said anything the lattice beside it wasn't
// already saying in white edges and step numerals. Two panels, not three.
export default function MapRunRail({ run, step, total }: Props) {
  const { t } = useLanguageSafe();
  return (
    <aside
      className="relative z-20 flex w-[13.5rem] shrink-0 flex-col gap-3 overflow-y-auto border-e-[3px] border-black bg-[#0f1b3d]/92 p-3"
      data-testid="map-run-rail"
    >
      <div className="rounded-xl border-[3px] border-black bg-black/45 p-3 shadow-[4px_4px_0_#000]">
        <h2 className="font-neo-display text-xs font-bold uppercase tracking-[0.18em] text-neo-lime">
          {t('adventurePlay.map.runState')}
        </h2>
        <p className="mt-1 font-neo-display text-xl font-bold leading-none tabular-nums">
          {t('adventurePlay.map.floorOf', { step, total })}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Hearts hp={run?.hp ?? 0} maxHp={run?.maxHp ?? 0} />
          <GoldCounter value={run?.gold ?? 0} />
        </div>
      </div>
      <div className="rounded-xl border-[3px] border-black bg-black/45 p-3 shadow-[4px_4px_0_#000]">
        <h2 className="font-neo-display text-xs font-bold uppercase tracking-[0.18em] text-neo-cyan">
          {t('adventurePlay.map.relics')}
        </h2>
        <div className="mt-2">
          {run?.relics?.length
            ? <RelicBar relics={run.relics} size="md" runCtx={{ world: run.w, step: run.step }} />
            : <p className="text-xs font-bold opacity-50">{t('adventurePlay.map.noRelics')}</p>}
        </div>
      </div>
    </aside>
  );
}
