// Game constants - ported from fe-next/utils/consts.js
import { Dimensions } from 'react-native';

export const hebrewLetters = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
  "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת",
];

export const englishLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const swedishLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('');

export const japaneseLetters = [
  // Common kanji for word games
  "日", "本", "人", "年", "月", "火", "水", "木", "金", "土",
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "大", "小", "中", "上", "下", "左", "右", "前", "後", "内",
  "外", "多", "少", "高", "低", "長", "短", "新", "古", "明",
  "暗", "強", "弱", "重", "軽", "早", "遅", "近", "遠", "広",
  "狭", "深", "浅", "太", "細", "厚", "薄", "硬", "柔", "良",
  "悪", "美", "醜", "正", "誤", "真", "偽", "善", "安", "危",
  "生", "死", "男", "女", "父", "母", "子", "兄", "弟", "姉",
  "妹", "友", "敵", "王", "国", "天", "地", "山", "川", "海",
  "空", "雲", "雨", "雪", "風", "花", "草", "石", "音", "色",
  "光", "力", "心", "手", "足", "目", "耳", "口", "頭", "体",
  "声", "言", "話", "書", "読", "見", "聞", "思", "考", "知",
  "学", "教", "文", "字", "紙", "車", "道", "門", "家", "室",
  "店", "場", "所", "物", "品", "食", "飯", "肉", "魚", "米",
  "茶", "酒", "銀"
];

export interface Difficulty {
  nameKey: string;
  rows: number;
  cols: number;
}

export const DIFFICULTIES: Record<string, Difficulty> = {
  EASY: { nameKey: 'difficulty.easy', rows: 4, cols: 4 },
  MEDIUM: { nameKey: 'difficulty.medium', rows: 5, cols: 5 },
  HARD: { nameKey: 'difficulty.hard', rows: 7, cols: 7 },
  EXPERT: { nameKey: 'difficulty.expert', rows: 9, cols: 9 },
  MASTER: { nameKey: 'difficulty.master', rows: 11, cols: 11 },
};

export const DEFAULT_DIFFICULTY = 'HARD';

// Adaptive deadzone threshold for gesture detection
export const getDeadzoneThreshold = (): number => {
  const { width } = Dimensions.get('window');
  if (width < 375) return 20;   // Small phones (iPhone SE)
  if (width < 414) return 18;   // Regular phones
  if (width < 768) return 15;   // Large phones
  return 12;                     // Tablets
};

// Minimum word length options
export const MIN_WORD_LENGTH_OPTIONS = [
  { value: 2, labelKey: 'hostView.minWordLength2' },
  { value: 3, labelKey: 'hostView.minWordLength3' },
  { value: 4, labelKey: 'hostView.minWordLength4' },
];

export const DEFAULT_MIN_WORD_LENGTH = 2;

// Socket connection config
export const SOCKET_CONFIG = {
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  timeout: 20000,
};

// Game timer defaults
export const DEFAULT_TIMER_SECONDS = 180;
export const TIMER_WARNING_THRESHOLD = 20;

// Supported languages
export type SupportedLanguage = 'en' | 'he' | 'sv' | 'ja';
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'he', 'sv', 'ja'];

// Color theme (Neo-Brutalist - matching fe-next/app/globals.css)
export const COLORS = {
  // Neo-Brutalist Color Palette
  neoYellow: '#FFE135',
  neoYellowHover: '#FFD000',
  neoOrange: '#FF6B35',
  neoOrangeHover: '#FF5722',
  neoPink: '#FF1493',
  neoPinkLight: '#FF69B4',
  neoPurple: '#4a1c6a',
  neoPurpleLight: '#6b2d8c',
  neoNavy: '#1a1a2e',
  neoNavyLight: '#16213e',
  neoCyan: '#00FFFF',
  neoCyanMuted: '#4dd9d9',
  neoLime: '#BFFF00',
  neoRed: '#FF3366',
  neoCream: '#FFFEF0',
  neoBlack: '#000000',
  neoWhite: '#FFFFFF',
  neoGray: '#2d2d44',
  // Semantic colors
  success: '#22C55E',
  warning: '#FBBF24',
  error: '#FF3366', // Using neoRed
};
