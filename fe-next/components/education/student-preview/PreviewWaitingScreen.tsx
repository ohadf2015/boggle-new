import type { GameMode } from '@/shared/types/game';
import {
  boardSizeLabel,
  gameModeLabel,
  minLengthLabel,
  timerLabel,
  type Translate,
} from './previewLabels';

interface PreviewWaitingScreenProps {
  t: Translate;
  joinCode: string;
  gameMode: GameMode;
  timerMinutes: number;
  boardSize: 'small' | 'medium' | 'large';
  rows: number;
  cols: number;
  minWordLength: number;
}

/** The student lobby: code on top, "waiting for your teacher", round settings. */
export function PreviewWaitingScreen({
  t,
  joinCode,
  gameMode,
  timerMinutes,
  boardSize,
  rows,
  cols,
  minWordLength,
}: PreviewWaitingScreenProps) {
  const rowsList: { label: string; value: string; extra?: string }[] = [
    { label: t('education.studentPreview.settings.mode'), value: gameModeLabel(t, gameMode) },
    { label: t('education.studentPreview.settings.timer'), value: timerLabel(t, timerMinutes) },
    {
      label: t('education.studentPreview.settings.board'),
      value: boardSizeLabel(t, boardSize),
      extra: `${rows}×${cols}`,
    },
    {
      label: t('education.studentPreview.settings.minLength'),
      value: minLengthLabel(t, minWordLength),
    },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-neo-white/60">
          {t('education.classroomGame.classCode')}
        </p>
        <p dir="ltr" className="font-mono text-3xl font-black tracking-widest text-neo-cyan">
          {joinCode}
        </p>
      </div>

      <div className="relative h-12 w-12" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border-4 border-neo-cyan/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-neo-cyan border-r-neo-cyan" />
      </div>

      <div>
        <h3 className="font-neo-display text-xl font-black leading-tight text-neo-white">
          {t('education.studentPreview.waiting.title')}
        </h3>
        <p className="mt-1 text-xs text-neo-white/70">{t('education.studentPreview.waiting.subtitle')}</p>
      </div>

      <div className="w-full rounded-neo border-3 border-neo-cyan bg-neo-navy-light p-3 text-start">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neo-white/60">
          {t('education.studentPreview.waiting.settingsTitle')}
        </p>
        <dl className="space-y-1.5">
          {rowsList.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-2 text-sm">
              <dt className="text-neo-white/70">{row.label}</dt>
              <dd className="flex items-baseline gap-1.5 font-bold text-neo-white">
                <span>{row.value}</span>
                {row.extra && (
                  <span dir="ltr" className="font-mono text-xs text-neo-lime">
                    {row.extra}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
