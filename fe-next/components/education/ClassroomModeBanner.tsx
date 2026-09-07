'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, BookOpen, Copy, Check, LayoutGrid, Search, Zap, RotateCw, Clock, Grid3x3, UserPlus, X, Building2, Link2, Gavel, Grid2x2, Brain } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language } from '@/shared/types/game';
import { VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';
import type { LiveClassroomGameInfo } from '@/lib/education/liveClassroomGameInfo';

interface LessonData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language: Language;
  /**
   * Widened past `GameMode` on purpose: a classroom room can be a Vocab Quiz,
   * which is deliberately not a board mode. This value comes out of
   * sessionStorage, so the narrower type was a lie the compiler believed and
   * the host crashed on.
   */
  gameMode?: ClassroomGameMode;
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
  /**
   * Whoever is running the room. Defaults to true so the teacher's screen — the
   * only caller before students had a lobby of their own — cannot regress.
   *
   * A student is not a host: the share code, the copy button and the QR poster
   * are the host's controls for filling the room, and printing them on the phone
   * that just scanned that QR is noise at best.
   */
  isHost?: boolean;
  /**
   * The room's own record of itself, from `/api/education/classroom/live-game`.
   *
   * `lessonData` cannot serve a student: it is read from `lessonGameData` in the
   * TEACHER's sessionStorage, so a student's copy is always null and every field
   * below fell through to a default (mode "Classic", 6×6, no lesson name).
   */
  liveGame?: LiveClassroomGameInfo | null;
}

/**
 * Exported so `__tests__/classroomModeRegistry` can pin every classroom mode to
 * an entry here. A missing key used to render `<undefined/>`, which React
 * throws on — killing the teacher's whole host view and tearing the room down
 * before any student could join.
 */
export const MODE_ICON: Record<string, typeof LayoutGrid> = {
  classic: LayoutGrid,
  'word-hunt': Search,
  blast: Zap,
  'wheel-rush': RotateCw,
  'word-tower': Building2,
  shiritori: Link2,
  'sealed-bid': Gavel,
  crossword: Grid3x3,
  wordcraft: Grid2x2,
  'vocab-quiz': Brain,
};

/** Shown when a mode has no icon, so a cosmetic gap can never crash a host. */
const FALLBACK_MODE_ICON = LayoutGrid;

export const MODE_TRANSLATION_KEY: Record<string, string> = {
  classic: 'classic',
  blast: 'blast',
  'word-hunt': 'wordHunt',
  'wheel-rush': 'wheelRush',
  'word-tower': 'wordTower',
  shiritori: 'shiritori',
  'sealed-bid': 'sealedBid',
  crossword: 'crossword',
  wordcraft: 'wordcraft',
  'vocab-quiz': 'vocabQuiz',
};

/**
 * Must match the sizes `ClassroomSetupStep` offers, one for one.
 *
 * This table was one step behind that screen — an older 4×4/5×5/6×6 scale with
 * no `medium` case at all — so the teacher's Medium fell through to the default
 * and the lobby announced 5×5 to a room that was 6×6. Every size was off by
 * one. The value itself was never lost: `ClassroomGameLobby` writes the
 * teacher's choice to `templateSettings.difficulty` verbatim.
 *
 * The fallback is Medium because that is what the setup screen preselects, so
 * an absent value and an unset one say the same thing.
 */
function boardSizeLabel(size?: string): string {
  switch (size) {
    case 'small': return '5×5';
    case 'large': return '7×7';
    default: return '6×6';
  }
}

/**
 * Classroom session banner + in-lobby info panel.
 *
 * Slim banner is always shown. When `expanded` and `gameCode` are set,
 * additionally renders a full education lobby panel with game code, QR,
 * mode, timer, board size, late join, lesson name, and word count.
 */
export function ClassroomModeBanner({
  lessonData,
  gameCode,
  expanded = false,
  isHost = true,
  liveGame = null,
}: ClassroomModeBannerProps) {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');

  // Two sources, and only one of them exists on any given client: `lessonData`
  // is the teacher's own sessionStorage, `liveGame` is what the server says
  // about the room. Read the local one first (it is what the teacher just
  // picked, before the room even exists) and fall back to the server's.
  const remoteSettings = liveGame?.settings ?? null;
  const lessonName = lessonData?.lessonName || (liveGame?.lessonNames ?? []).join(' · ');
  const wordCount = lessonData?.vocabularyWords?.length || 0;
  const templateSettings = lessonData?.templateSettings || null;
  const gameMode: ClassroomGameMode = lessonData?.gameMode || liveGame?.gameMode || 'classic';
  const ModeIcon = MODE_ICON[gameMode] ?? FALLBACK_MODE_ICON;
  const timerMinutes = templateSettings
    ? Math.round(templateSettings.timerSeconds / 60)
    : remoteSettings?.timerMinutes ?? null;
  const boardSize = templateSettings?.difficulty ?? remoteSettings?.boardSize ?? undefined;
  const allowLateJoin = templateSettings?.allowLateJoin ?? remoteSettings?.allowLateJoin ?? true;

  // A quiz has no grid and no round clock — printing a board size and a
  // "3 minutes" next to it describes a game nobody is playing.
  const isQuiz = gameMode === VOCAB_QUIZ_MODE;
  const questionCount = remoteSettings?.vocabQuizQuestionCount ?? null;
  const questionSeconds = remoteSettings?.vocabQuizSeconds ?? null;

  // The class's own name, which the server resolves and the teacher's local copy
  // never carried. The generic label stays as the fallback for a room whose
  // classroom could not be named.
  const sessionLabel = liveGame?.classroomName || t('education.classroomGame.classroomSession');

  useEffect(() => {
    if (gameCode && typeof window !== 'undefined') {
      // `/[locale]/join/[code]` is the only join route that resolves — the
      // bare `/join?code=` form redirects to a locale and then 404s, which is
      // what every scanned QR did.
      setJoinUrl(`${window.location.origin}/${language}/join/${gameCode}`);
    }
  }, [gameCode, language]);

  // Copy the LINK, not the bare code. A teacher pastes this into Google Classroom,
  // Teams, or a parent email — six characters there are a dead end, and the URL
  // already carries the code for anyone who prefers to read it out.
  const handleCopy = useCallback(async () => {
    const payload = joinUrl || gameCode;
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success(t(joinUrl ? 'share.linkCopied' : 'share.codeCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('share.codeCopyError'));
    }
  }, [gameCode, joinUrl, t]);

  // A student's every settings value comes from `liveGame`, so without it the
  // whole card renders defaults: Classic, 6×6, three minutes. That is the exact
  // wrong screen this component exists to stop showing, restored silently
  // whenever the lookup fails — and it fails per IP, which a whole class shares.
  // Recurring pitfall class 4. Show the class and the lesson, and nothing we do
  // not actually know.
  const showPanel = expanded && !!gameCode && (isHost || !!liveGame);

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
          <span>{sessionLabel}</span>
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
          <div
            className={cn(
              'max-w-5xl mx-auto grid gap-4 sm:gap-5',
              // With no share card there is nothing to sit beside, so the
              // student's summary takes the single column rather than half of a
              // two-column grid with a hole in it.
              isHost ? 'md:grid-cols-[1.1fr_1fr]' : 'max-w-xl'
            )}
          >
            {/* Join info card — host only. The QR, the code and the copy button
                are how a host FILLS the room; the student already got in. */}
            {isHost && (
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
                  aria-label={t('share.copyLink')}
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
                  {/* A QR alone strands every student who cannot scan it — no phone,
                      a Chromebook, or just too far from the projector. They need an
                      address they can read and type. `/[locale]/join/[code]` is the
                      only route that resolves, so print exactly that. */}
                  <p
                    className="max-w-full break-all text-center font-neo-body text-xs font-bold text-neo-white/90"
                    dir="ltr"
                  >
                    {joinUrl.replace(/^https?:\/\/(www\.)?/, '')}
                  </p>
                </div>
              )}
            </div>
            )}

            {/* Settings + lesson card */}
            <div className="p-4 sm:p-5 rounded-neo border-neo-thick border-neo-black bg-neo-navy/70 shadow-hard">
              <h4 className="text-neo-white font-bold mb-3 text-sm sm:text-base">
                {t('education.classroomGame.gameSettings')}
              </h4>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <SummaryTile
                  icon={<ModeIcon className="w-4 h-4" />}
                  label={t('teacher.classroom.gameModes.title')}
                  value={t(`teacher.classroom.gameModes.${MODE_TRANSLATION_KEY[gameMode] ?? 'classic'}`)}
                />
                {isQuiz ? (
                  <>
                    {questionCount !== null && (
                      <SummaryTile
                        testId="classroom-quiz-question-count"
                        icon={<Brain className="w-4 h-4" />}
                        label={t('education.classroomGame.questions')}
                        value={String(questionCount)}
                      />
                    )}
                    {questionSeconds !== null && (
                      <SummaryTile
                        testId="classroom-quiz-seconds"
                        icon={<Clock className="w-4 h-4" />}
                        label={t('education.classroomGame.perQuestion')}
                        value={t('vocabQuiz.setup.seconds', { seconds: questionSeconds })}
                      />
                    )}
                  </>
                ) : (
                  <>
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
                      value={boardSizeLabel(boardSize)}
                    />
                  </>
                )}
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
                    {/* The word list is the answer key, so it is never sent to a
                        student — and an unguarded count then announced "0 words"
                        beside a ten-word lesson. Say nothing rather than that. */}
                    {wordCount > 0 && (
                      <span className="text-neo-white ms-auto shrink-0 font-neo-body">
                        {t('education.classroomGame.words', { count: wordCount })}
                      </span>
                    )}
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
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="p-3 rounded-neo border border-neo-black bg-neo-navy-light/80">
      <div className="flex items-center gap-1.5 text-neo-white text-[10px] uppercase tracking-wide mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-neo-white font-bold text-sm">{value}</p>
    </div>
  );
}
