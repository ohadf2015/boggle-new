import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(__dirname, '..', 'HuntWordStage.module.css'), 'utf8');

function px(selector: string, prop: string): number {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`(?:^|\\n)${esc}\\s*\\{([^}]*)\\}`));
  if (!block) throw new Error(`no rule for ${selector}`);
  const value = block[1].match(new RegExp(`(?:^|[;\\s])${prop}:\\s*(\\d+)px`));
  if (!value) throw new Error(`no ${prop} in ${selector}`);
  return Number(value[1]);
}

const PILL_SHADOW = 5;
const CHIP_HEIGHT = 34;
const TRAY_LIP = 8;

describe.each([
  ['phone', '.stage', '.pill', '.reward'],
  ["desktop", ".stage[data-size='desktop']", ".stage[data-size='desktop'] .pill", ".stage[data-size='desktop'] .reward"],
])('word stage geometry (%s)', (_name, stageSel, pillSel, rewardSel) => {
  const height = px(stageSel, 'height');
  const padTop = px('.stage', 'padding-top');
  const pillHeight = px(pillSel, 'min-height');
  const rewardTop = px(rewardSel, 'top');
  const pillBottom = padTop + pillHeight + PILL_SHADOW;

  it('Given a good verdict, When the reward chips slam in, Then they never cover the word pill', () => {
    expect(rewardTop).toBeGreaterThanOrEqual(pillBottom);
    expect(css).toMatch(/@keyframes pointsSlam\s*\{\s*0%\s*\{\s*transform:\s*translateY\(\d+px\)/);
  });

  it('Given a good verdict, When the reward chips land, Then they stay inside the stage instead of covering the top row of tiles', () => {
    expect(rewardTop + CHIP_HEIGHT).toBeLessThanOrEqual(height + TRAY_LIP);
  });
});
