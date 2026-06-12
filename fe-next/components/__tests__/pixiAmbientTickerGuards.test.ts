import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Ambient Pixi ticker guards
 *
 * These decorative Pixi overlays run a ticker that recycles particles forever.
 * Without guards they animate at 60fps for the whole session — even after the
 * component is torn down (touching destroyed sprites → crashes) and while the
 * tab is hidden (pure wasted CPU/battery on an invisible canvas).
 *
 * Contract: each ambient ticker must early-return on (a) its teardown flag and
 * (b) document.hidden. Source-contract test — these tickers are imperative Pixi
 * loops not worth driving through a full WebGL render harness.
 */
const FILES = [
  {
    name: 'BlastSparksCanvas',
    path: '../blast/legacy/BlastSparksCanvas.tsx',
    teardownFlag: /if \(destroyed\) return/,
  },
  {
    name: 'EmberOverlay',
    path: '../word-vault/pixi/EmberOverlay.tsx',
    teardownFlag: /if \(state\.destroyed\) return/,
  },
];

describe('ambient Pixi ticker guards', () => {
  for (const f of FILES) {
    const source = readFileSync(resolve(__dirname, f.path), 'utf8');
    const tickerStart = source.indexOf('ticker.add(');
    const tickerBody = source.slice(tickerStart, tickerStart + 600);

    it(`${f.name}: ticker early-returns after teardown`, () => {
      expect(tickerBody).toMatch(f.teardownFlag);
    });

    it(`${f.name}: ticker skips work while the tab is hidden`, () => {
      expect(tickerBody).toMatch(/document\.hidden/);
    });
  }
});
