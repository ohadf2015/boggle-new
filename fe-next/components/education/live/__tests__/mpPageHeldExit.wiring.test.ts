import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, '../../../../app/[locale]/multiplayer/useMpPageState.ts'), 'utf8');

describe('the MP page exit waits for a pending classroom record', () => {
  it('routes the page exit through useHeldMpExit with the live classroom context', () => {
    expect(source).toMatch(/const exitMp = useHeldMpExit\(classroomContext, pathname, exitNow\)/);
  });
});
