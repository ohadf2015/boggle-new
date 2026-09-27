'use client';

/**
 * Chapter opener (Bookworm chapter intro): the world's painted scene, its
 * name, and one story paragraph. Shown once, on a world's first level.
 */
import { BookOpen } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import { getWorldConfig } from '@/lib/adventure/worldConfig';
import { worldBackdrop } from './introBeats';

export default function ChapterBeat({ world, onNext }: { world: number; onNext: () => void }) {
  const { t } = useLanguageSafe();
  const worldCfg = getWorldConfig(world);
  const boss = getBossConfig(world);
  const storyKey = boss?.storylineIntro ?? '';
  const story = storyKey ? t(storyKey) : '';
  return (
    <div className="flex h-full flex-col" data-testid="chapter-beat">
      <div className="relative h-[42%] min-h-[200px] overflow-hidden border-b-[3px] border-black">
        {/* eslint-disable-next-line @next/next/no-img-element -- painted world scene */}
        <img src={worldBackdrop(world)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0f1b3d]" aria-hidden />
        <span className="chapter-tag absolute top-4 start-4 inline-flex items-center gap-1.5 rounded-lg border-[3px] border-black bg-neo-yellow px-2.5 py-1 font-neo-display text-sm font-bold uppercase tracking-wider text-black shadow-[3px_3px_0_#000]">
          <BookOpen className="h-4 w-4" strokeWidth={2.75} aria-hidden /> {t('adventurePlay.variety.chapterTag', { world })}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5">
        <h2 id="level-intro-title" className="chapter-title -mt-7 font-neo-display text-[clamp(34px,10vw,52px)] font-bold leading-[0.95] text-neo-cream [text-shadow:4px_4px_0_#000]">
          {worldCfg ? t(`adventure.worlds.${worldCfg.name}`) : ''}
        </h2>
        {story && story !== storyKey && (
          <p className="chapter-story mt-4 text-[17px] font-semibold leading-relaxed text-neo-cream/90" data-testid="chapter-story">{story}</p>
        )}
        <div className="flex-1" />
        {boss && (
          <div className="chapter-story mb-4 flex items-center gap-3 rounded-xl border-[3px] border-black bg-[#1a1a2e] p-2 shadow-[4px_4px_0_#000]" data-testid="chapter-guardian">
            {/* eslint-disable-next-line @next/next/no-img-element -- boss portrait */}
            <img src={boss.images.idle} alt="" className="h-16 w-16 shrink-0 rounded-lg border-[3px] border-black bg-neo-pink/30 object-cover" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neo-cream/60">{t('adventure.bosses.cinematics.guardianOfWorld', { worldNumber: world })}</div>
              <div className="truncate font-neo-display text-xl font-bold text-neo-pink">{t(boss.displayName)}</div>
            </div>
          </div>
        )}
        <button type="button" onClick={onNext} autoFocus
          className="intro-foot w-full rounded-xl border-[3px] border-black bg-neo-yellow py-3 font-neo-display text-xl font-bold text-black shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-none">
          {t('adventurePlay.variety.chapterGo')}
        </button>
      </div>
    </div>
  );
}
