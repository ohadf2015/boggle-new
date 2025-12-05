import type { DifficultySettings, MinWordLengthOption } from '@/types';

export const hebrewLetters: string[] = [
    "א",
    "ב",
    "ג",
    "ד",
    "ה",
    "ו",
    "ז",
    "ח",
    "ט",
    "י",
    "כ",
    "ל",
    "מ",
    "נ",
    "ס",
    "ע",
    "פ",
    "צ",
    "ק",
    "ר",
    "ש",
    "ת",
  ];

export const englishLetters: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const swedishLetters: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('');

export const japaneseLetters: string[] = [
  // Common kanji for word games
  "日", "本", "人", "年", "月", "火", "水", "木", "金", "土",
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "大", "小", "中", "上", "下", "左", "右", "前", "後", "内",
  "外", "多", "少", "高", "低", "長", "短", "新", "古", "明",
  "暗", "強", "弱", "重", "軽", "早", "遅", "近", "遠", "広",
  "狭", "深", "浅", "太", "細", "厚", "薄", "硬", "柔", "良",
  "悪", "美", "醜", "正", "誤", "真", "偽", "善", "悪", "安",
  "危", "生", "死", "男", "女", "父", "母", "子", "兄", "弟",
  "姉", "妹", "友", "敵", "王", "国", "天", "地", "山", "川",
  "海", "空", "雲", "雨", "雪", "風", "花", "木", "草", "石",
  "音", "色", "光", "力", "心", "手", "足", "目", "耳", "口",
  "頭", "体", "声", "言", "話", "書", "読", "見", "聞", "思",
  "考", "知", "学", "教", "文", "字", "紙", "本", "車", "道",
  "門", "家", "室", "店", "場", "所", "物", "品", "食", "飯",
  "肉", "魚", "米", "茶", "酒", "水", "火", "土", "金", "銀"
];

// Valid Kanji compounds (熟語) that can be formed using the above characters
// These are embedded into the board to ensure valid words exist
export const kanjiCompounds: string[] = [
  // 2-character compounds - common words
  "日本", "本人", "本日", "日中", "日月", "人口", "人生", "人物", "人手", "人体",
  "年月", "年金", "年中", "年内", "月日", "月光", "火山", "火力", "火口", "火花",
  "水中", "水道", "水力", "水門", "水上", "水下", "木目", "金色", "金魚", "金石",
  "土地", "土木", "土足", "一人", "一本", "一日", "一月", "一年", "一生", "一言",
  "一体", "一口", "一目", "一心", "一手", "一門", "二人", "二本", "三人", "三本",
  "四人", "五人", "六人", "七人", "八人", "九人", "十人", "大人", "大国", "大金",
  "大小", "大学", "大地", "大空", "大雨", "大雪", "大風", "大火", "大水", "大声",
  "大体", "大物", "大道", "大門", "大手", "小人", "小国", "小金", "小石", "小雨",
  "小川", "小山", "小声", "小学", "小道", "小物", "中国", "中心", "中学", "中古",
  "中火", "中道", "中日", "上下", "上手", "上人", "上空", "上体", "下手", "下火",
  "下水", "下道", "下山", "下車", "左右", "左手", "左足", "右手", "右足", "前後",
  "前日", "前月", "前年", "後日", "後年", "内外", "内心", "外国", "外人", "外道",
  "外見", "外食", "多少", "高山", "高所", "高声", "高空", "高低", "高音", "長所",
  "長男", "長女", "長話", "長年", "長短", "短所", "短気", "新人", "新年", "新月",
  "新書", "新茶", "新酒", "古人", "古道", "古本", "古文", "古物", "明日", "明文",
  "明暗", "明月", "明光", "暗色", "暗室", "強弱", "強力", "強火", "強風", "強気",
  "弱火", "弱気", "弱小", "弱音", "重大", "重心", "重力", "重体", "軽石", "軽音",
  "早口", "早足", "近日", "近道", "近所", "近年", "近海", "遠足", "遠道", "遠目",
  "遠山", "広大", "広場", "深海", "深山", "太字", "細道", "良心", "良日", "良品",
  "悪人", "悪口", "悪気", "悪心", "美人", "美文", "美声", "美食", "美女", "美男",
  "正月", "正道", "正門", "正体", "正文", "真中", "真心", "真水", "真空", "真人",
  "善人", "善悪", "善心", "安心", "安物", "生物", "生花", "生魚", "生肉", "生水",
  "生死", "生前", "生声", "生体", "死人", "死体", "死地", "死後", "男女", "男子",
  "男声", "男心", "女子", "女王", "女心", "女中", "父母", "父子", "父兄", "母子",
  "母国", "母体", "子女", "子音", "兄弟", "兄妹", "弟子", "姉妹", "友人", "友国",
  "敵国", "敵手", "王国", "王子", "王女", "王道", "王手", "国王", "国道", "国中",
  "国外", "国内", "国土", "国力", "天下", "天上", "天地", "天国", "天空", "天道",
  "天気", "天火", "天体", "天女", "地下", "地上", "地中", "地道", "地場", "地物",
  "山火", "山中", "山道", "山川", "山水", "山上", "山下", "山門", "山地", "山国",
  "川上", "川下", "川魚", "川口", "海中", "海道", "海外", "海上", "海水", "海魚",
  "海風", "空中", "空気", "空手", "空色", "空地", "雲中", "雲海", "雨水", "雨風",
  "雨天", "雪中", "雪国", "雪山", "雪道", "風雨", "風水", "風力", "花火", "花道",
  "花見", "草花", "草地", "草木", "石山", "石川", "石道", "石火", "石門", "音色",
  "音声", "音読", "色気", "色物", "色目", "光年", "光力", "光明", "力士", "力学",
  "心中", "心火", "心地", "心音", "手足", "手本", "手中", "手前", "手書", "手紙",
  "手話", "手力", "手車", "足音", "足下", "足場", "目上", "目下", "目前", "目力",
  "耳目", "口中", "口火", "口上", "口金", "頭上", "頭金", "体中", "体力", "体内",
  "声色", "声明", "声音", "言葉", "言明", "言外", "話中", "話声", "書物", "書道",
  "書中", "書体", "書店", "読書", "読物", "読本", "見物", "見所", "見本", "見聞",
  "見学", "見地", "思考", "考古", "知人", "知力", "学生", "学年", "学力", "文字",
  "文中", "文明", "文体", "文書", "文学", "字体", "本紙", "車道", "車中", "車体",
  "道中", "道場", "道草", "門下", "門前", "門外", "門中", "家内", "家中", "家道",
  "家人", "家風", "家門", "室内", "室外", "室中", "店内", "店外", "店中", "店頭",
  "場内", "場外", "場中", "場所", "所長", "所内", "物音", "物色", "物体", "物心",
  "品物", "品目", "食道", "食物", "食中", "食前", "食後", "食肉", "肉体", "肉食",
  "魚道", "魚肉", "米国", "茶道", "茶店", "茶色", "茶室", "酒道", "酒場", "酒店",
  "酒色", "銀色", "銀河",
  // 3-character compounds
  "日本人", "日本国", "大文字", "大中小", "上中下", "生年月", "頭文字", "天地人"
];

export const DIFFICULTIES: DifficultySettings = {
  EASY: { nameKey: 'difficulty.easy', rows: 4, cols: 4 },
  MEDIUM: { nameKey: 'difficulty.medium', rows: 5, cols: 5 },
  HARD: { nameKey: 'difficulty.hard', rows: 7, cols: 7 },
  EXPERT: { nameKey: 'difficulty.expert', rows: 9, cols: 9 },
  MASTER: { nameKey: 'difficulty.master', rows: 11, cols: 11 },
};

export const DEFAULT_DIFFICULTY = 'MEDIUM' as const;

// Recommended timer durations per difficulty (in seconds)
// Larger boards need more time to explore effectively
// Host can override these defaults
export const DIFFICULTY_TIMERS: Record<string, number> = {
  EASY: 60,     // 1 minute - small board, quick games
  MEDIUM: 60,   // 1 minute - default, fast-paced
  HARD: 120,    // 2 minutes - larger board
  EXPERT: 180,  // 3 minutes - large board, more searching
  MASTER: 240,  // 4 minutes - massive board, extensive exploration
};

export const DEFAULT_TIMER = 60; // 1 minute

// Get recommended timer for a difficulty level
export const getRecommendedTimer = (difficulty: string): number => {
  return DIFFICULTY_TIMERS[difficulty] || DEFAULT_TIMER;
};

// Adaptive deadzone threshold for directional locking
// Smaller threshold for more responsive selection
export const getDeadzoneThreshold = (): number => {
  if (typeof window === 'undefined') return 15;
  const screenWidth = window.innerWidth;
  if (screenWidth < 375) return 20;  // Small phones (iPhone SE)
  if (screenWidth < 414) return 18;  // Regular phones
  if (screenWidth < 768) return 15;  // Large phones
  return 12;                          // Tablets and desktop
};

// Minimum word length options
export const MIN_WORD_LENGTH_OPTIONS: MinWordLengthOption[] = [
  { value: 2, labelKey: 'hostView.minWordLength2' },
  { value: 3, labelKey: 'hostView.minWordLength3' },
  { value: 4, labelKey: 'hostView.minWordLength4' },
];

export const DEFAULT_MIN_WORD_LENGTH = 2;

// Avatar generation constants
// Used for fallback avatars when profile picture not available
export const AVATAR_COLORS: string[] = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#FF8FAB', '#6BCF7F', '#FFB347', '#9D84B7', '#FF6F61'
];

export const AVATAR_EMOJIS: string[] = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
  '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞'
];

// Neo-Brutalist color mapping based on word points
// Used for visual hierarchy in word displays
export const POINT_COLORS: Record<number, string> = {
  1: 'var(--neo-gray)',    // 2 letters (neutral, lowest value)
  2: 'var(--neo-cyan)',    // 3 letters
  3: 'var(--neo-cyan)',    // 4 letters
  4: 'var(--neo-orange)',  // 5 letters
  5: 'var(--neo-purple)',  // 6 letters
  6: 'var(--neo-purple)',  // 7 letters
  7: 'var(--neo-pink)',    // 8 letters
  8: 'var(--neo-pink)',    // 9+ letters (premium/rare)
};
