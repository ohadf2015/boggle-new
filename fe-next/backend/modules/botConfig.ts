/**
 * Bot Configuration Constants
 * Centralized configuration for AI bot players
 *
 * Extracted from botManager.js for better separation of concerns
 */

export type BotDifficulty = 'easy' | 'medium' | 'hard';
export type BotPersonality = 'aggressive' | 'methodical' | 'streaky' | 'steady';

export interface TimingConfig {
  minDelay: number;
  maxDelay: number;
  startDelay: number;
  typingSpeed: number;
}

export interface WordsConfig {
  maxWordLength: number;
  wordsPerMinute: number;
  focusOnShort: boolean;
  missChance: number;
  wrongWordChance: number;
}

export interface BotName {
  name: string;
  emoji: string;
  color: string;
}

export interface LanguageBotNames {
  easy: BotName[];
  medium: BotName[];
  hard: BotName[];
  botSuffix: string;
}

export interface PersonalityConfig {
  delayMultiplier: number;
  burstChance: number;
  comboFocus: boolean;
  pauseChance?: number;
}

export interface BotConfigType {
  TIMING: Record<BotDifficulty, TimingConfig>;
  WORDS: Record<BotDifficulty, WordsConfig>;
  NAMES: Record<string, LanguageBotNames>;
  PLAYER_NAMES: Record<string, BotName[]>;
  GENERIC_AVATARS: BotName[];
  PERSONALITIES: Record<BotPersonality, PersonalityConfig>;
}

// Bot configuration constants
export const BOT_CONFIG: BotConfigType = {
  // Timing ranges in milliseconds (simulates human thinking/typing)
  // Medium and hard bots are intentionally slower to feel more realistic
  // Bumped again — players still found easy/medium/hard bots too sharp at
  // the old timings for a casual round.
  TIMING: {
    easy: {
      minDelay: 2500,    // Minimum time between words
      maxDelay: 6500,    // Maximum time between words
      startDelay: 2500,  // Initial delay before first word
      typingSpeed: 190,  // Base ms per character "typing"
    },
    medium: {
      minDelay: 2200,    // Thinks quickly
      maxDelay: 5500,    // Occasional pauses
      startDelay: 2200,  // Scans board then starts
      typingSpeed: 170,  // Faster typing
    },
    hard: {
      minDelay: 1400,    // Fast word recognition
      maxDelay: 4000,    // Brief thinking pauses
      startDelay: 1400,  // Quick scan
      typingSpeed: 110,  // Expert typing speed
    }
  },

  // Word selection configuration
  // Lowered another notch across the board — bots found too many words too
  // fast and with too few mistakes at the old rates.
  WORDS: {
    easy: {
      maxWordLength: 6,       // Find short-medium words
      wordsPerMinute: 5,      // Decent pace
      focusOnShort: true,     // Prefer 3-4 letter words
      missChance: 0.16,       // 16% chance to "miss" a word
      wrongWordChance: 0.12,  // 12% chance to submit a wrong word
    },
    medium: {
      maxWordLength: 7,
      wordsPerMinute: 8,      // Competitive pace
      focusOnShort: false,
      missChance: 0.09,       // Fewer mistakes
      wrongWordChance: 0.07,  // 7% wrong word chance
    },
    hard: {
      maxWordLength: 10,      // Experts find long words
      wordsPerMinute: 11,     // Fast and aggressive
      focusOnShort: false,
      missChance: 0.06,       // Rarely misses
      wrongWordChance: 0.05,  // Few mistakes
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
      botSuffix: 'Bot',
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
        { name: 'מכונה', emoji: '⚙️', color: '#60a5fa' },
        { name: 'ויקינג', emoji: '🛡️', color: '#78716c' },
      ],
      botSuffix: 'Bot',
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
      botSuffix: 'Bot',
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
      botSuffix: 'Bot',
    },
    es: {
      easy: [
        { name: 'Novato', emoji: '🐣', color: '#fef08a' },
        { name: 'Brote', emoji: '🌱', color: '#bbf7d0' },
        { name: 'Aprendiz', emoji: '📚', color: '#93c5fd' },
        { name: 'Principiante', emoji: '🎒', color: '#fdba74' },
        { name: 'Gatito Curioso', emoji: '🐱', color: '#f9a8d4' },
        { name: 'Cachorro', emoji: '🐕', color: '#fcd34d' },
        { name: 'Pequeñín', emoji: '🧒', color: '#c4b5fd' },
        { name: 'Pasito', emoji: '👶', color: '#fda4af' },
        { name: 'Chispita', emoji: '✨', color: '#fef08a' },
        { name: 'Semilla', emoji: '🌿', color: '#4ade80' },
      ],
      medium: [
        { name: 'Forjador', emoji: '⚒️', color: '#fca5a1' },
        { name: 'Cazador', emoji: '🏹', color: '#86efac' },
        { name: 'Acertijo', emoji: '🧩', color: '#67e8f9' },
        { name: 'Explorador', emoji: '👁️', color: '#a78bfa' },
        { name: 'Guerrero', emoji: '⚔️', color: '#f87171' },
        { name: 'Estratega', emoji: '🎯', color: '#38bdf8' },
        { name: 'Buitre Verbal', emoji: '🦅', color: '#78716c' },
        { name: 'Lobo Alfa', emoji: '🐺', color: '#94a3b8' },
        { name: 'Lazo Letras', emoji: '🤠', color: '#fbbf24' },
        { name: 'Compi Boggle', emoji: '🎮', color: '#a78bfa' },
      ],
      hard: [
        { name: 'Mago Verbal', emoji: '🧙', color: '#c4b5fd' },
        { name: 'Rey del Léxico', emoji: '👑', color: '#fcd34d' },
        { name: 'Demonio Léxico', emoji: '😈', color: '#ef4444' },
        { name: 'Sabio Ortógrafo', emoji: '🦉', color: '#8b5cf6' },
        { name: 'Leyenda Letras', emoji: '🏆', color: '#facc15' },
        { name: 'Genio Verbal', emoji: '⚡', color: '#fbbf24' },
        { name: 'Jefe Boggle', emoji: '💼', color: '#60a5fa' },
        { name: 'Genio Cuadrícula', emoji: '🧠', color: '#22c55e' },
        { name: 'Maestro Mental', emoji: '🎭', color: '#a855f7' },
        { name: 'Tormenta Mental', emoji: '💥', color: '#38bdf8' },
      ],
      botSuffix: 'Bot',
    },
  },

  // Random player names - for players who don't set their own name
  // Style: [Funny Adjective] + [Food/Animal] - "Sneaky Pickle", "Giggly Goose"
  PLAYER_NAMES: {
    en: [
      // Adjective + Food
      { name: 'Sneaky Pickle', emoji: '🥒', color: '#22c55e' },
      { name: 'Disco Potato', emoji: '🥔', color: '#a78bfa' },
      { name: 'Cosmic Banana', emoji: '🍌', color: '#fde047' },
      { name: 'Fluffy Waffle', emoji: '🧇', color: '#fbbf24' },
      { name: 'Crispy Taco', emoji: '🌮', color: '#ef4444' },
      { name: 'Squishy Mochi', emoji: '🍡', color: '#f9a8d4' },
      { name: 'Twisty Pretzel', emoji: '🥨', color: '#a78bfa' },
      { name: 'Chunky Cookie', emoji: '🍪', color: '#a16207' },
      { name: 'Gooey Donut', emoji: '🍩', color: '#f9a8d4' },
      { name: 'Zesty Avocado', emoji: '🥑', color: '#86efac' },
      { name: 'Chewy Noodle', emoji: '🍜', color: '#fb923c' },
      { name: 'Crunchy Falafel', emoji: '🧆', color: '#22c55e' },
      { name: 'Zany Zucchini', emoji: '🥒', color: '#22c55e' },
      // Adjective + Animal
      { name: 'Silly Salmon', emoji: '🐟', color: '#fb923c' },
      { name: 'Giggly Goose', emoji: '🦆', color: '#fef08a' },
      { name: 'Wacky Walrus', emoji: '🦭', color: '#64748b' },
      { name: 'Peppy Penguin', emoji: '🐧', color: '#1f2937' },
      { name: 'Loopy Llama', emoji: '🦙', color: '#fcd34d' },
      { name: 'Dizzy Dragon', emoji: '🐉', color: '#22c55e' },
      { name: 'Funky Flamingo', emoji: '🦩', color: '#f472b6' },
      { name: 'Bouncy Bear', emoji: '🐻', color: '#a16207' },
      { name: 'Zippy Zebra', emoji: '🦓', color: '#1f2937' },
      { name: 'Sassy Sloth', emoji: '🦥', color: '#a16207' },
      { name: 'Quirky Quokka', emoji: '🐨', color: '#94a3b8' },
      { name: 'Jolly Jellyfish', emoji: '🪼', color: '#a78bfa' },
      { name: 'Rowdy Raccoon', emoji: '🦝', color: '#64748b' },
      { name: 'Fizzy Fox', emoji: '🦊', color: '#fb923c' },
      { name: 'Happy Hippo', emoji: '🦛', color: '#64748b' },
      { name: 'Kooky Koala', emoji: '🐨', color: '#94a3b8' },
    ],
    he: [
      // Adjective + Food (Hebrew)
      { name: 'מלפפון חמקמק', emoji: '🥒', color: '#22c55e' },
      { name: 'תפוח אדמה דיסקו', emoji: '🥔', color: '#a78bfa' },
      { name: 'בננה קוסמית', emoji: '🍌', color: '#fde047' },
      { name: 'וופל פלאפי', emoji: '🧇', color: '#fbbf24' },
      { name: 'טאקו קריספי', emoji: '🌮', color: '#ef4444' },
      { name: 'מוצי סקוושי', emoji: '🍡', color: '#f9a8d4' },
      { name: 'בייגלה מפותל', emoji: '🥨', color: '#a78bfa' },
      { name: 'עוגייה צאנקית', emoji: '🍪', color: '#a16207' },
      { name: 'דונאט דביק', emoji: '🍩', color: '#f9a8d4' },
      { name: 'אבוקדו זסטי', emoji: '🥑', color: '#86efac' },
      { name: 'נודל לעיס', emoji: '🍜', color: '#fb923c' },
      { name: 'פלאפל קריספי', emoji: '🧆', color: '#22c55e' },
      // Adjective + Animal (Hebrew)
      { name: 'סלמון סילי', emoji: '🐟', color: '#fb923c' },
      { name: 'אווז צחקני', emoji: '🦆', color: '#fef08a' },
      { name: 'כלב ים משוגע', emoji: '🦭', color: '#64748b' },
      { name: 'פינגווין פפי', emoji: '🐧', color: '#1f2937' },
      { name: 'למה לופי', emoji: '🦙', color: '#fcd34d' },
      { name: 'דרקון מסוחרר', emoji: '🐉', color: '#22c55e' },
      { name: 'פלמינגו פאנקי', emoji: '🦩', color: '#f472b6' },
      { name: 'דוב קופצני', emoji: '🐻', color: '#a16207' },
      { name: 'זברה זיפי', emoji: '🦓', color: '#1f2937' },
      { name: 'עצלן חצוף', emoji: '🦥', color: '#a16207' },
      { name: 'קואלה משונה', emoji: '🐨', color: '#94a3b8' },
      { name: 'מדוזה עליזה', emoji: '🪼', color: '#a78bfa' },
      { name: 'רקון רועש', emoji: '🦝', color: '#64748b' },
      { name: 'שועל פיזי', emoji: '🦊', color: '#fb923c' },
      { name: 'היפו שמח', emoji: '🦛', color: '#64748b' },
    ],
    sv: [
      // Adjective + Food (Swedish)
      { name: 'Smyg Gurka', emoji: '🥒', color: '#22c55e' },
      { name: 'Disco Potatis', emoji: '🥔', color: '#a78bfa' },
      { name: 'Kosmisk Banan', emoji: '🍌', color: '#fde047' },
      { name: 'Fluffig Våffla', emoji: '🧇', color: '#fbbf24' },
      { name: 'Krispig Taco', emoji: '🌮', color: '#ef4444' },
      { name: 'Mjuk Mochi', emoji: '🍡', color: '#f9a8d4' },
      { name: 'Vriden Kringla', emoji: '🥨', color: '#a78bfa' },
      { name: 'Chunky Kaka', emoji: '🍪', color: '#a16207' },
      { name: 'Kladdig Munk', emoji: '🍩', color: '#f9a8d4' },
      { name: 'Pigg Avokado', emoji: '🥑', color: '#86efac' },
      { name: 'Seg Nudel', emoji: '🍜', color: '#fb923c' },
      // Adjective + Animal (Swedish)
      { name: 'Fånig Lax', emoji: '🐟', color: '#fb923c' },
      { name: 'Fnissig Gås', emoji: '🦆', color: '#fef08a' },
      { name: 'Galen Valross', emoji: '🦭', color: '#64748b' },
      { name: 'Pigg Pingvin', emoji: '🐧', color: '#1f2937' },
      { name: 'Loopy Lama', emoji: '🦙', color: '#fcd34d' },
      { name: 'Yr Drake', emoji: '🐉', color: '#22c55e' },
      { name: 'Funky Flamingo', emoji: '🦩', color: '#f472b6' },
      { name: 'Studsig Björn', emoji: '🐻', color: '#a16207' },
      { name: 'Snabb Zebra', emoji: '🦓', color: '#1f2937' },
      { name: 'Fräck Sengångare', emoji: '🦥', color: '#a16207' },
      { name: 'Knasig Koala', emoji: '🐨', color: '#94a3b8' },
      { name: 'Glad Manet', emoji: '🪼', color: '#a78bfa' },
      { name: 'Vild Tvättbjörn', emoji: '🦝', color: '#64748b' },
      { name: 'Fräsig Räv', emoji: '🦊', color: '#fb923c' },
      { name: 'Glad Flodhäst', emoji: '🦛', color: '#64748b' },
    ],
    ja: [
      // Adjective + Food (Japanese)
      { name: 'こっそりピクルス', emoji: '🥒', color: '#22c55e' },
      { name: 'ディスコポテト', emoji: '🥔', color: '#a78bfa' },
      { name: 'コズミックバナナ', emoji: '🍌', color: '#fde047' },
      { name: 'ふわふわワッフル', emoji: '🧇', color: '#fbbf24' },
      { name: 'カリカリタコス', emoji: '🌮', color: '#ef4444' },
      { name: 'もちもちモチ', emoji: '🍡', color: '#f9a8d4' },
      { name: 'ねじねじプレッツェル', emoji: '🥨', color: '#a78bfa' },
      { name: 'ザクザククッキー', emoji: '🍪', color: '#a16207' },
      { name: 'とろとろドーナツ', emoji: '🍩', color: '#f9a8d4' },
      { name: 'ピリピリアボカド', emoji: '🥑', color: '#86efac' },
      { name: 'もちもちヌードル', emoji: '🍜', color: '#fb923c' },
      // Adjective + Animal (Japanese)
      { name: 'おバカサーモン', emoji: '🐟', color: '#fb923c' },
      { name: 'くすくすガチョウ', emoji: '🦆', color: '#fef08a' },
      { name: 'おかしなセイウチ', emoji: '🦭', color: '#64748b' },
      { name: 'ペッピーペンギン', emoji: '🐧', color: '#1f2937' },
      { name: 'ルーピーラマ', emoji: '🦙', color: '#fcd34d' },
      { name: 'くるくるドラゴン', emoji: '🐉', color: '#22c55e' },
      { name: 'ファンキーフラミンゴ', emoji: '🦩', color: '#f472b6' },
      { name: 'ぴょんぴょんクマ', emoji: '🐻', color: '#a16207' },
      { name: 'びゅんびゅんシマウマ', emoji: '🦓', color: '#1f2937' },
      { name: 'おませなナマケモノ', emoji: '🦥', color: '#a16207' },
      { name: 'へんてこコアラ', emoji: '🐨', color: '#94a3b8' },
      { name: 'ハッピークラゲ', emoji: '🪼', color: '#a78bfa' },
      { name: 'やんちゃアライグマ', emoji: '🦝', color: '#64748b' },
      { name: 'シュワシュワキツネ', emoji: '🦊', color: '#fb923c' },
      { name: 'ハッピーカバ', emoji: '🦛', color: '#64748b' },
    ],
    es: [
      // Adjective + Food (Spanish)
      { name: 'Pepino Astuto', emoji: '🥒', color: '#22c55e' },
      { name: 'Patata Disco', emoji: '🥔', color: '#a78bfa' },
      { name: 'Banana Cósmica', emoji: '🍌', color: '#fde047' },
      { name: 'Waffle Esponjoso', emoji: '🧇', color: '#fbbf24' },
      { name: 'Taco Crujiente', emoji: '🌮', color: '#ef4444' },
      { name: 'Mochi Blandito', emoji: '🍡', color: '#f9a8d4' },
      { name: 'Pretzel Retorcido', emoji: '🥨', color: '#a78bfa' },
      { name: 'Galleta Gordita', emoji: '🍪', color: '#a16207' },
      { name: 'Dona Pegajosa', emoji: '🍩', color: '#f9a8d4' },
      { name: 'Aguacate Picante', emoji: '🥑', color: '#86efac' },
      { name: 'Fideo Chicle', emoji: '🍜', color: '#fb923c' },
      { name: 'Falafel Crujiente', emoji: '🧆', color: '#22c55e' },
      // Adjective + Animal (Spanish)
      { name: 'Salmón Bobo', emoji: '🐟', color: '#fb923c' },
      { name: 'Ganso Risueño', emoji: '🦆', color: '#fef08a' },
      { name: 'Morsa Loca', emoji: '🦭', color: '#64748b' },
      { name: 'Pingüino Animado', emoji: '🐧', color: '#1f2937' },
      { name: 'Llama Chiflada', emoji: '🦙', color: '#fcd34d' },
      { name: 'Dragón Mareado', emoji: '🐉', color: '#22c55e' },
      { name: 'Flamenco Funky', emoji: '🦩', color: '#f472b6' },
      { name: 'Oso Saltarín', emoji: '🐻', color: '#a16207' },
      { name: 'Cebra Veloz', emoji: '🦓', color: '#1f2937' },
      { name: 'Perezoso Sassy', emoji: '🦥', color: '#a16207' },
      { name: 'Koala Raro', emoji: '🐨', color: '#94a3b8' },
      { name: 'Medusa Alegre', emoji: '🪼', color: '#a78bfa' },
      { name: 'Mapache Ruidoso', emoji: '🦝', color: '#64748b' },
      { name: 'Zorro Chispeante', emoji: '🦊', color: '#fb923c' },
      { name: 'Hippo Feliz', emoji: '🦛', color: '#64748b' },
    ],
  },

  // Generic avatars for OAuth users whose names don't come from the fun name pool
  // These are neutral face/people emojis that work with any name
  GENERIC_AVATARS: [
    { name: '', emoji: '😊', color: '#fcd34d' },
    { name: '', emoji: '😎', color: '#1f2937' },
    { name: '', emoji: '🙂', color: '#fef08a' },
    { name: '', emoji: '😄', color: '#86efac' },
    { name: '', emoji: '🤗', color: '#f9a8d4' },
    { name: '', emoji: '😁', color: '#67e8f9' },
    { name: '', emoji: '🥳', color: '#a78bfa' },
    { name: '', emoji: '😺', color: '#fb923c' },
    { name: '', emoji: '🌟', color: '#facc15' },
    { name: '', emoji: '✨', color: '#c4b5fd' },
    { name: '', emoji: '🎯', color: '#f87171' },
    { name: '', emoji: '🎨', color: '#38bdf8' },
    { name: '', emoji: '🎮', color: '#a855f7' },
    { name: '', emoji: '🚀', color: '#22c55e' },
    { name: '', emoji: '💫', color: '#fbbf24' },
    { name: '', emoji: '🌈', color: '#ec4899' },
    { name: '', emoji: '⭐', color: '#fcd34d' },
    { name: '', emoji: '🎪', color: '#f472b6' },
    { name: '', emoji: '🎭', color: '#8b5cf6' },
    { name: '', emoji: '🎸', color: '#dc2626' },
  ],

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
export const CACHE_CONFIG = {
  PLAYER_WORDS_TTL: 5 * 60 * 1000,        // 5 minutes
  MAX_PLAYER_WORDS_CACHE_SIZE: 10,         // Limit languages cached
  BLACKLIST_TTL: 10 * 60 * 1000,           // 10 minutes
} as const;

// Default export for backward compatibility
const botConfigDefault = {
  BOT_CONFIG,
  CACHE_CONFIG,
};
export default botConfigDefault;
