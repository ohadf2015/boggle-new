'use client';

import { useState, type ReactNode } from 'react';
import { Crown, Timer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { ClassroomGameMode, VocabQuizVariant } from '@/shared/types/vocabQuiz';
import type { ClassroomBossId } from '@/shared/types/classroomBoss';
import { LobbySetupDisclosure } from './LobbySetupDisclosure';
import { LobbySetupPanel } from './LobbySetupPanel';
import { LobbyPressureDials, type LobbyPressureDialsProps } from './LobbyPressureDials';
import { LobbyRoundSettings } from './LobbyRoundSettings';
import { LobbyEconomyToggles } from './LobbyEconomyToggles';
import { LobbyOptionGroup, LobbySwitchRow } from './LobbyOptionParts';
import { lobbySetupSummary } from './lobbySetupModel';
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
  /** "Send list as homework": rare, so it lives here and not beside the word list. */
  homework?: ReactNode;
  proAccess?: LobbyPressureDialsProps['access'];
  /** Preview fixtures open the sheet on first paint. */
  defaultOpen?: boolean;
}

/** Play style, support, round, economy, homework and the Pro dials: one grouped sheet behind a one-line summary. */
export function LobbyGameOptions({ opts, roundMinutes, gameMode, vocabQuizVariant, classroomBossId, allPlayableWords, lessonWords, lessonLanguage, homework, proAccess, defaultOpen = false }: LobbyGameOptionsProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(defaultOpen);
  const summary = lobbySetupSummary({ playStyle: opts.playStyle, teamCount: opts.teamCount, rivalry: opts.rivalry, roundMinutes }, t);

  return (
    <LobbySetupDisclosure label={t('eduShell.host.gameOptions')} summary={summary} open={open} onToggle={() => setOpen((v) => !v)}>
      <div className="grid gap-4 @3xl/opts:grid-cols-2 @3xl/opts:gap-5">
        <section data-testid="lobby-options-pro" aria-labelledby="lobby-options-pro-title" className="flex flex-col gap-2 @3xl/opts:col-span-2">
          <h3 id="lobby-options-pro-title" className="flex items-center gap-2 font-neo-display text-base font-bold text-neo-cream">
            <Crown className="size-5 shrink-0 text-neo-cream/70" strokeWidth={2.5} aria-hidden="true" />
            {t('eduShell.host.proOptions')}
          </h3>
          <LobbyPressureDials pressure={opts.pressure} onChange={opts.setPressure} access={proAccess} />
        </section>
        <LobbySetupPanel
          playStyle={opts.playStyle}
          teamCount={opts.teamCount}
          accessibility={opts.accessibility}
          onPlayStyleChange={opts.setPlayStyle}
          onTeamCountChange={opts.setTeamCount}
          onAccessibilityChange={opts.setAccessibility}
          rivalry={opts.rivalry}
          onRivalryChange={opts.setRivalry}
        />
        <div className="flex flex-col gap-4">
          <LobbyOptionGroup id="lobby-opt-round" title={t('eduShell.host.roundGroup')} icon={Timer}>
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
            <LobbySwitchRow
              testId="lobby-late-join"
              label={t('eduShell.host.lateJoin')}
              hint={t('eduShell.host.lateJoinHint')}
              checked={opts.allowLateJoin}
              onChange={opts.setAllowLateJoin}
            />
          </LobbyOptionGroup>
          <LobbyEconomyToggles value={opts.economy} onChange={opts.setEconomy} />
          {homework ? (
            <section data-testid="lobby-options-homework" aria-labelledby="lobby-options-homework-title" className="flex flex-col items-start gap-2 rounded-neo-lg border-2 border-neo-cream/35 bg-neo-navy-light p-3">
              <h3 id="lobby-options-homework-title" className="font-neo-display text-base font-bold text-neo-cream">
                {t('eduShell.host.homeworkTitle')}
              </h3>
              <p className="font-neo-body text-sm text-neo-cream/75">{t('eduShell.host.homeworkHint')}</p>
              {homework}
            </section>
          ) : null}
        </div>
      </div>
    </LobbySetupDisclosure>
  );
}

export default LobbyGameOptions;
