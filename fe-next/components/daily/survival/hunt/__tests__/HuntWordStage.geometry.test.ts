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
  ['phone', '.field', '.pill', '.reward'],
  ["desktop", ".field[data-size='desktop']", ".stage[data-size='desktop'] .pill", ".stage[data-size='desktop'] .reward"],
])('word stage geometry (%s)', (_name, fieldSel, pillSel, rewardSel) => {
  const height = px(fieldSel, '--hunt-stage-h');
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

describe('long-word badge on a phone', () => {
  const height = px('.field', '--hunt-stage-h');
  const padTop = px('.stage', 'padding-top');
  const pillHeight = px('.pill', 'min-height');
  const long = css.match(/(?:^|\n)\.long\s*\{([^}]*)\}/)![1];
  const gapBelowPill = Number(long.match(/top:\s*calc\(100% \+ (\d+)px\)/)?.[1] ?? NaN);
  const BADGE_HEIGHT = 21;
  const BADGE_SHADOW = 2;
  const ROTATION_SLACK = 3;

  it('Given a 5+ letter word mid-drag, Then the badge rides in the lane under the pill, not above the stage where the life bar sits', () => {
    expect(gapBelowPill).toBeGreaterThanOrEqual(ROTATION_SLACK + 2);
  });

  it('Then the badge ends inside the stage, clear of the top row of tiles', () => {
    expect(padTop + pillHeight + gapBelowPill + BADGE_HEIGHT + BADGE_SHADOW).toBeLessThanOrEqual(height);
  });
});
