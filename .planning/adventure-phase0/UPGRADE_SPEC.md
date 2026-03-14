# Word Forge — Upgrade System Spec

> Inspired by Gold Miner / Motherload progression loops

## Schema
- DB: `upgrades JSONB DEFAULT '{}'` on `player_progression`
- Type: `Record<string, number>` — upgrade ID → tier level
- Config: `lib/adventure/upgradeConfig.ts`

## Categories

### ⛏️ Excavation (Grid & Word Finding)
| ID | Tiers | Unlock | Total Cost |
|---|---|---|---|
| wordRadar | 5 | World 1 | 1,230 |
| deepDrill | 4 | World 3 | 1,060 |
| gemDetector | 3 | World 3 | 800 |

### 🛡️ Survival (Timer & Boss)
| ID | Tiers | Unlock | Total Cost |
|---|---|---|---|
| fuelTank | 4 | World 1 | 750 |
| armorPlating | 4 | World 3 | 1,040 |
| blastShield | 3 | World 5 | 820 |

### 💰 Fortune (Gold & Rewards)
| ID | Tiers | Unlock | Total Cost |
|---|---|---|---|
| luckyPickaxe | 4 | World 1 | 690 |
| cargoBay | 3 | World 3 | 690 |
| salvageClaw | 3 | World 3 | 600 |

### 🔮 Mastery (Active Abilities)
| ID | Tiers | Unlock | Total Cost |
|---|---|---|---|
| wordDynamite | 3 | World 5 | 950 |
| timeFreeze | 2 | World 5 | 650 |

## Economy
- Total upgrade cost: ~8,580g
- Total earnable (completionist): ~5,600g
- Ratio: 153% → forces choices, incentivizes replay
- Fortune upgrades ROI: buying luckyPickaxe early increases earnings

## Icons
- 11 PNG files in `public/images/upgrades/`
- 256×256, transparent backgrounds, neo-brutalist style

## Implementation Status
- [x] `upgradeConfig.ts` — full catalog + helpers
- [x] `UpgradeShop.tsx` — rewritten with categories, icons, tier pips
- [x] DB migration — `20260314000000_add_gold_upgrades.sql`
- [x] `PlayerProgression.upgrades` → `Record<string, number>`
- [x] All 11 icons generated and processed
- [ ] Wire upgrade effects into gameplay hooks
- [ ] i18n keys for all upgrades (4 languages)
- [ ] UpgradeShop integration tests
