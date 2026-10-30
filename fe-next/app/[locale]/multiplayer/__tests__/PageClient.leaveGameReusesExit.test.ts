import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const page = readFileSync(join(__dirname, '..', 'PageClient.tsx'), 'utf8');

describe('PageClient — the connection banner Leave reuses the one exit path', () => {
  const start = page.indexOf('onLeaveGame={');
  const handler = page.slice(start, page.indexOf('/> : <ConnectionDot', start));

  it('routes through handleExitToLobby', () => {
    expect(handler).toMatch(/handleExitToLobby\(\)/);
  });

  it('does not repeat the reset inline', () => {
    expect(handler).not.toMatch(/leaveRoom|setIsActive|clearSessionPreservingUsername|replaceState/);
  });
});
