'use client';

/**
 * "Your run is still going" painted INSIDE a mode cube.
 *
 * Every element is absolutely positioned: the run only resolves after
 * hydration (sessionStorage), and a cube that changed height when it resolved
 * would reflow the whole bento (Class 1 in .claude/rules/60-recurring-pitfalls).
 * So this never touches the tile's box — it lands on top of it.
 */
import { Play, Heart } from 'lucide-react';
import { relicArt } from '@/components/adventure/play/run/art';
import { useLanguage } from '@/contexts/LanguageContext';
import { MAP_ROWS } from '@/lib/adventure/play/runMap';
import type { AdventureResume } from '@/lib/landing/adventureResume';
import { cn } from '@/lib/utils';

interface Props {
  resume: AdventureResume;
  /** The 2×2 anchor tile has room for bigger chrome. */
  anchor?: boolean;
}

export default function ModeResumeChip({ resume, anchor = false }: Props) {
  // Localised here rather than by the caller: LandingChallengeCards' `t` prop
  // takes a key only, with no interpolation params.
  const { t } = useLanguage();
  const label = t('landing.adventureResumeA11y', { world: resume.world, step: resume.step, hp: resume.hp });
  const pct = Math.round((resume.step / MAP_ROWS) * 100);
  return (
    <>
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        data-testid="mode-resume-chip"
        className={cn(
          'absolute top-1.5 start-1.5 z-[2] inline-flex items-center gap-1 rounded-full border-2 border-black bg-neo-lime font-neo-display font-black uppercase leading-none text-neo-navy shadow-hard-sm',
          anchor ? 'px-2.5 py-1 text-[0.7rem]' : 'px-1.5 py-0.5 text-[0.6rem]',
        )}
      >
        <Play className={cn('fill-neo-navy rtl:rotate-180', anchor ? 'h-3 w-3' : 'h-2.5 w-2.5')} strokeWidth={3} />
        <span dir="ltr">W{resume.world} · {resume.step}/{MAP_ROWS}</span>
      </span>

      <span
        aria-hidden="true"
        className={cn(
          'absolute end-1.5 z-[2] inline-flex items-center gap-0.5 rounded-full border-2 border-black bg-neo-navy/90 font-neo-display font-black leading-none text-neo-pink shadow-hard-sm',
          anchor ? 'top-9 px-2 py-0.5 text-[0.7rem]' : 'top-7 px-1.5 py-0.5 text-[0.55rem]',
        )}
      >
        <Heart className={cn('fill-neo-pink', anchor ? 'h-3 w-3' : 'h-2.5 w-2.5')} strokeWidth={2.5} />
        {resume.hp}
      </span>

      {/* The relics carried — the run's identity at a glance. Two thumbs max on
          a 1x1 cube; a "+n" pip stands in for the rest. */}
      {resume.relics.length > 0 && (
        <span
          aria-hidden="true"
          data-testid="mode-resume-relics"
          className={cn('absolute start-1.5 z-[2] flex items-center gap-0.5', anchor ? 'top-9' : 'top-7')}
        >
          {resume.relics.slice(0, anchor ? 3 : 2).map((id) => (
            // eslint-disable-next-line @next/next/no-img-element -- tiny static relic art, already in the adventure bundle
            <img
              key={id}
              src={relicArt(id)}
              alt=""
              draggable={false}
              className={cn('rounded border-2 border-black bg-neo-navy', anchor ? 'h-6 w-6' : 'h-5 w-5')}
            />
          ))}
          {resume.relics.length > (anchor ? 3 : 2) && (
            <span className={cn('rounded border-2 border-black bg-neo-navy px-1 font-neo-display font-black leading-none text-neo-cream', anchor ? 'py-0.5 text-[0.6rem]' : 'py-0.5 text-[0.5rem]')}>
              +{resume.relics.length - (anchor ? 3 : 2)}
            </span>
          )}
        </span>
      )}

      {/* depth rail — the run's progress along the act, hard-edged, no blur */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 z-[2] h-1.5 bg-black/70">
        <span className="block h-full bg-neo-lime" style={{ width: `${pct}%` }} />
      </span>
    </>
  );
}
