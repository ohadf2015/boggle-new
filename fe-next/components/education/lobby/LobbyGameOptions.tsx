'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { ClassroomGameMode, VocabQuizVariant } from '@/shared/types/vocabQuiz';
import type { ClassroomBossId } from '@/shared/types/classroomBoss';
import { LobbySetupDisclosure } from './LobbySetupDisclosure';
import { LobbySetupPanel } from './LobbySetupPanel';
import { LobbyPressureDials } from './LobbyPressureDials';
import { LobbyRoundSettings } from './LobbyRoundSettings';
import { LobbyLateJoinToggle } from './LobbyLateJoinToggle';
import { LobbyEconomyToggles } from './LobbyEconomyToggles';
import type { LobbyRoundOptions } from './useLobbyRoundOptions';

export interface LobbyGameOptionsProps {
  opts: LobbyRoundOptions;
  roundMinutes: number;
  gameMode: ClassroomGameMode;
  vocabQuizVariant?: VocabQuizVariant;
  classroomBossId?: ClassroomBossId;
  allPlayableWords: string[];
  lessonWords: VocabularyWord[];
  lessonLanguage?: string;
}

/** Battle, Pro pressure dials, round, late join and economy: one modal behind a one-line summary. */
export function LobbyGameOptions({ opts, roundMinutes, gameMode, vocabQuizVariant, classroomBossId, allPlayableWords, lessonWords, lessonLanguage }: LobbyGameOptionsProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const summary = [
    t('education.modePicker.minutes', { count: roundMinutes }),
    t(`teacher.classroom.playStyle.${opts.playStyle}`),
    t(opts.allowLateJoin ? 'eduShell.host.lateJoinOn' : 'eduShell.host.lateJoinOff'),
  ].join(' · ');

  return (
    <LobbySetupDisclosure label={t('eduShell.host.gameOptions')} summary={summary} open={open} onToggle={() => setOpen((v) => !v)}>
      <div className="grid gap-6 @3xl/opts:grid-cols-2 @3xl/opts:gap-8">
        <div className="flex flex-col gap-5">
          <LobbySetupPanel
            activePreset={opts.activePreset}
            playStyle={opts.playStyle}
            teamCount={opts.teamCount}
            accessibility={opts.accessibility}
            onApplyPreset={opts.applyPreset}
            onPlayStyleChange={opts.setPlayStyle}
            onTeamCountChange={opts.setTeamCount}
            onAccessibilityChange={opts.setAccessibility}
          />
          <LobbyPressureDials pressure={opts.pressure} onChange={opts.setPressure} />
        </div>
        <div className="flex flex-col gap-5">
          <LobbyRoundSettings
            gameMode={gameMode}
            timerMinutes={opts.timerMinutes}
            boardSize={opts.boardSize}
            minWordLength={opts.minWordLength}
            targetWord={opts.targetWord}
            allPlayableWords={allPlayableWords}
            lessonWords={lessonWords}
            lessonLanguage={lessonLanguage}
            vocabQuizFocus={opts.vocabQuizFocus}
            vocabQuizQuestionCount={opts.vocabQuizQuestionCount}
            vocabQuizSeconds={opts.vocabQuizSeconds}
            treasureChestsEnabled={opts.treasureChestsEnabled}
            treasureChestsAvailable={vocabQuizVariant !== 'boss'}
            bossId={classroomBossId}
            onBossChange={opts.setBossId}
            onTimerChange={opts.setTimerMinutes}
            onBoardSizeChange={opts.setBoardSize}
            onMinWordLengthChange={opts.setMinWordLength}
            onTargetWordChange={opts.setTargetWord}
            onVocabQuizFocusChange={opts.setVocabQuizFocus}
            onVocabQuizQuestionCountChange={opts.setVocabQuizQuestionCount}
            onVocabQuizSecondsChange={opts.setVocabQuizSeconds}
            onTreasureChestsChange={opts.setTreasureChestsEnabled}
          />
          <LobbyLateJoinToggle
            checked={opts.allowLateJoin}
            onChange={opts.setAllowLateJoin}
            label={t('eduShell.host.lateJoin')}
            hint={t('eduShell.host.lateJoinHint')}
          />
          <LobbyEconomyToggles value={opts.economy} onChange={opts.setEconomy} />
        </div>
      </div>
    </LobbySetupDisclosure>
  );
}

export default LobbyGameOptions;
