import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MODE_META } from '@/lib/landing/modeMeta';
import { MODE_COACH } from '@/lib/tutorial/modeCoachContent';
import { isGameplayPath } from '@/lib/gameplayRoutes';
import { getModePresentation } from '@/lib/multiplayer/modePresentation';

const root = resolve(__dirname, '../..');

describe('sealed-bid mode removed', () => {
  it('has no landing, coach or route registration', () => {
    expect(MODE_META).not.toHaveProperty('sealedBid');
    expect(MODE_COACH).not.toHaveProperty('sealedBid');
    expect(isGameplayPath('/en/sealed-bid')).toBe(false);
    expect(getModePresentation('sealed-bid').mode).toBe('random');
  });

  it('has no route or feature directories', () => {
    expect(existsSync(resolve(root, 'app/[locale]/sealed-bid'))).toBe(false);
    expect(existsSync(resolve(root, 'lib/sealedBid'))).toBe(false);
    expect(existsSync(resolve(root, 'components/sealedBid'))).toBe(false);
  });
});
