import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, '..', 'useMpPageState.ts'), 'utf8');

function topLevelRouterProps(): string {
  const start = source.indexOf('const routerProps: MpPhaseRouterProps = {');
  const entry = source.indexOf('entry: {', start);
  return start < 0 || entry < 0 ? '' : source.slice(start, entry);
}

describe('MpPhaseRouter follows the tri-state classroom context', () => {
  it('feeds the in-room and results views classroomContext, not the URL flag', () => {
    const block = topLevelRouterProps();
    expect(block).not.toBe('');
    expect(block).toMatch(/isClassroomMode:\s*classroomContext === 'classroom'/);
    expect(block).not.toMatch(/roomLanguage,\s*isClassroomMode,/);
  });
});
