export const hebrewLetters = [
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

export const DIFFICULTIES = {
  EASY: { nameKey: 'difficulty.easy', rows: 4, cols: 4 },
  MEDIUM: { nameKey: 'difficulty.medium', rows: 5, cols: 5 },
  HARD: { nameKey: 'difficulty.hard', rows: 7, cols: 7 },
  EXPERT: { nameKey: 'difficulty.expert', rows: 9, cols: 9 },
  MASTER: { nameKey: 'difficulty.master', rows: 11, cols: 11 },
};

export const DEFAULT_DIFFICULTY = 'HARD';
  