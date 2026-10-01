import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The header's back target and its visibility must use the same tri-state
 * classroom context every other exit in useMpPageState uses — not the raw
 * `?classroom=true` URL flag, which a student who typed a class code into the
 * arcade lobby never has.
 */
const source = readFileSync(join(__dirname, '..', 'PageClient.tsx'), 'utf8');

function headerBlock(): string {
  const start = source.indexOf('<EducationHeader');
  const end = source.indexOf('/>', start);
  return start < 0 || end < 0 ? '' : source.slice(start, end);
}

describe('multiplayer EducationHeader follows the tri-state classroom context', () => {
  it('derives the back target from classroomContext, not the URL flag', () => {
    const block = headerBlock();
    expect(block).toMatch(/multiplayerExitDestination\(/);
    expect(block).not.toMatch(/isClassroomMode,/);
    expect(block).toMatch(/isClassroomMode:\s*inClassroom/);
  });

  it('shows the classroom chrome on the same predicate', () => {
    expect(source).toMatch(/const inClassroom = classroomContext === 'classroom'/);
    expect(source).toMatch(/\{inClassroom \? \(/);
    expect(source).not.toMatch(/\{isClassroomMode \? \(/);
  });
});
