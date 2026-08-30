'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, BookOpen, Copy, Check, LayoutGrid, Search, Zap, RotateCw, Clock, Grid3x3, UserPlus, X, Building2, Link2, Gavel, Grid2x2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language, GameMode } from '@/shared/types/game';

interface LessonData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language: Language;
  gameMode?: GameMode;
  templateSettings?: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  } | null;
}

interface ClassroomModeBannerProps {
  lessonData: LessonData | null;
  gameCode?: string;
  expanded?: boolean;
}

const MODE_ICON: Record<GameMode, typeof LayoutGrid> = {
  classic: LayoutGrid,
  'word-hunt': Search,
  blast: Zap,
  'wheel-rush': RotateCw,
  'word-tower': Building2,
  shiritori: Link2,
  'sealed-bid': Gavel,
  crossword: Grid3x3,
  wordcraft: Grid2x2,
};

const MODE_TRANSLATION_KEY: Record<GameMode, string> = {
  classic: 'classic',
  blast: 'blast',
  'word-hunt': 'wordHunt',
  'wheel-rush': 'wheelRush',
  'word-tower': 'wordTower',
  shiritori: 'shiritori',
  'sealed-bid': 'sealedBid',
  crossword: 'crossword',
  wordcraft: 'wordcraft',
};

function boardSizeLabel(size?: string): string {
  switch (size) {
    case 'small': return '4×4';
    case 'large': return '6×6';
    default: return '5×5';
  }
}

/**
 * Classroom session banner + in-lobby info panel.
 *
 * Slim banner is always shown. When `expanded` and `gameCode` are set,
 * additionally renders a full education lobby panel with game code, QR,
 * mode, timer, board size, late join, lesson name, and word count.
 */
export function ClassroomModeBanner({ lessonData, gameCode, expanded = false }: ClassroomModeBannerProps) {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');

  const lessonName = lessonData?.lessonName || '';
  const wordCount = lessonData?.vocabularyWords?.length || 0;
  const templateSettings = lessonData?.templateSettings || null;
  const gameMode = lessonData?.gameMode || 'classic';
  const ModeIcon = MODE_ICON[gameMode];
  const timerMinutes = templateSettings ? Math.round(templateSettings.timerSeconds / 60) : null;
  const allowLateJoin = templateSettings?.allowLateJoin ?? true;

  useEffect(() => {
    if (gameCode && typeof window !== 'undefined') {
      // `/[locale]/join/[code]` is the only join route that resolves — the
      // bare `/join?code=` form redirects to a locale and then 404s, which is
      // what every scanned QR did.
      setJoinUrl(`${window.location.origin}/${language}/join/${gameCode}`);
    }
  }, [gameCode, language]);

  const handleCopy = useCallback(async () => {
    if (!gameCode) return;
    try {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);
      toast.success(t('share.codeCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('share.codeCopyError'));
    }
  }, [gameCode, t]);

  const showPanel = expanded && !!gameCode;

  const previewWords = useMemo(
    () => (lessonData?.vocabularyWords || []).slice(0, 12),
    [lessonData?.vocabularyWords]
  );

  return (
    <>
      <div
        className={cn(
          'w-full px-4 py-2',
          'bg-neo-cyan/15 border-b-3 border-neo-cyan/40',
          'flex items-center justify-center gap-3 flex-wrap',
          'text-sm font-neo-body'
        )}
      >
        <div className="flex items-center gap-2 text-neo-cyan font-bold">
          <GraduationCap className="w-4 h-4" />
          <span>{t('education.classroomGame.classroomSession')}</span>
        </div>

        {lessonName && (
          <>
            <span className="text-neo-white" aria-hidden="true">|</span>
            <div className="flex items-center gap-1.5 text-neo-white">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px] sm:max-w-[400px]">{lessonName}</span>
            </div>
          </>
        )}

        {wordCount > 0 && (
          <>
            <span className="text-neo-white" aria-hidden="true">|</span>
            <span className="text-neo-white">
              {t('education.classroomGame.words', { count: wordCount })}
            </span>
          </>
        )}
      </div>

      {showPanel && (
        <div className="w-full px-3 sm:px-4 pt-3 pb-4">
          <div className="max-w-5xl mx-auto grid gap-4 sm:gap-5 md:grid-cols-[1.1fr_1fr]">
            {/* Join info card */}
            <div className="p-4 sm:p-5 rounded-neo border-neo-thick border-neo-black bg-neo-cyan/15 shadow-hard-lg">
              <p className="text-xs sm:text-sm text-neo-white font-neo-body text-center mb-2">
                {t('education.classroomGame.shareCode')}
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl sm:text-5xl font-black text-neo-cyan tracking-widest font-mono">
                  {gameCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={cn(
                    'p-3 rounded-neo border-neo border-neo-black bg-neo-cream text-neo-black',
                    'shadow-hard hover:shadow-hard-lg transition-all',
                    copied && 'bg-neo-lime'
                  )}
                  aria-label={t('share.copy')}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              {joinUrl && (
                <div className="flex flex-col items-center gap-2 mt-4" data-testid="qr-code-wrapper">
                  <p className="text-xs text-neo-white font-neo-body">
                    {t('education.classroomGame.scanToJoin')}
                  </p>
                  <div className="p-2 bg-neo-cream rounded-neo border-neo border-neo-black shadow-hard-sm">
                    <QRCodeCanvas value={joinUrl} size={150} bgColor="#ffffff" fgColor="#000000" level="M" />
                  </div>
                </div>
              )}
            </div>

            {/* Settings + lesson card */}
            <div className="p-4 sm:p-5 rounded-neo border-neo-thick border-neo-black bg-neo-navy/70 shadow-hard">
              <h4 className="text-neo-white font-bold mb-3 text-sm sm:text-base">
                {t('education.classroomGame.gameSettings')}
              </h4>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <SummaryTile
                  icon={<ModeIcon className="w-4 h-4" />}
                  label={t('teacher.classroom.gameModes.title')}
                  value={t(`teacher.classroom.gameModes.${MODE_TRANSLATION_KEY[gameMode]}`)}
                />
                {timerMinutes !== null && (
                  <SummaryTile
                    icon={<Clock className="w-4 h-4" />}
                    label={t('education.template.timer')}
                    value={`${timerMinutes} ${t('common.minutes')}`}
                  />
                )}
                <SummaryTile
                  icon={<Grid3x3 className="w-4 h-4" />}
                  label={t('education.template.boardSize')}
                  value={boardSizeLabel(templateSettings?.difficulty)}
                />
                <SummaryTile
                  icon={<UserPlus className="w-4 h-4" />}
                  label={t('education.template.lateJoin')}
                  value={allowLateJoin ? <Check className="w-4 h-4 inline" /> : <X className="w-4 h-4 inline" />}
                />
              </div>

              {lessonName && (
                <div className="pt-3 border-t border-neo-white/10">
                  <div className="flex items-center gap-2 text-neo-pink font-bold text-sm mb-2">
                    <BookOpen className="w-4 h-4" />
                    <span className="truncate">{lessonName}</span>
                    <span className="text-neo-white ms-auto shrink-0 font-neo-body">
                      {t('education.classroomGame.words', { count: wordCount })}
                    </span>
                  </div>
                  {previewWords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {previewWords.map((w) => (
                        <span
                          key={w}
                          className="px-2 py-0.5 text-xs rounded-full bg-neo-cyan/15 border border-neo-cyan/60 text-neo-white font-neo-body"
                        >
                          {w}
                        </span>
                      ))}
                      {wordCount > previewWords.length && (
                        <span className="px-2 py-0.5 text-xs text-neo-white font-neo-body">
                          +{wordCount - previewWords.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-neo border border-neo-black bg-neo-navy-light/80">
      <div className="flex items-center gap-1.5 text-neo-white text-[10px] uppercase tracking-wide mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-neo-white font-bold text-sm">{value}</p>
    </div>
  );
}
