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

  // Bot names by language and difficulty - Each name has a suited emoji avatar
  // Format: { name: string, emoji: string, color: string }
  NAMES: {
    en: {
      easy: [
        { name: 'Rookie', emoji: '🐣', color: '#fef08a' },
        { name: 'Newbie', emoji: '🌱', color: '#bbf7d0' },
        { name: 'Learner', emoji: '📚', color: '#93c5fd' },
        { name: 'Novice', emoji: '🎒', color: '#fdba74' },
        { name: 'Beginner', emoji: '🔰', color: '#86efac' },
        { name: 'Sprout', emoji: '🌿', color: '#4ade80' },
        { name: 'Curious Cat', emoji: '🐱', color: '#f9a8d4' },
        { name: 'Word Pup', emoji: '🐕', color: '#fcd34d' },
        { name: 'Tiny Thinker', emoji: '🧒', color: '#c4b5fd' },
        { name: 'Baby Steps', emoji: '👶', color: '#fda4af' },
      ],
      medium: [
        { name: 'Wordsmith', emoji: '⚒️', color: '#fca5a1' },
        { name: 'Hunter', emoji: '🏹', color: '#86efac' },
        { name: 'Puzzle Pro', emoji: '🧩', color: '#67e8f9' },
        { name: 'Grid Gazer', emoji: '👁️', color: '#a78bfa' },
        { name: 'Word Warrior', emoji: '⚔️', color: '#f87171' },
        { name: 'Scrabbler', emoji: '🎯', color: '#38bdf8' },
        { name: 'Vocab Vulture', emoji: '🦅', color: '#78716c' },
        { name: 'Alpha Hunter', emoji: '🐺', color: '#94a3b8' },
        { name: 'Letter Lasso', emoji: '🤠', color: '#fbbf24' },
        { name: 'Boggle Buddy', emoji: '🎮', color: '#a78bfa' },
      ],
      hard: [
        { name: 'Word Wizard', emoji: '🧙', color: '#c4b5fd' },
        { name: 'Lexicon Lord', emoji: '👑', color: '#fcd34d' },
        { name: 'Dictionary Demon', emoji: '😈', color: '#ef4444' },
        { name: 'Spelling Sage', emoji: '🦉', color: '#8b5cf6' },
        { name: 'Letter Legend', emoji: '🏆', color: '#facc15' },
        { name: 'Word Whiz', emoji: '⚡', color: '#fbbf24' },
        { name: 'Boggle Boss', emoji: '💼', color: '#60a5fa' },
        { name: 'Grid Genius', emoji: '🧠', color: '#22c55e' },
        { name: 'Mind Master', emoji: '🎭', color: '#a855f7' },
        { name: 'Brain Blitz', emoji: '💥', color: '#38bdf8' },
      ],
      botSuffix: '🤖',
    },
    he: {
      easy: [
        { name: 'טירון', emoji: '🐣', color: '#fef08a' },
        { name: 'מתחיל', emoji: '🌱', color: '#bbf7d0' },
        { name: 'חניך', emoji: '📚', color: '#93c5fd' },
        { name: 'פיפי', emoji: '🐤', color: '#fcd34d' },
        { name: 'מושי', emoji: '🐌', color: '#a78bfa' },
        { name: 'קטנצ׳יק', emoji: '👶', color: '#fda4af' },
        { name: 'שושי', emoji: '🌸', color: '#f9a8d4' },
        { name: 'גוגו', emoji: '🎈', color: '#f87171' },
        { name: 'ביבי', emoji: '🐝', color: '#eab308' },
        { name: 'נוני', emoji: '🐟', color: '#38bdf8' },
      ],
      medium: [
        { name: 'שחקן', emoji: '🎮', color: '#a78bfa' },
        { name: 'לוחם', emoji: '⚔️', color: '#f87171' },
        { name: 'חכמולי', emoji: '🧠', color: '#c4b5fd' },
        { name: 'צייד', emoji: '🏹', color: '#86efac' },
        { name: 'שועל', emoji: '🦊', color: '#fb923c' },
        { name: 'נמר', emoji: '🐆', color: '#fbbf24' },
        { name: 'זאב', emoji: '🐺', color: '#94a3b8' },
        { name: 'נשר', emoji: '🦅', color: '#78716c' },
        { name: 'ג׳וקר', emoji: '🃏', color: '#ef4444' },
        { name: 'פיראט', emoji: '🏴‍☠️', color: '#1f2937' },
      ],
      hard: [
        { name: 'מומחה', emoji: '🎯', color: '#ef4444' },
        { name: 'גאון', emoji: '🧠', color: '#22c55e' },
        { name: 'מאסטר', emoji: '🎭', color: '#a855f7' },
        { name: 'קוסם', emoji: '🧙', color: '#c4b5fd' },
        { name: 'מלך המילים', emoji: '👑', color: '#fcd34d' },
        { name: 'נינג׳ה', emoji: '🥷', color: '#1f2937' },
        { name: 'סמוראי', emoji: '⚔️', color: '#dc2626' },
        { name: 'אליפון', emoji: '🏆', color: '#facc15' },
        { name: 'מכונה', emoji: '🤖', color: '#60a5fa' },
        { name: 'ויקינג', emoji: '🛡️', color: '#78716c' },
      ],
      botSuffix: '🤖',
    },
    sv: {
      easy: [
        { name: 'Nansen', emoji: '🐣', color: '#fef08a' },
        { name: 'Lansen', emoji: '🌱', color: '#bbf7d0' },
        { name: 'Snansen', emoji: '🐌', color: '#a78bfa' },
        { name: 'Gulansen', emoji: '⭐', color: '#fcd34d' },
        { name: 'Lilansen', emoji: '🐤', color: '#fef08a' },
        { name: 'Transen', emoji: '🎪', color: '#f9a8d4' },
        { name: 'Pransen', emoji: '👶', color: '#fda4af' },
        { name: 'Blansen', emoji: '🫧', color: '#67e8f9' },
        { name: 'Knansen', emoji: '🧶', color: '#fdba74' },
        { name: 'Dransen', emoji: '🐲', color: '#86efac' },
      ],
      medium: [
        { name: 'Ordansen', emoji: '📖', color: '#93c5fd' },
        { name: 'Skansen', emoji: '🏰', color: '#78716c' },
        { name: 'Klansen', emoji: '👨‍👩‍👧', color: '#f472b6' },
        { name: 'Jansen', emoji: '🎮', color: '#a78bfa' },
        { name: 'Spansen', emoji: '⚡', color: '#fbbf24' },
        { name: 'Svansen', emoji: '🦊', color: '#fb923c' },
        { name: 'Bokansen', emoji: '📚', color: '#c4b5fd' },
        { name: 'Plansen', emoji: '📋', color: '#86efac' },
        { name: 'Glansen', emoji: '✨', color: '#facc15' },
        { name: 'Mansen', emoji: '💪', color: '#f87171' },
      ],
      hard: [
        { name: 'Mästansen', emoji: '👑', color: '#fcd34d' },
        { name: 'Vikingansen', emoji: '🛡️', color: '#78716c' },
        { name: 'Drakeansen', emoji: '🐉', color: '#22c55e' },
        { name: 'Lejonansen', emoji: '🦁', color: '#f59e0b' },
        { name: 'Örnansen', emoji: '🦅', color: '#78716c' },
        { name: 'Björnansen', emoji: '🐻', color: '#a16207' },
        { name: 'Tigeransen', emoji: '🐯', color: '#fb923c' },
        { name: 'Enhörningansen', emoji: '🦄', color: '#f472b6' },
        { name: 'Falkenansen', emoji: '🦅', color: '#64748b' },
        { name: 'Trollkarlansen', emoji: '🧙', color: '#c4b5fd' },
      ],
      botSuffix: '🤖',
    },
    ja: {
      easy: [
        { name: 'ルーキー', emoji: '🐣', color: '#fef08a' },
        { name: 'ビギナー', emoji: '🌱', color: '#bbf7d0' },
        { name: 'コネコ', emoji: '🐱', color: '#f9a8d4' },
        { name: 'コイヌ', emoji: '🐕', color: '#fcd34d' },
        { name: 'ヒヨコ', emoji: '🐤', color: '#fef08a' },
        { name: 'サクラ', emoji: '🌸', color: '#fda4af' },
        { name: 'モモ', emoji: '🍑', color: '#fdba74' },
        { name: 'ユキ', emoji: '❄️', color: '#e0f2fe' },
        { name: 'ハナ', emoji: '🌺', color: '#f472b6' },
        { name: 'ソラ', emoji: '☁️', color: '#93c5fd' },
      ],
      medium: [
        { name: 'ハンター', emoji: '🏹', color: '#86efac' },
        { name: 'キツネ', emoji: '🦊', color: '#fb923c' },
        { name: 'タヌキ', emoji: '🦝', color: '#a16207' },
        { name: 'ニンジャ', emoji: '🥷', color: '#1f2937' },
        { name: 'サムライ', emoji: '⚔️', color: '#dc2626' },
        { name: 'リュウ', emoji: '🐲', color: '#22c55e' },
        { name: 'トラ', emoji: '🐯', color: '#fb923c' },
        { name: 'オオカミ', emoji: '🐺', color: '#94a3b8' },
        { name: 'カッパ', emoji: '🥒', color: '#86efac' },
        { name: 'テング', emoji: '👺', color: '#ef4444' },
      ],
      hard: [
        { name: 'マスター', emoji: '🎭', color: '#a855f7' },
        { name: 'チャンピオン', emoji: '🏆', color: '#facc15' },
        { name: 'ウィザード', emoji: '🧙', color: '#c4b5fd' },
        { name: 'ショーグン', emoji: '⚔️', color: '#dc2626' },
        { name: 'ドラゴン', emoji: '🐉', color: '#22c55e' },
        { name: 'フェニックス', emoji: '🔥', color: '#ef4444' },
        { name: 'ライジン', emoji: '⚡', color: '#fbbf24' },
        { name: 'スサノオ', emoji: '🌊', color: '#38bdf8' },
        { name: 'アマテラス', emoji: '☀️', color: '#fcd34d' },
        { name: 'ツクヨミ', emoji: '🌙', color: '#a78bfa' },
      ],
      botSuffix: '🤖',
    },
  },

  // Random player names - for players who don't set their own name
  // Categories: Epic + Food, Food with Attitude, Cute + Fierce Animals
  PLAYER_NAMES: {
    en: [
      // Epic + Food
      { name: 'Cosmic Potato', emoji: '🥔', color: '#fcd34d' },
      { name: 'Space Burrito', emoji: '🌯', color: '#fb923c' },
      { name: 'Galaxy Pretzel', emoji: '🥨', color: '#a78bfa' },
      { name: 'Astro Muffin', emoji: '🧁', color: '#f9a8d4' },
      { name: 'Stellar Pickle', emoji: '🥒', color: '#86efac' },
      { name: 'Nebula Nugget', emoji: '🍗', color: '#fdba74' },
      { name: 'Quantum Cookie', emoji: '🍪', color: '#a16207' },
      { name: 'Turbo Tofu', emoji: '🧈', color: '#fef08a' },
      { name: 'Mega Mango', emoji: '🥭', color: '#fb923c' },
      { name: 'Ultra Waffle', emoji: '🧇', color: '#fcd34d' },
      // Food with Attitude
      { name: 'Grumpy Waffle', emoji: '🧇', color: '#fbbf24' },
      { name: 'Salty Pretzel', emoji: '🥨', color: '#78716c' },
      { name: 'Spicy Taco', emoji: '🌮', color: '#ef4444' },
      { name: 'Moody Mochi', emoji: '🍡', color: '#f9a8d4' },
      { name: 'Sassy Sushi', emoji: '🍣', color: '#fb923c' },
      { name: 'Dramatic Pickle', emoji: '🥒', color: '#22c55e' },
      { name: 'Cranky Cookie', emoji: '🍪', color: '#a16207' },
      { name: 'Feisty Falafel', emoji: '🧆', color: '#fcd34d' },
      { name: 'Angry Avocado', emoji: '🥑', color: '#86efac' },
      { name: 'Chill Churro', emoji: '🍩', color: '#fdba74' },
      // Cute + Fierce Animals
      { name: 'Baby Shark', emoji: '🦈', color: '#38bdf8' },
      { name: 'Fluffy Fury', emoji: '🐱', color: '#f9a8d4' },
      { name: 'Grumpy Bunny', emoji: '🐰', color: '#fda4af' },
      { name: 'Angry Duckling', emoji: '🐤', color: '#fef08a' },
      { name: 'Fierce Hamster', emoji: '🐹', color: '#fdba74' },
      { name: 'Moody Penguin', emoji: '🐧', color: '#1f2937' },
      { name: 'Cranky Kitten', emoji: '😾', color: '#a78bfa' },
      { name: 'Sassy Sloth', emoji: '🦥', color: '#a16207' },
      { name: 'Dramatic Llama', emoji: '🦙', color: '#fcd34d' },
      { name: 'Feisty Koala', emoji: '🐨', color: '#94a3b8' },
    ],
    he: [
      // Epic + Food
      { name: 'תפוח אדמה קוסמי', emoji: '🥔', color: '#fcd34d' },
      { name: 'בוריטו גלקטי', emoji: '🌯', color: '#fb923c' },
      { name: 'בייגל חללי', emoji: '🥯', color: '#a78bfa' },
      { name: 'פיצה סופרנובה', emoji: '🍕', color: '#ef4444' },
      { name: 'נאגטס כוכבי', emoji: '🍗', color: '#fdba74' },
      { name: 'עוגייה קוונטית', emoji: '🍪', color: '#a16207' },
      { name: 'פלאפל טורבו', emoji: '🧆', color: '#fcd34d' },
      { name: 'מאפין אסטרו', emoji: '🧁', color: '#f9a8d4' },
      { name: 'מנגו מגה', emoji: '🥭', color: '#fb923c' },
      { name: 'וופל אולטרה', emoji: '🧇', color: '#fbbf24' },
      // Food with Attitude
      { name: 'וופל זועף', emoji: '🧇', color: '#fbbf24' },
      { name: 'בייגלה מלוח', emoji: '🥨', color: '#78716c' },
      { name: 'טאקו חריף', emoji: '🌮', color: '#ef4444' },
      { name: 'מוצ׳י מהורהר', emoji: '🍡', color: '#f9a8d4' },
      { name: 'סושי חצוף', emoji: '🍣', color: '#fb923c' },
      { name: 'מלפפון דרמטי', emoji: '🥒', color: '#22c55e' },
      { name: 'עוגייה עצבנית', emoji: '🍪', color: '#a16207' },
      { name: 'פלאפל נועז', emoji: '🧆', color: '#86efac' },
      { name: 'אבוקדו כועס', emoji: '🥑', color: '#86efac' },
      { name: 'צ׳ורו רגוע', emoji: '🍩', color: '#fdba74' },
      // Cute + Fierce Animals
      { name: 'כריש תינוק', emoji: '🦈', color: '#38bdf8' },
      { name: 'חתול זועף', emoji: '🐱', color: '#f9a8d4' },
      { name: 'ארנב רגזן', emoji: '🐰', color: '#fda4af' },
      { name: 'ברווזון כועס', emoji: '🐤', color: '#fef08a' },
      { name: 'אוגר פראי', emoji: '🐹', color: '#fdba74' },
      { name: 'פינגווין מהורהר', emoji: '🐧', color: '#1f2937' },
      { name: 'חתלתול עצבני', emoji: '😾', color: '#a78bfa' },
      { name: 'עצלן חצוף', emoji: '🦥', color: '#a16207' },
      { name: 'למה דרמטית', emoji: '🦙', color: '#fcd34d' },
      { name: 'קואלה נועזת', emoji: '🐨', color: '#94a3b8' },
    ],
    sv: [
      // Epic + Food
      { name: 'Kosmisk Potatis', emoji: '🥔', color: '#fcd34d' },
      { name: 'Rymd Burrito', emoji: '🌯', color: '#fb923c' },
      { name: 'Galaktisk Bagel', emoji: '🥯', color: '#a78bfa' },
      { name: 'Stjärnpizza', emoji: '🍕', color: '#ef4444' },
      { name: 'Kvant Kaka', emoji: '🍪', color: '#a16207' },
      { name: 'Turbo Tofu', emoji: '🧈', color: '#fef08a' },
      { name: 'Mega Mango', emoji: '🥭', color: '#fb923c' },
      { name: 'Ultra Våffla', emoji: '🧇', color: '#fbbf24' },
      { name: 'Nebula Nugget', emoji: '🍗', color: '#fdba74' },
      { name: 'Astro Muffin', emoji: '🧁', color: '#f9a8d4' },
      // Food with Attitude
      { name: 'Sur Våffla', emoji: '🧇', color: '#fbbf24' },
      { name: 'Salt Kringla', emoji: '🥨', color: '#78716c' },
      { name: 'Kryddig Taco', emoji: '🌮', color: '#ef4444' },
      { name: 'Lynnig Mochi', emoji: '🍡', color: '#f9a8d4' },
      { name: 'Fräck Sushi', emoji: '🍣', color: '#fb923c' },
      { name: 'Dramatisk Gurka', emoji: '🥒', color: '#22c55e' },
      { name: 'Sur Kaka', emoji: '🍪', color: '#a16207' },
      { name: 'Modig Falafel', emoji: '🧆', color: '#86efac' },
      { name: 'Arg Avokado', emoji: '🥑', color: '#86efac' },
      { name: 'Lugn Churro', emoji: '🍩', color: '#fdba74' },
      // Cute + Fierce Animals
      { name: 'Bebis Haj', emoji: '🦈', color: '#38bdf8' },
      { name: 'Fluffig Ilska', emoji: '🐱', color: '#f9a8d4' },
      { name: 'Sur Kanin', emoji: '🐰', color: '#fda4af' },
      { name: 'Arg Ankunge', emoji: '🐤', color: '#fef08a' },
      { name: 'Vild Hamster', emoji: '🐹', color: '#fdba74' },
      { name: 'Lynnig Pingvin', emoji: '🐧', color: '#1f2937' },
      { name: 'Sur Kattunge', emoji: '😾', color: '#a78bfa' },
      { name: 'Fräck Sengångare', emoji: '🦥', color: '#a16207' },
      { name: 'Dramatisk Lama', emoji: '🦙', color: '#fcd34d' },
      { name: 'Modig Koala', emoji: '🐨', color: '#94a3b8' },
    ],
    ja: [
      // Epic + Food
      { name: 'コズミックポテト', emoji: '🥔', color: '#fcd34d' },
      { name: 'ギャラクシーブリトー', emoji: '🌯', color: '#fb923c' },
      { name: 'スペースベーグル', emoji: '🥯', color: '#a78bfa' },
      { name: 'スターピザ', emoji: '🍕', color: '#ef4444' },
      { name: 'クォンタムクッキー', emoji: '🍪', color: '#a16207' },
      { name: 'ターボ豆腐', emoji: '🧈', color: '#fef08a' },
      { name: 'メガマンゴー', emoji: '🥭', color: '#fb923c' },
      { name: 'ウルトラワッフル', emoji: '🧇', color: '#fbbf24' },
      { name: 'ネビュラナゲット', emoji: '🍗', color: '#fdba74' },
      { name: 'アストロマフィン', emoji: '🧁', color: '#f9a8d4' },
      // Food with Attitude
      { name: '不機嫌ワッフル', emoji: '🧇', color: '#fbbf24' },
      { name: 'しょっぱいプレッツェル', emoji: '🥨', color: '#78716c' },
      { name: 'スパイシータコス', emoji: '🌮', color: '#ef4444' },
      { name: '気まぐれモチ', emoji: '🍡', color: '#f9a8d4' },
      { name: '生意気スシ', emoji: '🍣', color: '#fb923c' },
      { name: 'ドラマピクルス', emoji: '🥒', color: '#22c55e' },
      { name: '怒りクッキー', emoji: '🍪', color: '#a16207' },
      { name: '勇敢ファラフェル', emoji: '🧆', color: '#86efac' },
      { name: '怒りアボカド', emoji: '🥑', color: '#86efac' },
      { name: 'のんびりチュロス', emoji: '🍩', color: '#fdba74' },
      // Cute + Fierce Animals
      { name: 'ベビーシャーク', emoji: '🦈', color: '#38bdf8' },
      { name: 'もふもふ怒り', emoji: '🐱', color: '#f9a8d4' },
      { name: '不機嫌うさぎ', emoji: '🐰', color: '#fda4af' },
      { name: '怒りアヒル', emoji: '🐤', color: '#fef08a' },
      { name: '野生ハムスター', emoji: '🐹', color: '#fdba74' },
      { name: '気まぐれペンギン', emoji: '🐧', color: '#1f2937' },
      { name: '怒り子猫', emoji: '😾', color: '#a78bfa' },
      { name: '生意気ナマケモノ', emoji: '🦥', color: '#a16207' },
      { name: 'ドラマラマ', emoji: '🦙', color: '#fcd34d' },
      { name: '勇敢コアラ', emoji: '🐨', color: '#94a3b8' },
    ],
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
