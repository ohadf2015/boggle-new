import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_DISTRICT, MAX_PLOT_LEVEL, PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';
import { emptyEstate, perksFromEstate } from '@/lib/wordTowerV2/estate';
import { ART_SETS, DAMAGE_OVERLAY, backdropFor, buildingSprite, nextPerkLine, perkChips, plotStage, whatsNew } from '../estateArt';

const PUBLIC = join(process.cwd(), 'public');
const onDisk = (url: string) => existsSync(join(PUBLIC, url));

describe('estateArt', () => {
  it('given every district and slot, when a sprite is asked for, then the file exists on disk', () => {
    for (let d = 1; d <= MAX_DISTRICT; d += 1) {
      for (const slot of PLOT_SLOTS) {
        for (let level = 0; level <= MAX_PLOT_LEVEL; level += 1) {
          const url = buildingSprite(d, slot, level);
          expect(onDisk(url), `${d}/${slot}/${level} -> ${url}`).toBe(true);
        }
      }
      expect(onDisk(backdropFor(d)), backdropFor(d)).toBe(true);
    }
    expect(onDisk(DAMAGE_OVERLAY)).toBe(true);
  });

  it('given a district, when its art set is picked, then the five plots wear five distinct buildings', () => {
    for (let d = 1; d <= MAX_DISTRICT; d += 1) {
      const ids = PLOT_SLOTS.map((slot) => buildingSprite(d, slot, 4));
      expect(new Set(ids).size).toBe(PLOT_SLOTS.length);
    }
    expect(ART_SETS.length).toBe(3);
  });

  it('given a plot level, when the stage is resolved, then it climbs lot -> scaffold -> complete -> landmark', () => {
    expect([0, 1].map(plotStage)).toEqual(['l0', 'l0']);
    expect([2, 3].map(plotStage)).toEqual(['l2', 'l2']);
    expect(plotStage(4)).toBe('l4');
    expect(plotStage(5)).toBe('l5');
  });

  it('given a plot about to be upgraded, when the perk line is read, then it names the real delta', () => {
    const line = nextPerkLine(1, 'foundation', 2);
    expect(line.key).toBe('wordTowerV2.estate.perkLine.foundation');
    // Foundation level 3 is 7.5% less sway than level 0; the line quotes the total.
    expect(line.params.n).toBe(8);
    expect(nextPerkLine(1, 'insurance', 3).params.n).toBe(1);
    expect(nextPerkLine(1, 'vault', 0).params.n).toBe(4);
  });

  it('given a maxed plot, when the perk line is read, then it reports the level it already holds', () => {
    const line = nextPerkLine(1, 'landmark', 5);
    expect(line.params.n).toBe(15);
  });

  it('given a fresh estate, when perk chips are built, then there are none to show', () => {
    expect(perkChips(perksFromEstate(emptyEstate()))).toEqual([]);
  });

  it('given upgraded plots, when perk chips are built, then each changed perk becomes one chip', () => {
    const estate = { ...emptyEstate(), plots: PLOT_SLOTS.map((slot) => ({ slot, level: 4, damaged: false })) };
    const chips = perkChips(perksFromEstate(estate));
    expect(chips.map((c) => c.id)).toEqual(['foundation', 'craneYard', 'vault', 'insurance', 'landmark']);
    expect(chips[0]).toMatchObject({ key: 'wordTowerV2.estate.chip.foundation' });
    expect(chips.every((c) => c.params.n > 0)).toBe(true);
  });

  it('given coins and damage, when the what-is-new state is read, then it lists affordable and broken plots', () => {
    const estate = { ...emptyEstate(), coins: 70, plots: PLOT_SLOTS.map((slot, i) => ({ slot, level: 0, damaged: i === 1 })) };
    const news = whatsNew(estate, 2);
    expect(news.affordable).toEqual(['foundation']);
    expect(news.damaged).toEqual(['craneYard']);
    expect(news.raids).toBe(2);
    expect(news.hasNews).toBe(true);
    expect(whatsNew(emptyEstate(), 0).hasNews).toBe(false);
  });
});
