import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '../../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('IncomingChallengeToast mount', () => {
  it('is mounted from conditional-providers only, inside the game stack where the socket lives', () => {
    const src = read('app/conditional-providers.tsx');
    expect(src).toMatch(/<GameSpecificProviders>\s*\{children\}\s*\{challengeToast\}/);
    expect(read('app/essential-providers.tsx')).not.toContain('IncomingChallengeToast');
    expect(read('app/providers.tsx')).not.toContain('IncomingChallengeToast');
  });
});
