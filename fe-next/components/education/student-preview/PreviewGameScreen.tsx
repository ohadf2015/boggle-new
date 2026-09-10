import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';
import type { PreviewBoardResult } from '@/lib/education/previewBoard';
import { formatCountdown, gameModeLabel, type Translate } from './previewLabels';
import type { PreviewQuizQuestion } from './previewQuiz';

interface PreviewGameScreenProps {
  t: Translate;
  board: PreviewBoardResult;
  gameMode: ClassroomGameMode;
  timerMinutes: number;
  minWordLength: number;
  quiz?: PreviewQuizQuestion | null;
}

/** In-game screen: letter board for board modes, sample 4-choice question for Vocab Quiz. */
export function PreviewGameScreen({
  t,
  board,
  gameMode,
  timerMinutes,
  minWordLength,
  quiz,
}: PreviewGameScreenProps) {
  if (gameMode === VOCAB_QUIZ_MODE) {
    return <QuizPreview t={t} gameMode={gameMode} timerMinutes={timerMinutes} quiz={quiz} />;
  }

  const cols = board.grid[0]?.length ?? 0;
  const sample = board.placements[0];
  const litCells = new Set(sample?.path.map(([r, c]) => `${r},${c}`) ?? []);

  return (
    <div className="flex h-full flex-col gap-3">
      <PreviewHud t={t} gameMode={gameMode} timerMinutes={timerMinutes} />

      <div
        data-testid="student-preview-board"
        role="img"
        aria-label={t('education.studentPreview.game.boardLabel')}
        dir="ltr"
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {board.grid.map((row, r) =>
          row.map((letter, c) => {
            const lit = litCells.has(`${r},${c}`);
            return (
              <span
                key={`${r}-${c}`}
                data-testid="student-preview-tile"
                className={cn(
                  'flex aspect-square items-center justify-center rounded-neo-sm border-2 border-neo-black font-neo-display text-base font-black',
                  lit ? 'bg-neo-lime text-neo-navy shadow-hard-sm' : 'bg-neo-cream text-neo-navy'
                )}
              >
                {letter}
              </span>
            );
          })
        )}
      </div>

      {sample && (
        <p className="text-center text-[11px] text-neo-lime">
          {t('education.studentPreview.game.samplePath', { word: sample.word })}
        </p>
      )}

      <div className="mt-auto rounded-neo border-2 border-neo-white/20 bg-neo-navy-light px-3 py-2 text-center text-xs text-neo-white/80">
        {t('education.studentPreview.game.minLength', { count: minWordLength })}
      </div>
    </div>
  );
}

function PreviewHud({
  t,
  gameMode,
  timerMinutes,
}: {
  t: Translate;
  gameMode: ClassroomGameMode;
  timerMinutes: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        dir="ltr"
        className="inline-flex items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-cream px-2 py-1 font-mono text-sm font-black text-neo-navy shadow-hard-sm"
        aria-label={t('education.studentPreview.game.timeLeft')}
      >
        <Timer className="h-4 w-4" aria-hidden="true" />
        {formatCountdown(timerMinutes)}
      </span>
      <span className="rounded-neo border-2 border-neo-black bg-neo-pink px-2 py-1 font-neo-display text-[11px] font-black uppercase tracking-wide text-neo-black shadow-hard-sm">
        {gameModeLabel(t, gameMode)}
      </span>
    </div>
  );
}

const OPTION_STYLES = [
  'bg-neo-lime text-neo-black',
  'bg-neo-pink text-neo-white',
  'bg-neo-cyan text-neo-black',
  'bg-neo-purple text-neo-white',
] as const;

function QuizPreview({
  t,
  gameMode,
  timerMinutes,
  quiz,
}: {
  t: Translate;
  gameMode: ClassroomGameMode;
  timerMinutes: number;
  quiz?: PreviewQuizQuestion | null;
}) {
  const choices = quiz?.choices ?? [];

  return (
    <div className="flex h-full flex-col gap-3">
      <PreviewHud t={t} gameMode={gameMode} timerMinutes={timerMinutes} />

      <div className="rounded-neo border-2 border-neo-black bg-neo-navy-light p-3">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-neo-cyan">
          {t('education.studentPreview.game.quizLabel')}
        </p>
        <p
          data-testid="student-preview-quiz-prompt"
          className="font-neo-display text-base font-black leading-snug text-neo-cream"
        >
          {quiz?.prompt || quiz?.targetWord || ''}
        </p>
      </div>

      <div
        data-testid="student-preview-quiz-options"
        role="group"
        aria-label={t('education.studentPreview.game.quizLabel')}
        className="grid grid-cols-1 gap-2"
      >
        {choices.map((choice, index) => (
          <button
            key={`${index}-${choice}`}
            type="button"
            disabled
            className={cn(
              'min-h-[44px] rounded-neo border-2 border-neo-black px-3 py-2 text-start font-neo-display text-sm font-bold shadow-hard-sm',
              OPTION_STYLES[index % OPTION_STYLES.length]
            )}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
