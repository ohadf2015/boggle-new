# Phase 31: Skill Tree & Progression Depth - Research

**Researched:** 2026-01-31
**Domain:** Skill Tree Systems / Meta-Progression / Achievement Systems
**Confidence:** HIGH

## Summary

Phase 31 extends the meta-progression foundation (Phase 26) with skill trees and achievements. The existing codebase provides 80% of required infrastructure:

1. **XP/Leveling**: `useAdventureXp` hook with `awardXp()` and `currentLevel` (Phase 26)
2. **Power-ups**: `usePowerUpState` hook with 3 power-ups - Freeze Time, Hint, Score Multiplier (Phase 28)
3. **Achievement Tiers**: `achievementTiers.ts` with Bronze/Silver/Gold/Platinum logic already implemented

**Primary recommendation:** Build skill tree state on Zustand with persist middleware, reuse existing achievement tier logic, wire skill unlocks to power-up slot expansion.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.0.10 | Skill tree state + persistence | Already in project for high-frequency state, persist middleware handles localStorage |
| Framer Motion | 12.23.24 | Skill unlock animations, modal transitions | Already in project, proven for celebration effects |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Immer | 10.1.1 | Nested skill state updates | Already installed, use for skill tree mutations |
| react-d3-tree | 3.6.2 | Skill tree visualization (if needed) | Alternative to custom SVG if complex branching required |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand persist | localStorage directly | Hand-rolling loses migration support, hydration handling |
| Framer Motion | CSS animations | Less control over celebration sequencing |
| Custom skill tree | beautiful-skill-tree (GPL-3.0) | Pre-built but harder to match neo-brutalist style |

**Installation:**
```bash
# All libraries already installed - no new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure

```
hooks/
├── useSkillTree.ts         # Main skill tree hook (Zustand store)
├── useSkillPoints.ts       # Skill point earning/spending
└── useAdventureAchievements.ts  # Adventure mode achievements (extends Phase 19)

utils/
├── skillTreeUtils.ts       # Skill definitions, prerequisites
├── skillEffects.ts         # Effect application functions
└── achievementTiers.ts     # EXISTING - reuse for adventure achievements

types/
└── adventure.ts            # Add SkillNode, SkillTree, AdventureAchievement types

components/adventure/
├── SkillTree/
│   ├── SkillTreeView.tsx       # Main visualization
│   ├── SkillNode.tsx           # Individual skill node
│   ├── SkillPath.tsx           # Path connections (Power/Strategy/Utility)
│   └── SkillUnlockModal.tsx    # Celebration on unlock
└── achievements/
    ├── AchievementUnlockModal.tsx  # Reuse pattern from Phase 19
    └── AchievementGrid.tsx         # Profile view
```

### Pattern 1: Zustand Persist with Set Serialization

**What:** Zustand persist middleware requires custom serialization for Set/Map types
**When to use:** Storing unlocked skills as Set<string>

**Example:**
```typescript
// Source: Context7 /websites/zustand_pmnd_rs
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SkillTreeState {
  unlockedSkills: Set<string>
  skillPoints: number
  unlockSkill: (skillId: string) => void
}

export const useSkillTreeStore = create<SkillTreeState>()(
  persist(
    (set) => ({
      unlockedSkills: new Set(),
      skillPoints: 0,
      unlockSkill: (skillId) => set((state) => ({
        unlockedSkills: new Set([...state.unlockedSkills, skillId]),
        skillPoints: state.skillPoints - 1
      })),
    }),
    {
      name: 'lexiclash-skill-tree',
      // CRITICAL: Custom serialization for Set
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const parsed = JSON.parse(str)
          return {
            ...parsed,
            state: {
              ...parsed.state,
              unlockedSkills: new Set(parsed.state.unlockedSkills || [])
            }
          }
        },
        setItem: (name, value) => {
          const serialized = {
            ...value,
            state: {
              ...value.state,
              unlockedSkills: [...value.state.unlockedSkills]
            }
          }
          localStorage.setItem(name, JSON.stringify(serialized))
        },
        removeItem: (name) => localStorage.removeItem(name)
      }
    }
  )
)
```

### Pattern 2: Skill Point Award on Level Up

**What:** Award skill points when player levels up (reuse existing useAdventureXp)
**When to use:** Integration with Phase 26 XP system

**Example:**
```typescript
// In AdventureGame.tsx - wire level up to skill points
const { currentLevel, awardXp } = useAdventureXp({ userId, initialXp })
const { addSkillPoints } = useSkillTreeStore()

const prevLevelRef = useRef(currentLevel)

useEffect(() => {
  if (currentLevel > prevLevelRef.current) {
    // Award 1 skill point per level
    const pointsEarned = currentLevel - prevLevelRef.current
    addSkillPoints(pointsEarned)
    prevLevelRef.current = currentLevel
  }
}, [currentLevel, addSkillPoints])
```

### Pattern 3: Horizontal vs Vertical Skill Design

**What:** 75% of skills enable new strategies (horizontal), 25% boost stats (vertical)
**When to use:** Defining skill catalog

**Example skill structure:**
```typescript
// GOOD: Horizontal progression (enables new strategies)
{
  id: 'chain_mastery',
  path: 'Strategy',
  tier: 2,
  effect: 'chain_tiles_last_longer', // New mechanic, not stat boost
  description: 'Chain tiles persist 3 seconds longer'
}

// OK: Vertical progression (stat boost, limit to 25% of skills)
{
  id: 'score_boost_1',
  path: 'Power',
  tier: 1,
  effect: 'score_multiplier_1_1', // 10% boost
  description: '+10% base score'
}
```

### Anti-Patterns to Avoid

- **Stat creep:** Don't make all skills +X% bonuses. Players get bored.
- **Mandatory paths:** Don't lock core gameplay behind skill tree. All levels beatable without skills.
- **Complex prerequisites:** Keep prerequisite chains short (max 2 levels deep).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LocalStorage persistence | Custom localStorage wrapper | Zustand persist middleware | Handles hydration, migration, SSR |
| Achievement tier calculation | Manual tier thresholds | `achievementTiers.ts` utilities | Already tested, includes all 4 tiers |
| Celebration animations | setTimeout chains | Framer Motion AnimatePresence | Handles exit animations cleanly |
| Skill tree graph layout | Manual positioning | SVG viewBox + transform | CSS Grid doesn't handle curved paths |

**Key insight:** The project already has achievement tier logic (`utils/achievementTiers.ts`) and modal celebration patterns (Phase 19). Reuse these rather than rebuilding.

## Common Pitfalls

### Pitfall 1: Set Serialization in Zustand Persist

**What goes wrong:** `unlockedSkills: new Set(['skill1', 'skill2'])` becomes `{}` after reload
**Why it happens:** JSON.stringify converts Set to empty object
**How to avoid:** Custom storage with Array serialization (see Pattern 1)
**Warning signs:** Skills disappear after page refresh

### Pitfall 2: Skill Point Race Condition

**What goes wrong:** Player spends points while level-up animation plays, gets extra points
**Why it happens:** Level-up triggers point award, but animation hasn't blocked UI
**How to avoid:** Disable skill tree interaction during level-up celebration
**Warning signs:** Point count doesn't match expected (1 point per level)

### Pitfall 3: Achievement Modal Queue

**What goes wrong:** Multiple achievements trigger simultaneously, modals stack awkwardly
**Why it happens:** Boss defeat + level up + combo achievement all fire at once
**How to avoid:** Queue achievements and show sequentially with 1s gap
**Warning signs:** Modal flicker or overlap

### Pitfall 4: Mobile Skill Tree Viewport

**What goes wrong:** Skill tree too wide for mobile, horizontal scroll breaks touch
**Why it happens:** Desktop-first design with fixed viewBox
**How to avoid:** Container queries for adaptive sizing, pan/zoom for mobile
**Warning signs:** Tree clips on iPhone SE viewport (375px)

## Code Examples

### Existing Achievement Tier Logic (Reuse)

```typescript
// Source: utils/achievementTiers.ts (already in codebase)
import { calculateTier, getTierProgress, getTierDisplay } from '@/utils/achievementTiers'

// Calculate tier from count
const tier = calculateTier(15) // Returns 'SILVER'

// Get progress to next tier
const progress = getTierProgress(15)
// { currentTier: 'SILVER', nextTier: 'GOLD', progress: 0, ... }

// Get display colors for neo-brutalist design
const display = getTierDisplay('GOLD')
// { name: 'GOLD', colors: { bg: '#FFD700', ... }, icon: '🥇' }
```

### Skill Unlock Modal Animation

```typescript
// Source: Context7 /websites/motion_dev
import { motion, AnimatePresence } from 'framer-motion'

function SkillUnlockModal({ skill, isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          layoutId={`skill-${skill.id}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', visualDuration: 0.3, bounce: 0.25 }}
          className="skill-unlock-modal"
        >
          <h2>{t('skill_unlocked')}</h2>
          <p>{skill.name}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Power-Up Slot Unlock via Skill

```typescript
// Skill effect that unlocks additional power-up slot
function applySkillEffect(skillId: string, state: GameState): GameState {
  switch (skillId) {
    case 'power_slot_2':
      return {
        ...state,
        maxPowerUpSlots: state.maxPowerUpSlots + 1
      }
    case 'advanced_hint':
      return {
        ...state,
        availablePowerUps: [...state.availablePowerUps, 'advanced_hint']
      }
    default:
      return state
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage raw | Zustand persist | 2024 | Migration support, SSR-safe |
| XP = bigger numbers | Horizontal progression | 2023 | 3x engagement per industry research |
| Single achievement list | Tiered achievements | Already in codebase | Motivation through visible progress |

**Deprecated/outdated:**
- beautiful-skill-tree: Last update 2022, may have React 19 compatibility issues
- Manual localStorage: No migration path, hydration race conditions

## Open Questions

1. **Skill point pacing:** 1 point per level = ~50 points by max level. Is this enough for 12+ skills across 3 tiers?
   - Recommendation: Start with 1 point/level, playtest at level 30 to verify tier 3 unlocks achievable

2. **Mobile skill tree UX:** Traditional skill trees are desktop-oriented
   - Recommendation: Research mobile RPG/idle game patterns (AFK Arena, Cookie Clicker)

3. **Achievement modal batching:** What if 3 achievements trigger at once?
   - Recommendation: Queue with 1s delay, show count badge "3 new achievements"

## Sources

### Primary (HIGH confidence)
- Context7 /websites/zustand_pmnd_rs - Persist middleware patterns
- Context7 /websites/motion_dev - AnimatePresence modal patterns
- `utils/achievementTiers.ts` - Existing tier calculation logic
- `hooks/useAdventureXp.ts` - Existing XP/level integration

### Secondary (MEDIUM confidence)
- [Keys to Meaningful Skill Trees - GDKeys](https://gdkeys.com/keys-to-meaningful-skill-trees/) - Industry best practices
- [Skill Tree Design: Ultimate Guide for Freemium Games](https://adriancrook.com/skill-tree-design-ultimate-guide-for-freemium-games/) - Balance recommendations

### Tertiary (LOW confidence)
- [Game Design Skill Trees (Beginners guide)](https://gamedesigning.org/learn/skill-trees/) - General principles
- [Skill Tree Design thesis](https://www.theseus.fi/bitstream/handle/10024/192256/Orava_Santeri.pdf) - Academic research

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zustand/Framer Motion already proven in project
- Architecture: HIGH - Extends existing patterns from Phase 26/28
- Pitfalls: MEDIUM - Based on general game dev patterns, not project-specific playtesting

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (stable stack, 30-day validity)
