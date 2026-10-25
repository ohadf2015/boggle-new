/**
 * Everything that is NOT the mode choice, in the one region that scrolls.
 *
 * The old `ClassroomSetupStep` opened on a wizard header ("Step 1 of 1", a
 * single progress dot), then a preset block, then classroom, then lessons,
 * then teams, then timer, then board size, and only THEN the game mode — the
 * decision that actually sets the lesson was last. Here the mode is pinned
 * above and this is the fine-tuning underneath it, in that order.
 */

'use client';

import type React from 'react';
import { School, BookOpen, Sparkles, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { LessonPicker } from '../pickers/LessonPicker';
import { BoardLanguageChip } from '../pickers/BoardLanguageChip';
import { ClassroomBattleSettings } from '../ClassroomBattleSettings';
import { SPED_VOCAB_CAP, type ClassroomPresetId } from '@/lib/education/classroomPresets';
import type { VocabularyLesson, Classroom } from '@/lib/supabase/education';
import type { PlayStyle } from '@/shared/utils/teamBattle';
import type { ClassroomAccessibility } from '@/shared/types/classroom';

const PRESETS: { id: ClassroomPresetId; key: string }[] = [
  { id: 'friday-battle', key: 'fridayBattle' },
  { id: 'sped', key: 'sped' },
  { id: 'standard', key: 'standard' },
];

/** One icon-badged card per question, so an open panel reads as grouped decisions, not one long list. */
function StepCard({ id, icon: Icon, tone, children }: { id: string; icon: LucideIcon; tone: string; children: React.ReactNode }) {
  return (
    <section
      data-testid={`lobby-step-${id}`}
      className="relative rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light/60 p-4 ps-14"
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute start-3 top-3 grid size-8 place-items-center rounded-full border-2 border-black font-neo-display text-sm font-black text-black shadow-hard-sm',
          tone
        )}
      >
        <Icon className="size-4" strokeWidth={3} />
      </span>
      {children}
    </section>
  );
}

export interface LobbySetupPanelProps {
  classrooms: Classroom[];
  lessons: VocabularyLesson[];
  selectedClassroomId: string;
  selectedLessonIds: string[];
  wordCount: number;
  activePreset: ClassroomPresetId | null;
  playStyle: PlayStyle;
  teamCount: number;
  accessibility: ClassroomAccessibility;
  onSelectClassroom: (id: string) => void;
  onSelectLessons: (ids: string[]) => void;
  onApplyPreset: (id: ClassroomPresetId) => void;
  onPlayStyleChange: (style: PlayStyle) => void;
  onTeamCountChange: (count: number) => void;
  onAccessibilityChange: (next: ClassroomAccessibility) => void;
}

export function LobbySetupPanel({
  classrooms,
  lessons,
  selectedClassroomId,
  selectedLessonIds,
  wordCount,
  activePreset,
  playStyle,
  teamCount,
  accessibility,
  onSelectClassroom,
  onSelectLessons,
  onApplyPreset,
  onPlayStyleChange,
  onTeamCountChange,
  onAccessibilityChange,
}: LobbySetupPanelProps) {
  const { t, language } = useLanguage();
  const classLanguage = classrooms.find((c) => c.id === selectedClassroomId)?.language;
  // Same rule launch uses: the first selected list (in lessons order) sets the board.
  const boardLanguage = lessons.find((l) => selectedLessonIds.includes(l.id))?.language;

  return (
    <div className="space-y-5">
      {/* Which class */}
      <StepCard id="class" icon={School} tone="bg-neo-cyan">
        <div
          id="lobby-classroom-label"
          className="mb-2 flex items-center gap-1.5 font-neo-display text-xs font-black uppercase text-neo-white/70"
        >
          {t('education.classroomGame.selectClassroom')}
        </div>
        <div role="radiogroup" aria-labelledby="lobby-classroom-label" className="flex flex-wrap gap-2">
          {classrooms.map((classroom) => {
            const isSelected = selectedClassroomId === classroom.id;
            return (
              <button
                key={classroom.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={classroom.name}
                onClick={() => onSelectClassroom(classroom.id)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-black px-3 py-1.5 transition',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                  isSelected
                    ? 'bg-neo-cyan text-black shadow-hard'
                    : 'border-neo-cream bg-neo-navy-light text-neo-cream shadow-hard-sm hover:bg-neo-navy'
                )}
              >
                <span className="font-neo-display text-sm font-black">{classroom.name}</span>
                <span
                  className={cn(
                    'font-neo-body text-[0.65rem] font-bold',
                    isSelected ? 'text-black/70' : 'text-neo-cream'
                  )}
                >
                  {classroom.member_count || 0} {t('education.students')}
                </span>
              </button>
            );
          })}
        </div>
      </StepCard>

      {/* Which words */}
      <StepCard id="words" icon={BookOpen} tone="bg-neo-lime">
        {selectedLessonIds.length > 0 && (
          <div className="mb-2 flex flex-wrap justify-end gap-2">
            {boardLanguage && <BoardLanguageChip language={boardLanguage} />}
            <span className="inline-flex items-center gap-1.5 rounded-neo border-[2px] border-neo-lime bg-neo-navy-light px-2 py-0.5 font-neo-display text-[0.65rem] font-black uppercase text-neo-lime">
              <BookOpen className="size-3.5" strokeWidth={3} aria-hidden="true" />
              {t('education.classroomGame.words', { count: wordCount })}
            </span>
          </div>
        )}
        <LessonPicker
          mode="multi"
          lessons={lessons}
          selectedIds={selectedLessonIds}
          onChange={onSelectLessons}
          classLanguage={classLanguage}
          createHref={`/${language}/teacher/curriculum${selectedClassroomId ? `?classroomId=${selectedClassroomId}` : ''}`}
        />
        {activePreset === 'sped' && wordCount > SPED_VOCAB_CAP && (
          <p className="mt-2 font-neo-body text-[0.7rem] text-neo-white/60" data-testid="sped-vocab-cap-note">
            {t('teacher.classroom.support.vocabCapNote', { count: SPED_VOCAB_CAP })}
          </p>
        )}
      </StepCard>

      {/* One-tap rituals */}
      <StepCard id="presets" icon={Sparkles} tone="bg-neo-purple">
        <div
          id="lobby-preset-label"
          className="mb-2 flex items-center gap-1.5 font-neo-display text-xs font-black uppercase text-neo-white/70"
        >
          {t('teacher.classroom.presets.title')}
        </div>
        <div role="radiogroup" aria-labelledby="lobby-preset-label" className="grid gap-2 sm:grid-cols-3">
          {PRESETS.map(({ id, key }) => {
            const isActive = activePreset === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isActive}
                data-testid={`preset-${id}`}
                onClick={() => onApplyPreset(id)}
                className={cn(
                  'rounded-neo border-2 border-black px-3 py-3 text-start transition hover:-translate-y-0.5 active:translate-y-0',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                  isActive
                    ? 'bg-neo-purple text-black shadow-hard'
                    : 'border-neo-cream bg-neo-navy-light text-neo-cream shadow-hard-sm hover:bg-neo-navy'
                )}
              >
                <span className="block font-neo-display text-sm font-black uppercase">
                  {t(`teacher.classroom.presets.${key}.name`)}
                </span>
                <span
                  className={cn(
                    'block font-neo-body text-xs font-bold',
                    isActive ? 'text-black/75' : 'text-neo-cream'
                  )}
                >
                  {t(`teacher.classroom.presets.${key}.desc`)}
                </span>
              </button>
            );
          })}
        </div>
      </StepCard>

      <ClassroomBattleSettings
        playStyle={playStyle}
        teamCount={teamCount}
        accessibility={accessibility}
        onPlayStyleChange={onPlayStyleChange}
        onTeamCountChange={onTeamCountChange}
        onAccessibilityChange={onAccessibilityChange}
      />
    </div>
  );
}

export default LobbySetupPanel;
