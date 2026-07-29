/**
 * Boss Battle Configuration
 *
 * Complete configuration for all 10 boss characters in Adventure Mode.
 * Each boss has a unique personality, twist mechanic, and dialogue.
 * Translation keys reference entries in translations/*.js files.
 */

import type { BossConfig, BossImageSet, BossPhaseConfig, BossTaunts, BossTauntEvent, BossTwistMechanic } from '@/types/boss';

// ==============================================
// TAUNT BUILDER
// ==============================================

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

// ==============================================
// PHASE BUILDER
// ==============================================

/**
 * Build standard 3-phase config. HP thresholds: 100 → 66 → 33
 */
function buildPhases(
  bossId: string,
  phaseNames: [string, string, string],
  modifiers: [BossPhaseConfig['mechanicModifiers'], BossPhaseConfig['mechanicModifiers'], BossPhaseConfig['mechanicModifiers']]
): BossPhaseConfig[] {
  const prefix = `adventure.bosses.${bossId}.phases`;
  return [
    { nameKey: `${prefix}.${phaseNames[0]}`, hpThreshold: 100, mechanicModifiers: modifiers[0], transitionTaunt: 'onStart' },
    { nameKey: `${prefix}.${phaseNames[1]}`, hpThreshold: 66, mechanicModifiers: modifiers[1], transitionTaunt: 'onMechanic', entryAbility: 'phase2Entry' },
    { nameKey: `${prefix}.${phaseNames[2]}`, hpThreshold: 33, mechanicModifiers: modifiers[2], transitionTaunt: 'onLowTime', entryAbility: 'enragedEntry' },
  ];
}

// ==============================================
// BOSS BUILDER
// ==============================================

function buildImages(imageSlug: string): BossImageSet {
  const base = `/images/bosses/boss-${imageSlug}`;
  return {
    idle: `${base}.png`,
    attack: `${base}-attack.png`,
    hurt: `${base}-hurt.png`,
    enraged: `${base}-enraged.png`,
    defeated: `${base}-defeated.png`,
  };
}

function defineBoss(
  worldId: number,
  id: string,
  personality: string,
  visualTheme: string,
  imageSlug: string,
  twistMechanic: BossTwistMechanic,
  phases: BossPhaseConfig[]
): BossConfig {
  const images = buildImages(imageSlug);
  return {
    id,
    worldId,
    displayName: `adventure.bosses.${id}.name`,
    personality,
    visualTheme,
    imagePath: images.idle, // backwards compat — use images.X for state-specific
    images,
    storylineIntro: `adventure.bosses.${id}.storyline`,
    twistMechanic: {
      ...twistMechanic,
      description: `adventure.bosses.${id}.mechanic`,
    },
    taunts: buildTaunts(id),
    phases,
  };
}

// ==============================================
// BOSS HP — gentler curve accounting for ceil(score/3) damage
// ==============================================

export const BOSS_HP: Record<number, number> = {
  1: 150, 2: 250, 3: 375, 4: 500, 5: 650,
  6: 825, 7: 1000, 8: 1200, 9: 1400, 10: 1750,
};

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
    { type: 'popQuiz', description: '', params: { requirementTypes: ['doubleLetters', 'startsWith', 'exactLength', 'containsVowel'], requirementDuration: 20, bonusMultiplier: 1.5, penaltyMultiplier: 0.8 } },
    buildPhases('msGrammar', ['lecture', 'popTest', 'finalExam'], [
      { speedMultiplier: 1, bonusMultiplier: 1.5 },
      { speedMultiplier: 1.5, bonusMultiplier: 2.0, mechanicOverride: { requirementDuration: 12 } },
      { speedMultiplier: 1.6, bonusMultiplier: 2.5, gridEffect: 'combined-quiz', bossDamageMultiplier: 1.5 },
    ])
  ),

  2: defineBoss(2, 'spellingBee',
    'A giant queen bee who runs a honey empire. Annoyed people expect her to spell.',
    'hive-queen', 'spelling-bee',
    { type: 'hiveMind', description: '', params: { stickyTileCount: 3, synonymBonusMultiplier: 2.0, workerBeeBlockDuration: 5 } },
    buildPhases('spellingBee', ['buzz', 'swarm', 'sting'], [
      { speedMultiplier: 1 },
      { speedMultiplier: 1.3, extraTileCount: 3, gridEffect: 'sticky-multiply' },
      { speedMultiplier: 1.8, extraTileCount: 5, bossDamageMultiplier: 1.5, gridEffect: 'all-sticky' },
    ])
  ),

  3: defineBoss(3, 'professorThesaurus',
    'Ancient tortoise academic who forgot more words than most will learn. Speaks in synonyms.',
    'tweed-scholar', 'professor-thesaurus',
    { type: 'etymologyDig', description: '', params: { rootFragments: ['bio', 'graph', 'tele', 'phon', 'log', 'morph'], rootComboMultiplier: 1.8, burialInterval: 15, commonLettersToBury: ['E', 'T', 'A'] } },
    buildPhases('professorThesaurus', ['dig', 'excavate', 'unearthed'], [
      { speedMultiplier: 1, bonusMultiplier: 1.8 },
      { speedMultiplier: 1.4, gridEffect: 'cave-in-hide', mechanicOverride: { burialInterval: 10 } },
      { speedMultiplier: 1.8, gridEffect: 'tile-shift', bossDamageMultiplier: 1.5 },
    ])
  ),

  4: defineBoss(4, 'captainMetaphor',
    'Theatrical pirate who ONLY speaks in idioms. Genuinely confused why this confuses people.',
    'pirate-parrot', 'captain-metaphor',
    { type: 'idiomBattle', description: '', params: { idiomChallengeInterval: 25, wordsPerIdiom: 3, anchorTileLockDuration: 10, idiomBonusMultiplier: 2.5 } },
    buildPhases('captainMetaphor', ['setSail', 'broadside', 'maelstrom'], [
      { speedMultiplier: 1, bonusMultiplier: 2.5 },
      { speedMultiplier: 1.3, extraTileCount: 2, gridEffect: 'anchor-cannon' },
      { speedMultiplier: 1.8, gridEffect: 'board-rotate', bossDamageMultiplier: 2.0 },
    ])
  ),

  5: defineBoss(5, 'baronBuildaword',
    'Steampunk inventor obsessed with word efficiency. Baffled that everything is not a compound word.',
    'steampunk-weasel', 'baron-buildaword',
    { type: 'assemblyLine', description: '', params: { conveyorSpeed: 3, compoundBonusMultiplier: 3.0, machineInterval: 20 } },
    buildPhases('baronBuildaword', ['assembly', 'overdrive', 'meltdown'], [
      { speedMultiplier: 1, bonusMultiplier: 3.0 },
      { speedMultiplier: 1.5, mechanicOverride: { conveyorSpeed: 5 }, gridEffect: 'hazard-tiles' },
      { speedMultiplier: 2.0, gridEffect: 'tile-decay', bossDamageMultiplier: 1.8 },
    ])
  ),

  6: defineBoss(6, 'puzzleMaster',
    'Enigmatic cat in a domino mask who speaks in riddles. Finds straightforward communication offensive.',
    'mystery-cat', 'puzzle-master',
    { type: 'scrambledReality', description: '', params: { scrambleInterval: 10, anagramBonusMultiplier: 2.0, riddleTileCount: 2 } },
    buildPhases('puzzleMaster', ['shuffle', 'labyrinth', 'chaos'], [
      { speedMultiplier: 1, bonusMultiplier: 2.0 },
      { speedMultiplier: 1.4, gridEffect: 'maze-paths', mechanicOverride: { scrambleInterval: 7 } },
      { speedMultiplier: 2.0, gridEffect: 'continuous-scramble', extraTileCount: 3, bossDamageMultiplier: 1.5 },
    ])
  ),

  7: defineBoss(7, 'reflectionKing',
    'Dramatic ice monarch who believes he is the protagonist. Incredibly vain but not evil.',
    'crystal-peacock', 'reflection-king',
    { type: 'mirrorMatch', description: '', params: { mirrorAxis: 'vertical', iceCrackThreshold: 2, palindromeBonusMultiplier: 3.0 } },
    buildPhases('reflectionKing', ['mirror', 'shatter', 'kaleidoscope'], [
      { speedMultiplier: 1, bonusMultiplier: 3.0 },
      { speedMultiplier: 1.3, gridEffect: 'mirror-crack-zones', mechanicOverride: { iceCrackThreshold: 1 } },
      { speedMultiplier: 1.8, gridEffect: 'grid-rotate-symmetric', bossDamageMultiplier: 1.8 },
    ])
  ),

  8: defineBoss(8, 'cosmicWordsmith',
    'Ancient space entity who invented several languages. Deeply disappointed mortals use words wrong.',
    'cosmic-jellyfish', 'cosmic-wordsmith',
    { type: 'stellarForge', description: '', params: { vowelCycleInterval: 8, supernovaLetters: ['Q', 'X', 'Z'], supernovaBonusMultiplier: 2.5, blackHoleDevourTime: 12 } },
    buildPhases('cosmicWordsmith', ['stellar', 'supernova', 'blackHole'], [
      { speedMultiplier: 1, bonusMultiplier: 2.5 },
      { speedMultiplier: 1.5, gridEffect: 'rare-letter-explosions', mechanicOverride: { vowelCycleInterval: 5 } },
      { speedMultiplier: 2.0, gridEffect: 'tile-absorption', bossDamageMultiplier: 2.0 },
    ])
  ),

  9: defineBoss(9, 'linguistSage',
    'Wise mountain goat who achieved enlightenment through ALL languages. Mixes them chaotically.',
    'mountain-goat', 'linguist-sage',
    { type: 'babelSummit', description: '', params: { languageSwitchInterval: 15, loanwordBonusMultiplier: 1.5, universalWordBonusMultiplier: 3.0 } },
    buildPhases('linguistSage', ['babel', 'tower', 'summit'], [
      { speedMultiplier: 1, bonusMultiplier: 1.5 },
      { speedMultiplier: 1.4, gridEffect: 'stacking-difficulty', mechanicOverride: { languageSwitchInterval: 10 } },
      { speedMultiplier: 2.0, gridEffect: 'all-languages-active', bossDamageMultiplier: 1.8 },
    ])
  ),

  10: defineBoss(10, 'lexiconDragon',
    'Ultimate word nerd transcended into dragon form. Anxious and overenthusiastic - wants to make friends!',
    'golden-dragon', 'lexicon-dragon',
    { type: 'finalWord', description: '', params: {
      phaseOrder: ['popQuiz', 'hiveMind', 'etymologyDig', 'idiomBattle', 'assemblyLine', 'scrambledReality', 'mirrorMatch', 'stellarForge', 'babelSummit'],
      phaseDuration: 15, lexiconStrikeThreshold: 5, dragonHoardGoldTileCount: 6, dragonHoardMinWordLength: 5,
    } },
    (() => {
      const prefix = 'adventure.bosses.lexiconDragon.phases';
      const mechanics: [string, string][] = [
        ['popQuiz', 'quiz'], ['hiveMind', 'swarm'], ['etymologyDig', 'roots'],
        ['idiomBattle', 'idioms'], ['assemblyLine', 'assembly'], ['scrambledReality', 'scramble'],
        ['mirrorMatch', 'mirror'], ['stellarForge', 'stellar'], ['babelSummit', 'babel'],
      ];
      return mechanics.map(([mechType, phaseName], i): BossPhaseConfig => ({
        nameKey: `${prefix}.${phaseName}`,
        hpThreshold: Math.round(100 - (i * (100 / 9))),
        mechanicModifiers: {
          speedMultiplier: 1 + (i * 0.15),
          bonusMultiplier: 2.0 + (i * 0.3),
          mechanicOverride: { activeMechanic: mechType },
          bossDamageMultiplier: 1 + (i * 0.1),
        },
        transitionTaunt: 'onMechanic',
        entryAbility: i === 0 ? undefined : 'dragonBreath',
      }));
    })()
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
 * Get the image path for a boss in a specific visual state
 *
 * @param worldId - World number (1-10)
 * @param state - Visual state (idle, attack, hurt, enraged, defeated)
 * @returns Image path or empty string if invalid world
 */
export function getBossImagePath(worldId: number, state: import('@/types/boss').BossVisualState = 'idle'): string {
  const boss = getBossConfig(worldId);
  if (!boss) return '';
  return boss.images[state];
}

/**
 * Get all boss configurations as an ordered array
 *
 * @returns Array of all boss configs ordered by worldId
 */
export function getAllBossConfigs(): BossConfig[] {
  return Object.values(BOSS_CONFIGS).sort((a, b) => a.worldId - b.worldId);
}
