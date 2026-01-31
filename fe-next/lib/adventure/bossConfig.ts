/**
 * Boss Battle Configuration
 *
 * Complete configuration for all 10 boss characters in Adventure Mode.
 * Each boss has a unique personality, twist mechanic, and dialogue.
 * Translation keys reference entries in translations/*.js files.
 */

import type { BossConfig, BossTaunts, BossTauntEvent, BossTwistMechanic } from '@/types/boss';

// ==============================================
// TAUNT BUILDER
// ==============================================

/**
 * Build the taunts object from a boss ID.
 * All bosses follow the same translation key pattern:
 *   adventure.bosses.{bossId}.taunts.{event}{N}
 */
function buildTaunts(bossId: string): BossTaunts {
  const prefix = `adventure.bosses.${bossId}.taunts`;
  return {
    onStart: [`${prefix}.start1`, `${prefix}.start2`],
    onGoodWord: [`${prefix}.goodWord1`, `${prefix}.goodWord2`],
    onBadWord: [`${prefix}.badWord1`, `${prefix}.badWord2`],
    onMechanic: [`${prefix}.mechanic1`, `${prefix}.mechanic2`],
    onLowTime: [`${prefix}.lowTime1`],
    onVictory: `${prefix}.victory`,
    onDefeat: `${prefix}.defeat`,
  };
}

/**
 * Shorthand to build a full BossConfig.
 * Eliminates repetitive boilerplate across 10 boss definitions.
 */
function defineBoss(
  worldId: number,
  id: string,
  personality: string,
  visualTheme: string,
  imageSlug: string,
  twistMechanic: BossTwistMechanic
): BossConfig {
  return {
    id,
    worldId,
    displayName: `adventure.bosses.${id}.name`,
    personality,
    visualTheme,
    imagePath: `/images/bosses/boss-${imageSlug}.webp`,
    twistMechanic: {
      ...twistMechanic,
      description: `adventure.bosses.${id}.mechanic`,
    },
    taunts: buildTaunts(id),
  };
}

// ==============================================
// BOSS CONFIGURATIONS
// ==============================================

/**
 * Boss configurations indexed by world number (1-10)
 */
export const BOSS_CONFIGS: Record<number, BossConfig> = {
  1: defineBoss(1, 'msGrammar',
    'A prim owl schoolteacher who treats every game as a pop quiz. Secretly roots for players.',
    'school-owl', 'ms-grammar',
    {
      type: 'popQuiz',
      description: '',
      params: {
        requirementTypes: ['doubleLetters', 'startsWith', 'exactLength', 'containsVowel'],
        requirementDuration: 20,
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.8,
      },
    }
  ),

  2: defineBoss(2, 'spellingBee',
    'A giant queen bee who runs a honey empire. Annoyed people expect her to spell.',
    'hive-queen', 'spelling-bee',
    {
      type: 'hiveMind',
      description: '',
      params: {
        stickyTileCount: 3,
        synonymBonusMultiplier: 2.0,
        workerBeeBlockDuration: 5,
      },
    }
  ),

  3: defineBoss(3, 'professorThesaurus',
    'Ancient tortoise academic who forgot more words than most will learn. Speaks in synonyms.',
    'tweed-scholar', 'professor-thesaurus',
    {
      type: 'etymologyDig',
      description: '',
      params: {
        rootFragments: ['bio', 'graph', 'tele', 'phon', 'log', 'morph'],
        rootComboMultiplier: 1.8,
        burialInterval: 15,
        commonLettersToBury: ['E', 'T', 'A'],
      },
    }
  ),

  4: defineBoss(4, 'captainMetaphor',
    'Theatrical pirate who ONLY speaks in idioms. Genuinely confused why this confuses people.',
    'pirate-parrot', 'captain-metaphor',
    {
      type: 'idiomBattle',
      description: '',
      params: {
        idiomChallengeInterval: 25,
        wordsPerIdiom: 3,
        anchorTileLockDuration: 10,
        idiomBonusMultiplier: 2.5,
      },
    }
  ),

  5: defineBoss(5, 'baronBuildaword',
    'Steampunk inventor obsessed with word efficiency. Baffled that everything is not a compound word.',
    'steampunk-weasel', 'baron-buildaword',
    {
      type: 'assemblyLine',
      description: '',
      params: {
        conveyorSpeed: 3,
        compoundBonusMultiplier: 3.0,
        machineInterval: 20,
      },
    }
  ),

  6: defineBoss(6, 'puzzleMaster',
    'Enigmatic cat in a domino mask who speaks in riddles. Finds straightforward communication offensive.',
    'mystery-cat', 'puzzle-master',
    {
      type: 'scrambledReality',
      description: '',
      params: {
        scrambleInterval: 10,
        anagramBonusMultiplier: 2.0,
        riddleTileCount: 2,
      },
    }
  ),

  7: defineBoss(7, 'reflectionKing',
    'Dramatic ice monarch who believes he is the protagonist. Incredibly vain but not evil.',
    'crystal-peacock', 'reflection-king',
    {
      type: 'mirrorMatch',
      description: '',
      params: {
        mirrorAxis: 'vertical',
        iceCrackThreshold: 2,
        palindromeBonusMultiplier: 3.0,
      },
    }
  ),

  8: defineBoss(8, 'cosmicWordsmith',
    'Ancient space entity who invented several languages. Deeply disappointed mortals use words wrong.',
    'cosmic-jellyfish', 'cosmic-wordsmith',
    {
      type: 'stellarForge',
      description: '',
      params: {
        vowelCycleInterval: 8,
        supernovaLetters: ['Q', 'X', 'Z'],
        supernovaBonusMultiplier: 2.5,
        blackHoleDevourTime: 12,
      },
    }
  ),

  9: defineBoss(9, 'linguistSage',
    'Wise mountain goat who achieved enlightenment through ALL languages. Mixes them chaotically.',
    'mountain-goat', 'linguist-sage',
    {
      type: 'babelSummit',
      description: '',
      params: {
        languageSwitchInterval: 15,
        loanwordBonusMultiplier: 1.5,
        universalWordBonusMultiplier: 3.0,
      },
    }
  ),

  10: defineBoss(10, 'lexiconDragon',
    'Ultimate word nerd transcended into dragon form. Anxious and overenthusiastic - wants to make friends!',
    'golden-dragon', 'lexicon-dragon',
    {
      type: 'finalWord',
      description: '',
      params: {
        phaseOrder: [
          'popQuiz', 'hiveMind', 'etymologyDig', 'idiomBattle',
          'assemblyLine', 'scrambledReality', 'mirrorMatch',
          'stellarForge', 'babelSummit',
        ],
        phaseDuration: 15,
        lexiconStrikeThreshold: 5,
        dragonHoardGoldTileCount: 6,
        dragonHoardMinWordLength: 5,
      },
    }
  ),
};

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Get boss configuration for a specific world
 *
 * @param worldId - World number (1-10)
 * @returns Boss configuration or null if invalid world
 */
export function getBossConfig(worldId: number): BossConfig | null {
  return BOSS_CONFIGS[worldId] ?? null;
}

/**
 * Get a random taunt for a specific boss event
 *
 * @param worldId - World number (1-10)
 * @param event - Taunt event type
 * @returns Translation key for the taunt, or empty string if invalid
 */
export function getBossTaunt(worldId: number, event: BossTauntEvent): string {
  const boss = getBossConfig(worldId);
  if (!boss) return '';

  const tauntValue = boss.taunts[event];

  if (Array.isArray(tauntValue)) {
    const index = Math.floor(Math.random() * tauntValue.length);
    return tauntValue[index];
  }

  return tauntValue;
}

/**
 * Get the image path for a boss
 *
 * @param worldId - World number (1-10)
 * @returns Image path or empty string if invalid world
 */
export function getBossImagePath(worldId: number): string {
  const boss = getBossConfig(worldId);
  return boss?.imagePath ?? '';
}

/**
 * Get all boss configurations as an ordered array
 *
 * @returns Array of all boss configs ordered by worldId
 */
export function getAllBossConfigs(): BossConfig[] {
  return Object.values(BOSS_CONFIGS).sort((a, b) => a.worldId - b.worldId);
}
