import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Differentiation reaches the live game through ONE mount: the server sends the
 * per-socket `classroomContext` (level + lesson word bank), the socket hook
 * exposes it, and the multiplayer page hands both to <StudentWordBank>. The
 * component renders nothing for core / non-classroom rooms, so the mount is
 * unconditional inside the live round. This guards the wiring the component's
 * own tests cannot see.
 */
describe('multiplayer PageClient mounts StudentWordBank from the socket hook', () => {
  const src = readFileSync(resolve(__dirname, '../PageClient.tsx'), 'utf8');

  it('imports the component and reads both fields off useMultiplayerSocket', () => {
    expect(src).toMatch(/import \{ StudentWordBank \} from '@\/components\/education\/StudentWordBank'/);
    expect(src).toMatch(/classroomLevel,\s*classroomWordBank,?\s*\n?\s*\} = useMultiplayerSocket\(/);
  });

  it('renders it during the live round with the hook fields', () => {
    expect(src).toMatch(/<StudentWordBank\s+level=\{classroomLevel\}\s+words=\{classroomWordBank\}/);
  });
});
