'use client';

import React, { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeRandomUUID } from '@/lib/safeRandomUUID';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigation } from '@/contexts/NavigationContext';
import DrillProgressionOverlay from '@/components/brain/DrillProgressionOverlay';
import { useDrillGrid } from '@/hooks/useDrillGrid';
import { useSaveDrillResult } from '@/hooks/useSaveDrillResult';
import type { DrillImprovement } from '@/shared/utils/drillImprovement';
import { useDrillRewards } from '@/hooks/useDrillRewards';
import { useDrillSignupNudge } from '@/hooks/useDrillSignupNudge';
import { useDrillLevel } from '@/hooks/useDrillLevel';
import { trackDrillStart } from '@/lib/drills/telemetry';
import { BoostButton } from '@/components/boosts/BoostButton';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import { DRILL_DOMAINS, type DrillType } from '@/shared/types/cognitive';
import { BRAIN_CHECK_PROTOCOL, type BrainCheckAnalysis, type BrainCheckDrill } from '@/shared/utils/brainCheck';
import type { LetterGrid, Language } from '@/types';

/** Loose shape of every drill's onComplete payload. */
type DrillRunResult = { score: number; timeSpent: number; level: number } & Record<string, number>;

export interface DrillComponentProps {
  grid: LetterGrid;
  availableWords: { word: string; path: { row: number; col: number }[] }[];
  level: number;
  language: Language;
  onComplete: (result: never) => void;
  onExit: () => void;
  onPlayAgain: () => void;
  /** false during a Brain Check — drills with helpers (Memory Hunt clues) turn them off. */
  assists: boolean;
}

/** Per-drill mapping from the component's result to the submit payload. */
const TO_SUBMISSION: Record<BrainCheckDrill, (r: DrillRunResult) => { wordsFound: number; extraData: Record<string, unknown> }> = {
  'lightning-round': (r) => ({ wordsFound: r.wordsFound, extraData: { wordsPerMinute: r.wordsPerMinute } }),
  'memory-hunt': (r) => ({ wordsFound: r.wordsFound, extraData: { totalWords: r.totalWords, recalled: r.recalled } }),
  'combo-master': (r) => ({ wordsFound: r.wordsFound, extraData: { maxCombo: r.maxCombo } }),
  'rare-gems': (r) => ({ wordsFound: r.totalWordsFound, extraData: { rareWordsFound: r.rareWordsFound } }),
};

const SPINNER_COLOR: Record<BrainCheckDrill, string> = {
  'lightning-round': 'border-neo-lime',
  'memory-hunt': 'border-neo-purple',
  'combo-master': 'border-neo-orange',
  'rare-gems': 'border-neo-green',
};

interface Props {
  drillType: BrainCheckDrill;
  Drill: ComponentType<DrillComponentProps>;
  /** Brain Check: fixed-protocol measurement run instead of adaptive training. */
  isCheck?: boolean;
}

interface OverlayState {
  xpAwarded?: number;
  goldAwarded?: number;
  levelUp?: { newLevel: number; previousLevel: number };
  improvement?: DrillImprovement;
  brainCheck?: { status: 'recorded' | 'rejected'; analysis: BrainCheckAnalysis | null };
}

/** Brain Check cooldown for this drill: null = playable (incl. guests / offline). */
async function fetchCheckCooldown(drill: DrillType): Promise<string | null> {
  try {
    const res = await fetch('/api/brain/checks', { cache: 'no-store' });
    if (!res.ok) return null;
    const c = (await res.json())?.checks?.[drill];
    return c && c.available === false && c.nextAvailableAt ? c.nextAvailableAt : null;
  } catch {
    return null;
  }
}

async function fetchCheckAnalysis(drill: DrillType): Promise<BrainCheckAnalysis | null> {
  try {
    const res = await fetch('/api/brain/checks', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.checks?.[drill]?.analysis ?? null;
  } catch {
    return null;
  }
}

/**
 * The one page shell every drill route renders: header, grid, save pipeline,
 * reward overlay — and the Brain Check entry (`?check=1`).
 */
export default function DrillPageShell({ drillType, Drill, isCheck = false }: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language, dir } = useLanguage();
  const { setIsInGame } = useNavigation();
  const isDarkMode = theme === 'dark';
  const { saveDrillResult } = useSaveDrillResult();
  const { awardDrillRewards } = useDrillRewards();
  const { promptSignup, signupNudge } = useDrillSignupNudge();
  const trainingLevel = useDrillLevel(drillType);
  const level = isCheck ? BRAIN_CHECK_PROTOCOL[drillType].level : trainingLevel;
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [sessionId] = useState(() => `drill_${drillType}_${safeRandomUUID()}`);
  // Checks use the median-of-3 board so board difficulty stays steadier across days.
  const { grid, availableWords, isLoading, regenerate } = useDrillGrid(5, language, isCheck ? 3 : 1);

  // A check link opened during cooldown shows the gate BEFORE any play — the
  // server would only store the run as practice anyway.
  const [cooldownHours, setCooldownHours] = useState<number | null>(null);
  const [gateResolved, setGateResolved] = useState(!isCheck);
  useEffect(() => {
    if (!isCheck) return;
    let alive = true;
    void fetchCheckCooldown(drillType).then((until) => {
      if (!alive) return;
      setCooldownHours(until ? Math.max(1, Math.ceil((Date.parse(until) - Date.now()) / 3_600_000)) : null);
      setGateResolved(true);
    });
    return () => { alive = false; };
  }, [isCheck, drillType]);

  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  // Funnel start event — gated on grid load so we record the level actually played.
  const startFiredRef = useRef(false);
  useEffect(() => {
    if (isLoading || startFiredRef.current) return;
    startFiredRef.current = true;
    trackDrillStart({ drillType, level });
  }, [isLoading, drillType, level]);

  const handleComplete = useCallback(async (result: DrillRunResult) => {
    const { wordsFound, extraData } = TO_SUBMISSION[drillType](result);
    const saveResult = await saveDrillResult({
      drillType,
      level: result.level,
      score: result.score,
      durationSeconds: result.timeSpent,
      wordsFound,
      extraData: isCheck ? { ...extraData, benchmark: true, boardWords: availableWords.length } : extraData,
    });

    // Guest played but the score could not be saved (401) — nudge sign-up.
    if (saveResult.needsAuth) {
      promptSignup();
      return;
    }
    if (!saveResult.success || saveResult.queued) return;

    try { sessionStorage.setItem('lex_brain_dirty', '1'); } catch { /* ignore */ }
    const levelChanged = saveResult.newLevel != null && saveResult.previousLevel != null
      && saveResult.newLevel !== saveResult.previousLevel;
    const brainCheck = saveResult.brainCheck
      ? {
          status: saveResult.brainCheck,
          analysis: saveResult.brainCheck === 'recorded' ? await fetchCheckAnalysis(drillType) : null,
        }
      : undefined;
    setOverlay({
      levelUp: levelChanged ? { newLevel: saveResult.newLevel!, previousLevel: saveResult.previousLevel! } : undefined,
      improvement: saveResult.improvement,
      brainCheck,
    });
    const rewards = await awardDrillRewards({ level: result.level, score: result.score, xpAwarded: saveResult.xpAwarded ?? 0 });
    setOverlay((o) => (o ? { ...o, ...rewards } : o));
  }, [drillType, isCheck, saveDrillResult, awardDrillRewards, promptSignup, availableWords.length]);

  const goHub = useCallback(() => router.push(`/${language}/brain`), [router, language]);

  if (isCheck && gateResolved && cooldownHours !== null) {
    return (
      <div className={cn('flex-1 flex items-center justify-center p-4', isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream')}>
        <div
          data-testid="brain-check-cooldown"
          className={cn(
            'w-full max-w-sm rounded-neo border-4 border-neo-black p-6 text-center shadow-hard-lg',
            isDarkMode ? 'bg-neo-navy-light text-neo-white' : 'bg-white text-neo-black'
          )}
        >
          <Clock className="mx-auto mb-3 h-10 w-10 text-neo-yellow" aria-hidden="true" />
          <h1 className="mb-2 text-xl font-black uppercase">{t('brain.check.title')}</h1>
          <p className="mb-5 text-sm">{t('brain.check.cooldownGate', { h: cooldownHours })}</p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/${language}/brain/drills/${drillType}`}
              className="rounded-neo border-3 border-neo-black bg-neo-lime px-6 py-3 font-black uppercase text-neo-black shadow-hard"
            >
              {t('brain.check.trainInstead')}
            </Link>
            <button
              type="button"
              onClick={goHub}
              className="rounded-neo border-3 border-neo-black px-6 py-3 font-bold shadow-hard-sm"
            >
              {t('common.back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gateResolved || isLoading || grid.length === 0) {
    return (
      <div className={cn('flex-1 flex items-center justify-center', isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream')}>
        <div
          role="status"
          aria-label={t('common.loading')}
          className={cn('w-12 h-12 border-4 border-t-transparent rounded-full motion-safe:animate-spin', SPINNER_COLOR[drillType])}
        />
      </div>
    );
  }

  return (
    <div dir={dir} className={cn('flex-1 flex flex-col min-h-0', isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream')}>
      <header className={cn(
        'flex items-center justify-between gap-2 px-4 py-3 border-b-4 border-neo-black',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <button
          type="button"
          onClick={goHub}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-neo border-3 border-neo-black shadow-hard-sm',
            'transition-all hover:translate-y-[-2px] hover:shadow-hard',
            isDarkMode ? 'bg-neo-navy text-neo-white' : 'bg-neo-cream text-neo-black'
          )}
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          <span className="font-bold text-sm hidden sm:inline">{t('common.back')}</span>
        </button>

        <h1 className={cn('min-w-0 truncate text-lg font-black uppercase tracking-wide', isDarkMode ? 'text-neo-white' : 'text-neo-black')}>
          {t(`brain.drills.${drillType}.name`)}
        </h1>

        {isCheck ? (
          // Boosts would contaminate a measurement — none in check mode.
          <span
            role="img"
            aria-label={t('brain.check.title')}
            title={t('brain.check.title')}
            className="inline-flex shrink-0 items-center gap-1 rounded-neo border-3 border-neo-black bg-neo-yellow px-2 py-1 text-xs font-black uppercase text-neo-black shadow-hard-sm"
          >
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            {/* Label only where there's room — phones keep the header clear of the global mute button. */}
            <span className="hidden whitespace-nowrap sm:inline" aria-hidden="true">{t('brain.check.title')}</span>
          </span>
        ) : (
          <BoostButton mode="drill" sessionId={sessionId} />
        )}
      </header>

      <div className="flex-1 min-h-0">
        <FeatureErrorBoundary featureName={`drill-${drillType}`}>
          <Drill
            grid={grid}
            availableWords={availableWords}
            level={level}
            language={language}
            onComplete={handleComplete as (r: never) => void}
            onExit={goHub}
            onPlayAgain={isCheck ? goHub : regenerate}
            assists={!isCheck}
          />
        </FeatureErrorBoundary>
      </div>

      {signupNudge}
      {overlay && (
        <DrillProgressionOverlay
          isOpen
          onClose={() => setOverlay(null)}
          targetDomain={DRILL_DOMAINS[drillType]}
          {...overlay}
        />
      )}
    </div>
  );
}
