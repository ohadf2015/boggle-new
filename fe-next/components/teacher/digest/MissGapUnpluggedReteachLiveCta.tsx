/**
 * Deep-link CTAs: miss-gap words → Unplugged reteach Live / 3-min reteach Live.
 *
 * Sits under last-lesson digest chips (#1090/#1120 reports) and on the miss-gap
 * teacher progress card. Kahoot Unplugged / device-free foil — reinforces
 * Kahoot blog Sep 21, 2026 「Teacher Takeover: When student devices aren’t an
 * option, take Kahoot!」
 * https://kahoot.com/blog/2026/09/21/teacher-takeover-unplugged-offline/
 * Teacher screen + paper, no student devices. Class-level words only — never
 * student names.
 */
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MonitorPlay, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  buildMissGapUnpluggedReteachDeeplink,
  type MissGapUnpluggedReteachDeeplinkInput,
} from '@/lib/education/missGapUnpluggedReteachDeeplink';
import type { ClassGapShareInput, ClassGapSharePayload } from '@/lib/education/classGapShare';

export interface MissGapUnpluggedReteachLiveCtaProps {
  /** Prefer a ready class-gap / miss-gap payload when you already have one. */
  payload?: ClassGapShareInput | ClassGapSharePayload;
  locale?: string;
  missedWords?: string[];
  lesson?: string;
  teacher?: string;
  found?: number;
  total?: number;
  /** Compact layout for digest chips row. Default: stacked. */
  layout?: 'stack' | 'row';
  className?: string;
}

export function MissGapUnpluggedReteachLiveCta({
  payload,
  locale = 'en',
  missedWords = [],
  lesson,
  teacher,
  found,
  total,
  layout = 'stack',
  className,
}: MissGapUnpluggedReteachLiveCtaProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const deeplink = useMemo(() => {
    if (payload) return buildMissGapUnpluggedReteachDeeplink(payload);
    const input: MissGapUnpluggedReteachDeeplinkInput = {
      locale,
      missedWords,
      lesson,
      teacher,
      found,
      total,
    };
    return buildMissGapUnpluggedReteachDeeplink(input);
  }, [payload, locale, missedWords, lesson, teacher, found, total]);

  if (!deeplink) return null;

  const handleReteachLive = () => {
    if (!deeplink.reteachLiveData) return;
    try {
      sessionStorage.setItem('lessonGameData', JSON.stringify(deeplink.reteachLiveData));
    } catch {
      return;
    }
    router.push(deeplink.reteachLivePath);
  };

  const unpluggedClass =
    'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-neo border-2 border-black bg-neo-cyan px-4 font-neo-display text-sm font-black text-black shadow-hard transition-shadow hover:shadow-hard-lg sm:w-auto';
  const reteachClass =
    'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-neo border-2 border-black bg-neo-lime px-4 font-neo-display text-sm font-black text-black shadow-hard transition-shadow hover:shadow-hard-lg sm:w-auto';

  return (
    <div
      data-testid="miss-gap-unplugged-reteach-live-cta"
      className={cn(
        layout === 'row'
          ? 'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'
          : 'flex flex-col gap-2',
        className,
      )}
    >
      <p className="text-xs font-bold text-neo-cream/80 sm:basis-full">
        {t('teacher.digest.unpluggedReteachLiveFoil')}
      </p>
      <Link
        href={deeplink.unpluggedPath}
        data-testid="miss-gap-start-unplugged-reteach-live"
        className={unpluggedClass}
      >
        <MonitorPlay className="size-4 shrink-0" aria-hidden="true" />
        {t('teacher.digest.unpluggedReteachLiveCta')}
      </Link>
      <button
        type="button"
        data-testid="miss-gap-start-reteach-live"
        onClick={handleReteachLive}
        className={reteachClass}
      >
        <Play className="size-4 shrink-0" aria-hidden="true" />
        {t('teacher.digest.reteachLiveCta')}
      </button>
    </div>
  );
}

export default MissGapUnpluggedReteachLiveCta;
