import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// PageClient is an app shell no unit test can render (see educationHeaderBackHref.test.ts).
const source = readFileSync(join(__dirname, '..', 'PageClient.tsx'), 'utf8');

describe('classroom host header Back asks before closing the room', () => {
  it('hands EducationHeader an onBack that opens the confirm while the host is in a room', () => {
    const header = source.match(/<EducationHeader\s+showBackButton[\s\S]*?\/>/);
    expect(header).not.toBeNull();
    expect(header![0]).toMatch(/onBack=\{hostGuardsBack \? /);
  });

  it('confirms through the classroom exit dialog, which leaves via handleExitToLobby', () => {
    const dialog = source.match(/<ExitConfirmDialog[\s\S]*?\/>/);
    expect(dialog).not.toBeNull();
    expect(dialog![0]).toMatch(/onConfirm=\{handleExitToLobby\}/);
    expect(dialog![0]).toMatch(/classroom\b/);
  });
});
