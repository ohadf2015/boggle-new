/**
 * Wordcraft as a live classroom mode — the registration contract.
 *
 * A classroom mode is real only when it exists in EVERY registry a teacher
 * touches: the picker catalog, the HQ chip row, the lobby posters, the socket
 * enums that enforce the wire, and the rematch list at round end. One missing
 * entry and the mode is either unlaunchable or un-relaunchable. Pinned in one
 * place so adding the mode is a single deliberate act.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLASSROOM_GAME_MODES } from '@/shared/types/vocabQuiz';
import { TEACHER_GAME_MODES, teacherGameMode } from '@/lib/education/gameModes';
import { HQ_MODES } from '@/components/teacher/hq/hqModes';

const FE_NEXT = join(__dirname, '..', '..', '..');

describe('wordcraft is a classroom mode everywhere a teacher looks', () => {
  it('is in the classroom mode registry', () => {
    expect(CLASSROOM_GAME_MODES).toContain('wordcraft');
  });

  it('has a teacher picker poster with a name and a how-it-plays line', () => {
    const mode = teacherGameMode('wordcraft');
    expect(mode).toBeDefined();
    expect(mode!.nameKey).toBe('teacher.classroom.gameModes.wordcraft');
    expect(mode!.howKey).toBe('education.modePicker.how.wordcraft');
    expect(mode!.minutes).toBeGreaterThan(0);
  });

  it('keeps the picker catalog in lockstep with the registry', () => {
    const offered = TEACHER_GAME_MODES.map((m) => m.id);
    expect([...offered].sort()).toEqual([...CLASSROOM_GAME_MODES].sort());
  });

  it('has an HQ chip whose icon shape no other chip wears (colour+shape rule)', () => {
    const chip = HQ_MODES.find((m) => m.id === 'wordcraft');
    expect(chip).toBeDefined();
    const icons = HQ_MODES.map((m) => m.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('is accepted by the createClassroomGame socket enum', () => {
    const handler = readFileSync(join(FE_NEXT, 'backend', 'handlers', 'classroomGameHandler.ts'), 'utf8');
    expect(handler).toContain("'wordcraft'");
  });

  it('is accepted by the startGame socket schema', () => {
    const schemas = readFileSync(join(FE_NEXT, 'shared', 'schemas', 'socketSchemas.ts'), 'utf8');
    expect(schemas).toContain("'wordcraft'");
  });

  it('rides the in-place mode switch enum (same code, no rejoin)', () => {
    // classroomGameModeHandler builds its Zod enum FROM CLASSROOM_GAME_MODES —
    // containing 'wordcraft' here proves the registry flows through.
    const handler = readFileSync(join(FE_NEXT, 'backend', 'handlers', 'classroomGameModeHandler.ts'), 'utf8');
    expect(handler).toContain('CLASSROOM_GAME_MODES');
  });

  it('is offered again at round end (the rematch selector)', () => {
    const route = readFileSync(join(FE_NEXT, 'lib', 'education', 'roundEndResultsRoute.ts'), 'utf8');
    expect(route).toContain("'wordcraft'");
  });

  it('has a student branch before the letter-grid guard', () => {
    const view = readFileSync(join(FE_NEXT, 'player', 'components', 'PlayerInGameView.tsx'), 'utf8');
    expect(view).toContain("gameMode === 'wordcraft'");
    expect(view).toContain('WordcraftLiveView');
  });

  it('has a host projector branch', () => {
    const view = readFileSync(join(FE_NEXT, 'host', 'components', 'HostInGameView.tsx'), 'utf8');
    expect(view).toContain("gameMode === 'wordcraft'");
    expect(view).toContain('WordcraftProjectorView');
  });
});
