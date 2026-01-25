/**
 * Boss Battle Configuration
 *
 * Complete configuration for all 10 boss characters in Adventure Mode.
 * Each boss has a unique personality, twist mechanic, and dialogue.
 * Translation keys reference entries in translations/*.js files.
 */

import type { BossConfig, BossTauntEvent } from '@/types/boss';

// ==============================================
// BOSS CONFIGURATIONS
// ==============================================

/**
 * Boss configurations indexed by world number (1-10)
 */
export const BOSS_CONFIGS: Record<number, BossConfig> = {
  1: {
    id: 'msGrammar',
    worldId: 1,
    displayName: 'adventure.bosses.msGrammar.name',
    personality:
      'A prim owl schoolteacher who treats every game as a pop quiz. Secretly roots for players.',
    visualTheme: 'school-owl',
    imagePath: '/images/adventure/bosses/ms-grammar.webp',
    twistMechanic: {
      type: 'popQuiz',
      description: 'adventure.bosses.msGrammar.mechanic',
      params: {
        requirementTypes: [
          'doubleLetters',
          'startsWith',
          'exactLength',
          'containsVowel',
        ],
        requirementDuration: 20,
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.8,
      },
    },
    taunts: {
      onStart: [
        'adventure.bosses.msGrammar.taunts.start1',
        'adventure.bosses.msGrammar.taunts.start2',
      ],
      onGoodWord: [
        'adventure.bosses.msGrammar.taunts.goodWord1',
        'adventure.bosses.msGrammar.taunts.goodWord2',
      ],
      onBadWord: [
        'adventure.bosses.msGrammar.taunts.badWord1',
        'adventure.bosses.msGrammar.taunts.badWord2',
      ],
      onMechanic: [
        'adventure.bosses.msGrammar.taunts.mechanic1',
        'adventure.bosses.msGrammar.taunts.mechanic2',
      ],
      onLowTime: [
        'adventure.bosses.msGrammar.taunts.lowTime1',
      ],
      onVictory: 'adventure.bosses.msGrammar.taunts.victory',
      onDefeat: 'adventure.bosses.msGrammar.taunts.defeat',
    },
  },

  2: {
    id: 'spellingBee',
    worldId: 2,
    displayName: 'adventure.bosses.spellingBee.name',
    personality:
      'A giant queen bee who runs a honey empire. Annoyed people expect her to spell.',
    visualTheme: 'hive-queen',
    imagePath: '/images/adventure/bosses/spelling-bee.webp',
    twistMechanic: {
      type: 'hiveMind',
      description: 'adventure.bosses.spellingBee.mechanic',
      params: {
        stickyTileCount: 3,
        synonymBonusMultiplier: 2.0,
        workerBeeBlockDuration: 5,
      },
    },
    taunts: {
      onStart: [
        'adventure.bosses.spellingBee.taunts.start1',
        'adventure.bosses.spellingBee.taunts.start2',
      ],
      onGoodWord: [
        'adventure.bosses.spellingBee.taunts.goodWord1',
        'adventure.bosses.spellingBee.taunts.goodWord2',
      ],
      onBadWord: [
        'adventure.bosses.spellingBee.taunts.badWord1',
        'adventure.bosses.spellingBee.taunts.badWord2',
      ],
      onMechanic: [
        'adventure.bosses.spellingBee.taunts.mechanic1',
        'adventure.bosses.spellingBee.taunts.mechanic2',
      ],
      onLowTime: [
        'adventure.bosses.spellingBee.taunts.lowTime1',
      ],
      onVictory: 'adventure.bosses.spellingBee.taunts.victory',
      onDefeat: 'adventure.bosses.spellingBee.taunts.defeat',
    },
  },

  3: {
    id: 'professorThesaurus',
    worldId: 3,
    displayName: 'adventure.bosses.professorThesaurus.name',
    personality:
      'Ancient tortoise academic who forgot more words than most will learn. Speaks in synonyms.',
    visualTheme: 'tweed-scholar',
    imagePath: '/images/adventure/bosses/professor-thesaurus.webp',
    twistMechanic: {
      type: 'etymologyDig',
      description: 'adventure.bosses.professorThesaurus.mechanic',
      params: {
        rootFragments: ['bio', 'graph', 'tele', 'phon', 'log', 'morph'],
        rootComboMultiplier: 1.8,
        burialInterval: 15,
        commonLettersToBury: ['E', 'T', 'A'],
      },
    },
    taunts: {
      onStart: [
        'adventure.bosses.professorThesaurus.taunts.start1',
        'adventure.bosses.professorThesaurus.taunts.start2',
      ],
      onGoodWord: [
        'adventure.bosses.professorThesaurus.taunts.goodWord1',
        'adventure.bosses.professorThesaurus.taunts.goodWord2',
      ],
      onBadWord: [
        'adventure.bosses.professorThesaurus.taunts.badWord1',
        'adventure.bosses.professorThesaurus.taunts.badWord2',
      ],
      onMechanic: [
        'adventure.bosses.professorThesaurus.taunts.mechanic1',
        'adventure.bosses.professorThesaurus.taunts.mechanic2',
      ],
      onLowTime: [
        'adventure.bosses.professorThesaurus.taunts.lowTime1',
      ],
      onVictory: 'adventure.bosses.professorThesaurus.taunts.victory',
      onDefeat: 'adventure.bosses.professorThesaurus.taunts.defeat',
    },
  },

  4: {
    id: 'captainMetaphor',
    worldId: 4,
    displayName: 'adventure.bosses.captainMetaphor.name',
    personality:
      'Theatrical pirate who ONLY speaks in idioms. Genuinely confused why this confuses people.',
    visualTheme: 'pirate-parrot',
    imagePath: '/images/adventure/bosses/captain-metaphor.webp',
    twistMechanic: {
      type: 'idiomBattle',
      description: 'adventure.bosses.captainMetaphor.mechanic',
      params: {
        idiomChallengeInterval: 25,
        wordsPerIdiom: 3,
        anchorTileLockDuration: 10,
        idiomBonusMultiplier: 2.5,
      },
    },
    taunts: {
      onStart: [
        'adventure.bosses.captainMetaphor.taunts.start1',
        'adventure.bosses.captainMetaphor.taunts.start2',
      ],
      onGoodWord: [
        'adventure.bosses.captainMetaphor.taunts.goodWord1',
        'adventure.bosses.captainMetaphor.taunts.goodWord2',
      ],
      onBadWord: [
        'adventure.bosses.captainMetaphor.taunts.badWord1',
        'adventure.bosses.captainMetaphor.taunts.badWord2',
      ],
      onMechanic: [
        'adventure.bosses.captainMetaphor.taunts.mechanic1',
        'adventure.bosses.captainMetaphor.taunts.mechanic2',
      ],
      onLowTime: [
        'adventure.bosses.captainMetaphor.taunts.lowTime1',
      ],
      onVictory: 'adventure.bosses.captainMetaphor.taunts.victory',
      onDefeat: 'adventure.bosses.captainMetaphor.taunts.defeat',
    },
  },

  5: {
    id: 'baronBuildaword',
    worldId: 5,
    displayName: 'adventure.bosses.baronBuildaword.name',
    personality:
      'Steampunk inventor obsessed with word efficiency. Baffled that everything is not a compound word.',
    visualTheme: 'steampunk-weasel',
    imagePath: '/images/adventure/bosses/baron-buildaword.webp',
    twistMechanic: {
      type: 'assemblyLine',
      description: 'adventure.bosses.baronBuildaword.mechanic',
      params: {
        conveyorSpeed: 3,
        compoundBonusMultiplier: 3.0,
        machineInterval: 20,
      },
    },
    taunts: {
      onStart: [
        'adventure.bosses.baronBuildaword.taunts.start1',
        'adventure.bosses.baronBuildaword.taunts.start2',
      ],
      onGoodWord: [
        'adventure.bosses.baronBuildaword.taunts.goodWord1',
        'adventure.bosses.baronBuildaword.taunts.goodWord2',
      ],
      onBadWord: [
        'adventure.bosses.baronBuildaword.taunts.badWord1',
        'adventure.bosses.baronBuildaword.taunts.badWord2',
      ],
      onMechanic: [
        'adventure.bosses.baronBuildaword.taunts.mechanic1',
        'adventure.bosses.baronBuildaword.taunts.mechanic2',
      ],
      onLowTime: [
        'adventure.bosses.baronBuildaword.taunts.lowTime1',
      ],
      onVictory: 'adventure.bosses.baronBuildaword.taunts.victory',
      onDefeat: 'adventure.bosses.baronBuildaword.taunts.defeat',
    },
  },

  6: {
    id: 'puzzleMaster',
    worldId: 6,
    displayName: 'adventure.bosses.puzzleMaster.name',
    personality:
      'Enigmatic cat in a domino mask who speaks in riddles. Finds straightforward communication offensive.',
    visualTheme: 'mystery-cat',
    imagePath: '/images/adventure/bosses/puzzle-master.webp',
    twistMechanic: {
      type: 'scrambledReality',
      description: 'adventure.bosses.puzzleMaster.mechanic',
      params: {
        scrambleInterval: 10,
        anagramBonusMultiplier: 2.0,
        riddleTileCount: 2,
      },
    },
    taunts: {
      onStart: [
        'adventure.bosses.puzzleMaster.taunts.start1',
        'adventure.bosses.puzzleMaster.taunts.start2',
      ],
      onGoodWord: [
        'adventure.bosses.puzzleMaster.taunts.goodWord1',
        'adventure.bosses.puzzleMaster.taunts.goodWord2',
      ],
      onBadWord: [
        'adventure.bosses.puzzleMaster.taunts.badWord1',
        'adventure.bosses.puzzleMaster.taunts.badWord2',
      ],
      onMechanic: [
        'adventure.bosses.puzzleMaster.taunts.mechanic1',
        'adventure.bosses.puzzleMaster.taunts.mechanic2',
      ],
      onLowTime: [
        'adventure.bosses.puzzleMaster.taunts.lowTime1',
      ],
      onVictory: 'adventure.bosses.puzzleMaster.taunts.victory',
      onDefeat: 'adventure.bosses.puzzleMaster.taunts.defeat',
    },
  },

  7: {
    id: 'reflectionKing',
    worldId: 7,
    displayName: 'adventure.bosses.reflectionKing.name',
    personality:
      'Dramatic ice monarch who believes he is the protagonist. Incredibly vain but not evil.',
    visualTheme: 'crystal-peacock',
    imagePath: '/images/adventure/bosses/reflection-king.webp',
    twistMechanic: {
      type: 'mirrorMatch',
      description: 'adventure.bosses.reflectionKing.mechanic',
      params: {
        mirrorAxis: 'vertical',
        iceCrackThreshold: 2,
        palindromeBonusMultiplier: 3.0,
      },
    },
    taunts: {
      onStart: [
        'adventure.bosses.reflectionKing.taunts.start1',
        'adventure.bosses.reflectionKing.taunts.start2',
      ],
      onGoodWord: [
        'adventure.bosses.reflectionKing.taunts.goodWord1',
        'adventure.bosses.reflectionKing.taunts.goodWord2',
      ],
      onBadWord: [
        'adventure.bosses.reflectionKing.taunts.badWord1',
        'adventure.bosses.reflectionKing.taunts.badWord2',
      ],
      onMechanic: [
        'adventure.bosses.reflectionKing.taunts.mechanic1',
        'adventure.bosses.reflectionKing.taunts.mechanic2',
      ],
      onLowTime: [
        'adventure.bosses.reflectionKing.taunts.lowTime1',
      ],
      onVictory: 'adventure.bosses.reflectionKing.taunts.victory',
      onDefeat: 'adventure.bosses.reflectionKing.taunts.defeat',
    },
  },

  8: {
    id: 'cosmicWordsmith',
    worldId: 8,
    displayName: 'adventure.bosses.cosmicWordsmith.name',
    personality:
      'Ancient space entity who invented several languages. Deeply disappointed mortals use words wrong.',
    visualTheme: 'cosmic-jellyfish',
    imagePath: '/images/adventure/bosses/cosmic-wordsmith.webp',
    twistMechanic: {
      type: 'stellarForge',
      description: 'adventure.bosses.cosmicWordsmith.mechanic',
      params: {
        vowelCycleInterval: 8,
        supernovaLetters: ['Q', 'X', 'Z'],
        supernovaBonusMultiplier: 2.5,
        blackHoleDevourTime: 12,
      },
    },
    taunts: {
      onStart: [
        'adventure.bosses.cosmicWordsmith.taunts.start1',
        'adventure.bosses.cosmicWordsmith.taunts.start2',
      ],
      onGoodWord: [
        'adventure.bosses.cosmicWordsmith.taunts.goodWord1',
        'adventure.bosses.cosmicWordsmith.taunts.goodWord2',
      ],
      onBadWord: [
        'adventure.bosses.cosmicWordsmith.taunts.badWord1',
        'adventure.bosses.cosmicWordsmith.taunts.badWord2',
      ],
      onMechanic: [
        'adventure.bosses.cosmicWordsmith.taunts.mechanic1',
        'adventure.bosses.cosmicWordsmith.taunts.mechanic2',
      ],
      onLowTime: [
        'adventure.bosses.cosmicWordsmith.taunts.lowTime1',
      ],
      onVictory: 'adventure.bosses.cosmicWordsmith.taunts.victory',
      onDefeat: 'adventure.bosses.cosmicWordsmith.taunts.defeat',
    },
  },

  9: {
    id: 'linguistSage',
    worldId: 9,
    displayName: 'adventure.bosses.linguistSage.name',
    personality:
      'Wise mountain goat who achieved enlightenment through ALL languages. Mixes them chaotically.',
    visualTheme: 'mountain-goat',
    imagePath: '/images/adventure/bosses/linguist-sage.webp',
    twistMechanic: {
      type: 'babelSummit',
      description: 'adventure.bosses.linguistSage.mechanic',
      params: {
        languageSwitchInterval: 15,
        loanwordBonusMultiplier: 1.5,
        universalWordBonusMultiplier: 3.0,
      },
    },
    taunts: {
      onStart: [
        'adventure.bosses.linguistSage.taunts.start1',
        'adventure.bosses.linguistSage.taunts.start2',
      ],
      onGoodWord: [
        'adventure.bosses.linguistSage.taunts.goodWord1',
        'adventure.bosses.linguistSage.taunts.goodWord2',
      ],
      onBadWord: [
        'adventure.bosses.linguistSage.taunts.badWord1',
        'adventure.bosses.linguistSage.taunts.badWord2',
      ],
      onMechanic: [
        'adventure.bosses.linguistSage.taunts.mechanic1',
        'adventure.bosses.linguistSage.taunts.mechanic2',
      ],
      onLowTime: [
        'adventure.bosses.linguistSage.taunts.lowTime1',
      ],
      onVictory: 'adventure.bosses.linguistSage.taunts.victory',
      onDefeat: 'adventure.bosses.linguistSage.taunts.defeat',
    },
  },

  10: {
    id: 'lexiconDragon',
    worldId: 10,
    displayName: 'adventure.bosses.lexiconDragon.name',
    personality:
      'Ultimate word nerd transcended into dragon form. Anxious and overenthusiastic - wants to make friends!',
    visualTheme: 'golden-dragon',
    imagePath: '/images/adventure/bosses/lexicon-dragon.webp',
    twistMechanic: {
      type: 'finalWord',
      description: 'adventure.bosses.lexiconDragon.mechanic',
      params: {
        phaseOrder: [
          'popQuiz',
          'hiveMind',
          'etymologyDig',
          'idiomBattle',
          'assemblyLine',
          'scrambledReality',
          'mirrorMatch',
          'stellarForge',
          'babelSummit',
        ],
        phaseDuration: 15,
        lexiconStrikeThreshold: 5,
        dragonHoardGoldTileCount: 6,
        dragonHoardMinWordLength: 5,
      },
    },
    taunts: {
      onStart: [
        'adventure.bosses.lexiconDragon.taunts.start1',
        'adventure.bosses.lexiconDragon.taunts.start2',
      ],
      onGoodWord: [
        'adventure.bosses.lexiconDragon.taunts.goodWord1',
        'adventure.bosses.lexiconDragon.taunts.goodWord2',
      ],
      onBadWord: [
        'adventure.bosses.lexiconDragon.taunts.badWord1',
        'adventure.bosses.lexiconDragon.taunts.badWord2',
      ],
      onMechanic: [
        'adventure.bosses.lexiconDragon.taunts.mechanic1',
        'adventure.bosses.lexiconDragon.taunts.mechanic2',
      ],
      onLowTime: [
        'adventure.bosses.lexiconDragon.taunts.lowTime1',
      ],
      onVictory: 'adventure.bosses.lexiconDragon.taunts.victory',
      onDefeat: 'adventure.bosses.lexiconDragon.taunts.defeat',
    },
  },
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
