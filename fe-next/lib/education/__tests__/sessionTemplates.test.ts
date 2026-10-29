import { describe, it, expect } from 'vitest';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';
import { CURRICULUM_SEEDS, loadCurriculumSeed } from '@/lib/education/curriculum/curriculumSeed';
import { parseHostMinutes, parseHostMode } from '@/lib/education/teacherHostHref';
import { CLASSROOM_PRESETS } from '@/lib/education/classroomPresets';
import { GRADE_BANDS } from '@/lib/education/library';
import { MIN_WORDS_PER_FOCUS } from '@/lib/education/vocabFocus';
import { VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';
import { packThemesFor, themedPackCode } from '@/lib/education/themedPacks';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import {
  SESSION_TEMPLATES,
  sessionHostHref,
  sessionMinutes,
  sessionPackThemes,
  sessionsFor,
  type SessionId,
} from '@/lib/education/sessionTemplates';

const allLists = CURRICULUM_SEEDS.flatMap((name) => loadCurriculumSeed(name).lists);
const listByCode = new Map(allLists.map((l) => [l.code, l]));
const AUTUMN = new Date(2026, 9, 15);

describe('ready-to-run session catalog', () => {
  it('has the eight sessions teachers asked for, each id once', () => {
    const ids = SESSION_TEMPLATES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(
      ['brain-break', 'early-finishers', 'esl-starter', 'exit-ticket', 'icebreaker', 'spelling-bee', 'test-review', 'warm-up'].sort(),
    );
  });

  it.each(SESSION_TEMPLATES.map((s) => [s.id, s] as const))('%s launches a mode, timer and preset the lobby accepts', (_id, s) => {
    expect(parseHostMode(s.mode)).toBe(s.mode);
    expect(parseHostMinutes(String(s.timerMinutes))).toBe(s.timerMinutes);
    if (s.preset) expect(Object.keys(CLASSROOM_PRESETS)).toContain(s.preset);
    expect(s.rounds).toBeGreaterThanOrEqual(1);
    expect(s.gradeBands.length).toBeGreaterThan(0);
    for (const band of s.gradeBands) expect(GRADE_BANDS).toContain(band);
    expect(s.nameKey).toBe(`education.starterPacks.session.${s.id.replace(/-(\w)/g, (_m, c: string) => c.toUpperCase())}.name`);
    expect(s.whenKey).toBe(s.nameKey.replace(/\.name$/, '.when'));
    expect(EDU_MASCOT[s.mascot!]).toMatch(/\.webp$/);
  });

  it('labels the warm-up 5 min and the exit ticket and brain break 3 min, derived from the lobby round math', () => {
    const minutes = (id: SessionId) => sessionMinutes(SESSION_TEMPLATES.find((s) => s.id === id)!);
    expect(minutes('warm-up')).toBe(5);
    expect(minutes('exit-ticket')).toBe(3);
    expect(minutes('brain-break')).toBe(3);
  });

  it('every pack a session names exists as a real curriculum list in every language it is offered in', () => {
    for (const language of EDUCATION_LANGUAGES) {
      for (const s of sessionsFor(language)) {
        for (const theme of sessionPackThemes(s, language, AUTUMN)) {
          expect(packThemesFor(language), `${s.id}/${language}`).toContain(theme);
          expect(listByCode.has(themedPackCode(language, theme)), `${s.id} -> ${themedPackCode(language, theme)}`).toBe(true);
        }
      }
    }
  });

  it('a quiz session only points at lists with enough definitions to build questions', () => {
    for (const language of EDUCATION_LANGUAGES) {
      for (const s of sessionsFor(language).filter((x) => x.mode === VOCAB_QUIZ_MODE)) {
        for (const theme of sessionPackThemes(s, language, AUTUMN)) {
          const list = listByCode.get(themedPackCode(language, theme))!;
          expect(list.words.filter((w) => w.definition.trim()).length).toBeGreaterThanOrEqual(MIN_WORDS_PER_FOCUS);
        }
      }
    }
  });

  it('the brain break needs no list, and every other session resolves at least one', () => {
    for (const language of EDUCATION_LANGUAGES) {
      for (const s of sessionsFor(language)) {
        const themes = sessionPackThemes(s, language, AUTUMN);
        if (s.id === 'brain-break') expect(themes).toEqual([]);
        else expect(themes.length, `${s.id}/${language}`).toBeGreaterThan(0);
      }
    }
  });

  it('offers the ESL starter only on English boards, with all four CEFR levels', () => {
    expect(sessionsFor('en').map((s) => s.id)).toContain('esl-starter');
    expect(sessionsFor('he').map((s) => s.id)).not.toContain('esl-starter');
    const esl = SESSION_TEMPLATES.find((s) => s.id === 'esl-starter')!;
    expect(sessionPackThemes(esl, 'en', AUTUMN)).toEqual(['esl-a1', 'esl-a2', 'esl-b1', 'esl-b2']);
  });

  it('the seasonal warm-up follows the calendar', () => {
    const warmUp = SESSION_TEMPLATES.find((s) => s.id === 'warm-up')!;
    expect(sessionPackThemes(warmUp, 'sv', new Date(2026, 0, 10))).toEqual(['winter']);
    expect(sessionPackThemes(warmUp, 'sv', new Date(2026, 8, 1))).toEqual(['school']);
  });
});

describe('sessionHostHref', () => {
  it('carries mode, minutes, the session, its pack and quiz length on the lobby URL', () => {
    const exit = SESSION_TEMPLATES.find((s) => s.id === 'exit-ticket')!;
    const href = sessionHostHref('he', exit, themedPackCode('he', 'autumn'), 'class-1');
    const url = new URL(href, 'https://x.test');
    expect(url.pathname).toBe('/he/education/classroom-game');
    expect(url.searchParams.get('classroomId')).toBe('class-1');
    expect(url.searchParams.get('mode')).toBe('vocab-quiz');
    expect(url.searchParams.get('minutes')).toBe(String(exit.timerMinutes));
    expect(url.searchParams.get('session')).toBe('exit-ticket');
    expect(url.searchParams.get('pack')).toBe('LC-HE-PK-AUTUMN');
    expect(url.searchParams.get('questions')).toBe(String(exit.quiz!.questionCount));
    expect(url.searchParams.get('seconds')).toBe(String(exit.quiz!.seconds));
  });

  it('leaves pack off for a session with no list and adds the preset when there is one', () => {
    const brk = SESSION_TEMPLATES.find((s) => s.id === 'brain-break')!;
    expect(new URL(sessionHostHref('en', brk, null), 'https://x.test').searchParams.has('pack')).toBe(false);
    const bee = SESSION_TEMPLATES.find((s) => s.id === 'spelling-bee')!;
    expect(new URL(sessionHostHref('en', bee, null), 'https://x.test').searchParams.get('preset')).toBe('friday-battle');
  });
});
