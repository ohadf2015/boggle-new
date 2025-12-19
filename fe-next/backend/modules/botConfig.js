/**
 * Bot Configuration Constants
 * Centralized configuration for AI bot players
 *
 * Extracted from botManager.js for better separation of concerns
 */

// Bot configuration constants
const BOT_CONFIG = {
  // Timing ranges in milliseconds (simulates human thinking/typing)
  // Medium and hard bots are intentionally slower to feel more realistic
  TIMING: {
    easy: {
      minDelay: 4000,    // Minimum time between words
      maxDelay: 12000,   // Maximum time between words
      startDelay: 3000,  // Initial delay before first word
      typingSpeed: 300,  // Base ms per character "typing"
    },
    medium: {
      minDelay: 3500,    // Increased from 2500 - more realistic thinking time
      maxDelay: 10000,   // Increased from 8000 - occasional longer pauses
      startDelay: 2500,  // Increased from 2000 - takes time to scan the board
      typingSpeed: 250,  // Increased from 200 - more realistic typing
    },
    hard: {
      minDelay: 3000,    // Increased from 2500 - still thinks before acting
      maxDelay: 9000,    // Increased from 7000 - occasional pondering
      startDelay: 2000,  // Increased from 1500 - scans board first
      typingSpeed: 200,  // Increased from 150 - more human-like typing
    }
  },

  // Word selection configuration
  // Medium and hard bots find fewer words per minute for more realistic gameplay
  WORDS: {
    easy: {
      maxWordLength: 5,       // Only find shorter words
      wordsPerMinute: 3,      // Average words found per minute
      focusOnShort: true,     // Prefer 3-4 letter words
      missChance: 0.15,       // 15% chance to "miss" a word (realistic errors)
      wrongWordChance: 0.12,  // 12% chance to submit a wrong word (like humans do)
    },
    medium: {
      maxWordLength: 7,
      wordsPerMinute: 4,      // Reduced from 5 - more realistic pace
      focusOnShort: false,
      missChance: 0.10,       // Increased from 0.08 - more realistic mistakes
      wrongWordChance: 0.08,  // 8% wrong word chance
    },
    hard: {
      maxWordLength: 8,
      wordsPerMinute: 4,      // Reduced from 5 - even experts take time
      focusOnShort: false,
      missChance: 0.10,       // Increased from 0.08 - more realistic
      wrongWordChance: 0.05,  // 5% wrong word chance (experts make fewer mistakes)
    }
  },

  // Bot appearance - More variety and personality
  AVATARS: [
    { emoji: '🤖', color: '#60a5fa' },
    { emoji: '🦾', color: '#34d399' },
    { emoji: '🎯', color: '#f472b6' },
    { emoji: '⚡', color: '#fbbf24' },
    { emoji: '🎮', color: '#a78bfa' },
    { emoji: '🧠', color: '#f87171' },
    { emoji: '🔮', color: '#c084fc' },
    { emoji: '🌟', color: '#facc15' },
    { emoji: '🚀', color: '#38bdf8' },
    { emoji: '🎲', color: '#4ade80' },
    // More personality-driven avatars
    { emoji: '🦊', color: '#fb923c' },
    { emoji: '🐺', color: '#6b7280' },
    { emoji: '🦁', color: '#f59e0b' },
    { emoji: '🐙', color: '#ec4899' },
    { emoji: '🦉', color: '#8b5cf6' },
    { emoji: '🐲', color: '#22c55e' },
    { emoji: '🦄', color: '#f472b6' },
    { emoji: '🐬', color: '#06b6d4' },
    { emoji: '🦅', color: '#78716c' },
    { emoji: '🐝', color: '#eab308' },
    { emoji: '🦋', color: '#14b8a6' },
    { emoji: '🌸', color: '#f9a8d4' },
    { emoji: '🔥', color: '#ef4444' },
    { emoji: '💎', color: '#67e8f9' },
    { emoji: '🎭', color: '#a855f7' },
  ],

  // Bot names by language and difficulty - Localized for each supported language
  NAMES: {
    en: {
      easy: [
        'Rookie', 'Newbie', 'Learner', 'Novice', 'Beginner', 'Starter', 'Junior', 'Trainee',
        'Padawan', 'Grasshopper', 'Apprentice', 'Cub', 'Fledgling', 'Seedling', 'Sprout',
        'Curious Cat', 'Word Pup', 'Letter Bug', 'Tiny Thinker', 'Baby Steps'
      ],
      medium: [
        'Player', 'Gamer', 'Challenger', 'Competitor', 'Contender', 'Rival', 'Fighter',
        'Wordsmith', 'Letter Hunter', 'Puzzle Pro', 'Grid Gazer', 'Word Warrior',
        'Scrabbler', 'Speller', 'Vocab Vulture', 'Syllable Seeker', 'Alpha Hunter',
        'Word Wrangler', 'Letter Lasso', 'Boggle Buddy', 'Grid Guru'
      ],
      hard: [
        'Expert', 'Master', 'Pro', 'Champion', 'Elite', 'Ace', 'Legend', 'Titan', 'Wizard',
        'Word Wizard', 'Lexicon Lord', 'Grammar Guru', 'Vocab Victor', 'Alpha King',
        'Dictionary Demon', 'Spelling Sage', 'Letter Legend', 'Word Whiz', 'Boggle Boss',
        'Grid Genius', 'Puzzle Phantom', 'Cerebral Storm', 'Mind Master', 'Brain Blitz'
      ],
      botSuffix: 'Bot',
    },
    he: {
      easy: [
        'טירון', 'מתחיל', 'חניך', 'טופי', 'גורי', 'פיפי', 'מומו', 'לולו',
        'בייבי', 'קטנצ׳יק', 'שושי', 'מושי', 'פופי', 'דודו', 'גוגו',
        'ציפי', 'מיקי', 'קיקי', 'ביבי', 'נוני'
      ],
      medium: [
        'שחקן', 'מתחרה', 'לוחם', 'גיבור', 'אלוף', 'מילון', 'חכמולי',
        'בלש', 'צייד', 'ג׳וקר', 'שועל', 'נמר', 'דוב', 'זאב', 'אריה',
        'נשר', 'פנתר', 'טיגריס', 'קוברה', 'פיראט'
      ],
      hard: [
        'מומחה', 'אלוף', 'גאון', 'מאסטר', 'אגדה', 'טיטאן', 'קוסם',
        'מלך המילים', 'שליט', 'אימפרטור', 'סמוראי', 'נינג׳ה', 'ויקינג',
        'גלדיאטור', 'ספרטני', 'לוחם עילית', 'אליפון', 'מכונה', 'טרמינטור', 'רובוקופ'
      ],
      botSuffix: 'בוט',
    },
    sv: {
      easy: [
        'Nybörjare', 'Lansen', 'Elansen', 'Smansen', 'Lilansen', 'Plutansen',
        'Gulansen', 'Kansen', 'Transen', 'Snansen', 'Blansen', 'Pransen',
        'Gnansen', 'Dransen', 'Fransen', 'Kransen', 'Stansen', 'Bransen', 'Gransen', 'Vransen'
      ],
      medium: [
        'Spansen', 'Utansen', 'Jansen', 'Mansen', 'Fjansen', 'Ordansen',
        'Bokansen', 'Klansen', 'Skansen', 'Svansen', 'Slansen', 'Plansen',
        'Glansen', 'Flansen', 'Blansen', 'Vransen', 'Knansen', 'Snansen', 'Transen', 'Bransen'
      ],
      hard: [
        'Expertansen', 'Mästansen', 'Champansen', 'Legendansen', 'Titanansen',
        'Trollkarlansen', 'Ordmästaransen', 'Geniansen', 'Vikingansen', 'Drakeansen',
        'Lejonansen', 'Örnansen', 'Vargansen', 'Björnansen', 'Tigeransen',
        'Panteransen', 'Falkenansen', 'Havköansen', 'Kondoransen', 'Enhörningansen'
      ],
      botSuffix: 'Bot',
    },
    ja: {
      easy: [
        'ルーキー', 'ビギナー', 'トレイニー', 'コネコ', 'コイヌ', 'ヒヨコ',
        'タマゴ', 'モモ', 'サクラ', 'ハナ', 'ユキ', 'ソラ',
        'リン', 'ミク', 'アオイ', 'カエデ', 'ツバキ', 'ウメ', 'キク', 'アヤメ'
      ],
      medium: [
        'プレイヤー', 'ゲーマー', 'チャレンジャー', 'ファイター', 'ハンター',
        'タヌキ', 'キツネ', 'ウサギ', 'シカ', 'クマ', 'オオカミ',
        'トラ', 'ヒョウ', 'リュウ', 'フェニックス', 'カッパ', 'テング', 'オニ', 'ニンジャ', 'サムライ'
      ],
      hard: [
        'マスター', 'エキスパート', 'チャンピオン', 'レジェンド', 'タイタン',
        'ウィザード', 'ワードマスター', 'ジーニアス', 'ショーグン', 'ダイミョウ',
        'カイザー', 'エンペラー', 'キング', 'ドラゴン', 'フェニックス',
        'ライジン', 'フウジン', 'スサノオ', 'アマテラス', 'ツクヨミ'
      ],
      botSuffix: 'ボット',
    },
  },

  // Bot personality traits (affects behavior patterns)
  PERSONALITIES: {
    // Aggressive bots submit words faster with smaller gaps
    aggressive: {
      delayMultiplier: 0.75,
      burstChance: 0.3,      // Chance to submit multiple words quickly
      comboFocus: true,      // Tries to maintain combo
    },
    // Methodical bots take their time but are more consistent
    methodical: {
      delayMultiplier: 1.25,
      burstChance: 0.1,
      comboFocus: false,
    },
    // Streaky bots have periods of intense activity followed by pauses
    streaky: {
      delayMultiplier: 1.0,
      burstChance: 0.5,      // Higher burst chance
      pauseChance: 0.2,      // Sometimes takes long pauses
      comboFocus: true,
    },
    // Steady bots maintain consistent pacing
    steady: {
      delayMultiplier: 1.0,
      burstChance: 0.15,
      comboFocus: false,
    }
  }
};

// Cache TTL configuration
const CACHE_CONFIG = {
  PLAYER_WORDS_TTL: 5 * 60 * 1000,        // 5 minutes
  MAX_PLAYER_WORDS_CACHE_SIZE: 10,         // Limit languages cached
  BLACKLIST_TTL: 10 * 60 * 1000,           // 10 minutes
};

module.exports = {
  BOT_CONFIG,
  CACHE_CONFIG,
};
