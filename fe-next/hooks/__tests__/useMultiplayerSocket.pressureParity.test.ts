import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The quiz's `startGame` comes from buildQuizShellStart, NOT buildRoundPayload
 * (pitfall class 3: one room, two start payloads). The store listener is
 * payload-shape-agnostic, so the only contract worth pinning is that both
 * builders emit the same `pressure` field the listener reads.
 */
const hook = readFileSync(resolve(__dirname, '../useMultiplayerSocket.ts'), 'utf8');
const shell = readFileSync(resolve(__dirname, '../../backend/services/vocabQuizShell.ts'), 'utf8');
const round = readFileSync(resolve(__dirname, '../../backend/modes/roundPayload.ts'), 'utf8');

describe('classroom pressure reaches the client on EVERY start path', () => {
  it('the hook stores pressure from startGame', () => {
    const i = hook.indexOf("socketInstance.on('startGame'");
    expect(i).toBeGreaterThan(-1);
    expect(hook.slice(i, i + 4000)).toMatch(/setClassroomPressure\(pressureFromStartPayload\(data\)\)/);
  });

  it('the quiz shell start carries pressure when the session has it', () => {
    expect(shell).toMatch(/session\.pressure\s*\?\s*\{\s*pressure:\s*session\.pressure\s*\}/);
  });

  it('the board start payload carries pressure when the game has it', () => {
    expect(round).toMatch(/game\.classroomPressure/);
  });
});
