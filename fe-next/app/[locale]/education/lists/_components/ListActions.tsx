'use client';

import { useCallback, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { writeQuickLaunchIntent, QUICK_LAUNCH_FLOW } from '@/components/teacher/dashboard/quickLaunchIntent';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { PracticeMode, PracticeOverlayProps } from './PracticeOverlay';

export interface ListActionsLabels {
  playClass: string;
  playClassSub: string;
  practiceSolo: string;
  practiceSoloSub: string;
  modesTitle: string;
  modes: Record<PracticeMode, { title: string; sub: string }>;
  close: string;
  pick: string;
  overlayTitle: string;
}

interface Props {
  locale: string;
  /** Locale-less path of this list page, for the sign-up round trip. */
  path: string;
  title: string;
  lang: string;
  words: Array<{ word: string; definition: string }>;
  /** Niqqud-free spellings, in the same order, for game boards. */
  playable: string[];
  labels: ListActionsLabels;
}

const MODES: PracticeMode[] = ['grid', 'spelling', 'matching'];
const MODE_TINT: Record<PracticeMode, string> = {
  grid: 'bg-neo-lime',
  spelling: 'bg-neo-cyan',
  matching: 'bg-neo-pink',
};

export function ListActions({ locale, path, title, lang, words, playable, labels }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [Overlay, setOverlay] = useState<ComponentType<PracticeOverlayProps> | null>(null);
  const [mode, setMode] = useState<PracticeMode | null>(null);
  const [open, setOpen] = useState(false);

  const accessHref = `/${locale}/education/access?from=${encodeURIComponent(`/${locale}${path}`)}`;

  const playWithClass = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      trackGrowthEvent('landing_cta_clicked', { cta: 'word_list_play_class', signedIn: !!user });
      if (!user) return;
      e.preventDefault();
      writeQuickLaunchIntent({ source: 'paste', title, language: lang, words: playable });
      router.push(`/${locale}/education/classroom-game?flow=${QUICK_LAUNCH_FLOW}`);
    },
    [user, title, lang, playable, router, locale],
  );

  const openPractice = useCallback(
    async (next: PracticeMode | null) => {
      trackGrowthEvent('landing_cta_clicked', { cta: 'word_list_practice', mode: next ?? 'picker' });
      setMode(next);
      setOpen(true);
      if (!Overlay) {
        const mod = await import('./PracticeOverlay');
        setOverlay(() => mod.default);
      }
    },
    [Overlay],
  );

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <a
          data-cta="play-class"
          href={accessHref}
          onClick={playWithClass}
          className="rounded-neo border-4 border-neo-black bg-neo-lime px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-transform duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-white"
        >
          <span className="block text-base sm:text-lg">{labels.playClass}</span>
          <span className="block text-[10px] font-bold tracking-widest opacity-70">{labels.playClassSub}</span>
        </a>
        <button
          type="button"
          data-cta="practice-solo"
          onClick={() => openPractice(null)}
          className="rounded-neo border-4 border-neo-black bg-neo-cyan px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard transition-transform duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-white"
        >
          <span className="block text-base sm:text-lg">{labels.practiceSolo}</span>
          <span className="block text-[10px] font-bold tracking-widest opacity-70">{labels.practiceSoloSub}</span>
        </button>
      </div>

      <section aria-labelledby="practice-modes" className="mt-10">
        <h2 id="practice-modes" className="font-neo-display text-sm font-black uppercase tracking-widest text-neo-white/70">
          {labels.modesTitle}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              data-mode={m}
              onClick={() => openPractice(m)}
              className="flex min-h-[64px] items-center gap-3 rounded-neo border-3 border-neo-cream/40 bg-neo-navy-light p-4 text-start shadow-hard transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-white"
            >
              <span aria-hidden className={`h-10 w-3 shrink-0 rounded-sm border-2 border-neo-black ${MODE_TINT[m]}`} />
              <span>
                <span className="block font-neo-display text-base font-black text-neo-white">{labels.modes[m].title}</span>
                <span className="block text-xs text-neo-white/70">{labels.modes[m].sub}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {open && Overlay && (
        <Overlay
          title={labels.overlayTitle}
          lang={lang}
          words={words}
          playable={playable}
          initialMode={mode}
          labels={{ close: labels.close, pick: labels.pick, modes: labels.modes }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
