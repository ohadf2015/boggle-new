/**
 * Classroom mode registry — every mode must be complete everywhere (RED first).
 *
 * A teacher started a Vocab Quiz room and landed on the segment crash card;
 * the room was torn down before a single student could join. Cause:
 * `ClassroomModeBanner`'s `MODE_ICON` / `MODE_TRANSLATION_KEY` are typed
 * `Record<GameMode, …>`, and `vocab-quiz` is deliberately NOT in `GameMode`
 * (it has no letter grid, so it must not leak into the board engine — see
 * shared/types/vocabQuiz.ts). The lookup returned undefined, `<ModeIcon/>`
 * threw, and the host view died. TypeScript could not catch it because the
 * value arrives from sessionStorage typed as the narrower union.
 *
 * The single-entry fix is one line. These tests are the part that matters:
 * they pin EVERY classroom-facing mode surface to `CLASSROOM_GAME_MODES`, so a
 * sixth mode cannot crash a host the same way. Each `it` fails loudly naming
 * the mode and the surface that forgot it.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

import { CLASSROOM_GAME_MODES } from '@/shared/types/vocabQuiz';
import { ClassroomModeBanner, MODE_ICON, MODE_TRANSLATION_KEY } from '../ClassroomModeBanner';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { es } from '@/translations/es.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { ru } from '@/translations/ru.js';

const LOCALES: Record<string, Record<string, unknown>> = { en, he, es, sv, ja, ru };
const REPO = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf8');

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
    language: 'en',
  }),
}));
vi.mock('qrcode.react', () => ({ QRCodeCanvas: () => <div data-testid="qr" /> }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

describe('CLASSROOM_GAME_MODES is the single source', () => {
  it('lists the five live classroom modes', () => {
    expect([...CLASSROOM_GAME_MODES].sort()).toEqual(
      ['blast', 'classic', 'vocab-quiz', 'wheel-rush', 'word-hunt'].sort()
    );
  });
});

describe('ClassroomModeBanner renders for every classroom mode', () => {
  // The actual crash: a host whose room is in a mode the banner has no icon
  // for. Rendering each mode is the only assertion that would have caught it.
  it.each([...CLASSROOM_GAME_MODES])('does not throw for %s', (mode) => {
    expect(() =>
      render(
        <ClassroomModeBanner
          lessonData={{
            lessonId: 'l1',
            lessonName: 'Unit 3',
            vocabularyWords: ['abandon', 'brittle'],
            language: 'en',
            gameMode: mode,
            templateSettings: {
              timerSeconds: 180,
              difficulty: 'medium',
              minWordLength: 3,
              allowLateJoin: true,
            },
          }}
          gameCode="ABC123"
          expanded
        />
      )
    ).not.toThrow();
  });

  it('shows a real mode label, never a raw key or "undefined"', () => {
    render(
      <ClassroomModeBanner
        lessonData={{
          lessonId: 'l1',
          lessonName: 'Unit 3',
          vocabularyWords: ['abandon'],
          language: 'en',
          gameMode: 'vocab-quiz',
          templateSettings: {
            timerSeconds: 180, difficulty: 'medium', minWordLength: 3, allowLateJoin: true,
          },
        }}
        gameCode="ABC123"
        expanded
      />
    );
    expect(screen.getByText('teacher.classroom.gameModes.vocabQuiz')).toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });

  it('falls back to a safe icon rather than crashing on an unknown mode', () => {
    // Defence in depth: the maps above are pinned, but a host must never die
    // over a cosmetic icon lookup again.
    expect(() =>
      render(
        <ClassroomModeBanner
          lessonData={{
            lessonId: 'l1',
            lessonName: 'X',
            vocabularyWords: [],
            language: 'en',
            gameMode: 'not-a-real-mode' as never,
            templateSettings: null,
          }}
          gameCode="ABC123"
          expanded
        />
      )
    ).not.toThrow();
  });
});

describe('every classroom mode is complete on every surface', () => {
  it.each([...CLASSROOM_GAME_MODES])('%s has a banner icon', (mode) => {
    expect(MODE_ICON[mode]).toBeTruthy();
  });

  it.each([...CLASSROOM_GAME_MODES])('%s has a banner translation key', (mode) => {
    expect(typeof MODE_TRANSLATION_KEY[mode]).toBe('string');
  });

  it.each([...CLASSROOM_GAME_MODES])('%s has a label in all six locales', (mode) => {
    const key = MODE_TRANSLATION_KEY[mode];
    for (const [locale, dict] of Object.entries(LOCALES)) {
      const label = (dict as never as {
        teacher?: { classroom?: { gameModes?: Record<string, string> } };
      }).teacher?.classroom?.gameModes?.[key];
      expect(typeof label, `${locale} is missing teacher.classroom.gameModes.${key}`).toBe('string');
      expect(label!.length, `${locale} has an empty label for ${mode}`).toBeGreaterThan(0);
    }
  });

  it.each([...CLASSROOM_GAME_MODES])('%s is offered in the teacher wizard', (mode) => {
    // Source-text pin rather than importing the component: the wizard pulls in
    // the whole education tree, and this assertion only needs the mode list.
    const src = read('components/education/ClassroomModeSettings.tsx');
    expect(src, `ClassroomModeSettings has no entry for ${mode}`).toContain(`'${mode}'`);
  });

  it.each([...CLASSROOM_GAME_MODES])('%s is accepted by the classroom create handler', (mode) => {
    const src = read('backend/handlers/classroomGameHandler.ts');
    const enumLine = src.split('\n').find((l) => l.includes('gameMode: z.enum('));
    expect(enumLine, 'could not find the gameMode enum').toBeTruthy();
    expect(enumLine!, `the create handler rejects ${mode}`).toContain(`'${mode}'`);
  });

  it.each([...CLASSROOM_GAME_MODES])('%s is storable in the classroom game record', (mode) => {
    const src = read('backend/modules/classroomGameManager.ts');
    expect(src, `ClassroomGameSettings cannot hold ${mode}`).toContain(`'${mode}'`);
  });
});
