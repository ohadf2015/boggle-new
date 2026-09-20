/**
 * Word Tower v2 empire progression sim — uses ONLY the real pure economy.
 *
 *   cd fe-next && npx --no-install tsx scripts/wordTowerEstateSim.ts > /tmp/wt2/sim.md
 *
 * Median player: 3 runs/day, a middling run each time (with a little seeded
 * spread), spends greedily on the cheapest affordable upgrade (repairs first),
 * spends each run's raid charge on a same-level rival (accuracy 0.5), and is
 * raided once a day (a shield blocks it).
 */
import {
  type Estate,
  type RunSummary,
  advanceDistrict,
  applyRaidToAttacker,
  applyRaidToDefender,
  applyRepair,
  applyRun,
  applyUpgrade,
  canUpgrade,
  chestSeed,
  districtComplete,
  emptyEstate,
  expectedChestCoins,
  perksFromEstate,
  raidOutcome,
  runCoins,
  runQuality,
  upgradeCost,
} from '../lib/wordTowerV2/estate';
import { MAX_PLOT_LEVEL, PLOT_SLOTS, buildingFor } from '../lib/wordTowerV2/estateCatalog';

const RUNS_PER_DAY = 3;
const DAYS = 30;
const REPORT_DAYS = [1, 3, 5, 7, 14, 30];
/** A rival's purse when raided: roughly one unspent run's worth. */
const RIVAL_PURSE = 250;
const MEDIAN: RunSummary = { floors: 12, perfects: 4, bestCombo: 3, crates: 2, heightM: 36 };

function runFor(n: number): RunSummary {
  // +-3 floors of spread, deterministic; better with practice (+1 floor/week).
  const floors = MEDIAN.floors + ((n * 5) % 7) - 3 + Math.floor(n / (RUNS_PER_DAY * 7));
  const perfects = Math.round(floors / 3);
  return { floors, perfects, bestCombo: Math.min(perfects, 3), crates: 2, heightM: floors * 3 };
}

function spend(e: Estate): { estate: Estate; bought: number } {
  let bought = 0;
  for (;;) {
    const damaged = e.plots.find((p) => p.damaged);
    if (damaged) {
      const r = applyRepair(e, damaged.slot);
      if (!r.ok) break;
      e = r.estate;
      continue;
    }
    const options = PLOT_SLOTS.map((slot) => ({ slot, check: canUpgrade(e, slot) }))
      .filter((o) => o.check.ok)
      .sort((a, b) => (a.check.ok && b.check.ok ? a.check.cost - b.check.cost : 0));
    if (!options.length) break;
    const r = applyUpgrade(e, options[0].slot);
    if (!r.ok) break;
    e = r.estate;
    bought += 1;
    if (districtComplete(e)) e = advanceDistrict(e);
  }
  return { estate: e, bought };
}

function nextAffordable(e: Estate): string {
  const opts = PLOT_SLOTS.map((slot) => {
    const p = e.plots.find((x) => x.slot === slot)!;
    return p.level >= MAX_PLOT_LEVEL ? null : { slot, cost: upgradeCost(e.district, slot, p.level), level: p.level };
  }).filter((x): x is { slot: (typeof PLOT_SLOTS)[number]; cost: number; level: number } => !!x);
  if (!opts.length) return '-';
  const o = opts.sort((a, b) => a.cost - b.cost)[0];
  return `${buildingFor(e.district, o.slot).id} L${o.level + 1} @ ${o.cost}`;
}

function main() {
  let e = emptyEstate();
  let earned = 0;
  let upgrades = 0;
  let firstUpgradeRun = 0;
  let d1DoneDay = 0;
  const rows: string[] = [];
  let runNo = 0;
  for (let day = 1; day <= DAYS; day += 1) {
    for (let r = 0; r < RUNS_PER_DAY; r += 1) {
      runNo += 1;
      const res = applyRun(e, runFor(runNo), chestSeed('sim-player', e.runs));
      earned += res.coins + res.chest.coins;
      e = res.estate;
      // Spend the raid charge on a rival at our own level.
      const out = raidOutcome({ attackerAccuracy: 0.5, defender: { ...e, shields: 0, coins: Math.round(RIVAL_PURSE * 1.35 ** (e.district - 1)) }, revenge: false });
      earned += out.attackerCoins;
      e = applyRaidToAttacker(e, out);
      const s = spend(e);
      e = s.estate;
      upgrades += s.bought;
      if (!firstUpgradeRun && upgrades > 0) firstUpgradeRun = runNo;
    }
    if (!d1DoneDay && e.district > 1) d1DoneDay = day;
    // Raided once a day by an average attacker.
    e = applyRaidToDefender(e, raidOutcome({ attackerAccuracy: 0.5, defender: e, revenge: false }));
    if (REPORT_DAYS.includes(day)) {
      const p = perksFromEstate(e);
      const levels = e.plots.map((pl) => `${pl.level}${pl.damaged ? '*' : ''}`).join('/');
      rows.push(
        `| ${day} | ${e.runs} | ${earned} | ${e.coins} | ${e.district} | ${levels} | ${upgrades} | ${e.shields} | ` +
          `x${p.coinMult} coin, x${p.swingPeriodMult} swing, x${p.perfectWindowMult} perfect, x${p.baseWidthMult} base, x${p.swayMult} sway, x${p.scoreMult} score | ${nextAffordable(e)} |`,
      );
    }
  }

  let d1 = 0;
  for (const slot of PLOT_SLOTS) for (let l = 0; l < MAX_PLOT_LEVEL; l += 1) d1 += upgradeCost(1, slot, l);
  const perRun = runCoins(MEDIAN) + expectedChestCoins(runQuality(MEDIAN));

  console.log('# Word Tower v2 empire — progression sim\n');
  console.log(`Median run ${JSON.stringify(MEDIAN)} pays **${runCoins(MEDIAN)}** coins + chest EV **${Math.round(expectedChestCoins(runQuality(MEDIAN)))}** (quality ${runQuality(MEDIAN).toFixed(2)}).`);
  console.log(`District 1 total cost **${d1}** = **${(d1 / perRun).toFixed(1)} median runs** before raids/vault (${(d1 / perRun / RUNS_PER_DAY).toFixed(1)} days at 3/day).`);
  console.log(`Cheapest first upgrade: ${Math.min(...PLOT_SLOTS.map((s) => upgradeCost(1, s, 0)))} coins. First upgrade bought after run ${firstUpgradeRun}.\n`);
  console.log('Scenario: 3 runs/day, greedy cheapest-upgrade spender, 1 raid sent per run (acc 0.5), raided once/day. `*` = damaged plot.\n');
  console.log('| day | runs | coins earned | coins held | district | plots (F/C/V/I/L) | upgrades | shields | perks | next cheapest |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(r);
  console.log(`\nDistrict 1 completed on day **${d1DoneDay}** in this scenario.`);
}

main();
