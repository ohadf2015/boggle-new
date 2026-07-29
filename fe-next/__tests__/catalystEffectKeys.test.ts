import { en } from '../translations/en';
import { he } from '../translations/he';
import { sv } from '../translations/sv';
import { ja } from '../translations/ja';
import { es } from '../translations/es';

const locales = { en, he, sv, ja, es };

describe('catalyst effect-description keys (catalyst unification)', () => {
  for (const [name, dict] of Object.entries(locales)) {
    it(`${name} has earthquake.effect and roundEvent.{blizzard,lightning,meteor}Effect`, () => {
      expect(typeof (dict as any).earthquake?.effect).toBe('string');
      expect((dict as any).earthquake.effect.length).toBeGreaterThan(0);
      expect(typeof (dict as any).roundEvent?.blizzardEffect).toBe('string');
      expect(typeof (dict as any).roundEvent?.lightningEffect).toBe('string');
      expect(typeof (dict as any).roundEvent?.meteorEffect).toBe('string');
    });
  }
});
