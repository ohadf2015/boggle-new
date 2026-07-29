/**
 * Coarse semantic "theme" for a Word Bridge puzzle — a SOFT, deterministic
 * disperser used to avoid placing two same-feel puzzles back-to-back.
 *
 * Players complained that consecutive puzzles "feel similar" even when the
 * bridge word differs (two food-ish puzzles, two nature-ish puzzles, ...).
 * Exact-bridge + word-stem dispersal can't catch that; a coarse theme can.
 *
 * This is intentionally heuristic and lightweight:
 *  - One primary theme per puzzle, inferred from a small lexicon of stems.
 *  - Precedence word1 → word2 → bridge → 'misc'. The player SEES word1 and
 *    word2 (the bridge is hidden), so the visible left word leads; the bridge
 *    is only a last-resort hint.
 *  - An explicit `theme` on the puzzle always wins over inference.
 *  - Unknown / abstract / non-English words resolve to 'misc', which the
 *    dispersers treat permissively (so non-EN pools are never made worse).
 *
 * It must stay PURE and deterministic: it feeds both the module-load level
 * ordering and the per-date daily picker, both of which must be reproducible.
 */

export type PuzzleTheme =
  | 'nature'
  | 'body'
  | 'food'
  | 'structure'
  | 'tool'
  | 'clothing'
  | 'misc';

/**
 * Theme → member stems (lowercase). Each stem belongs to exactly one theme.
 * Covers the common English stems in the pool plus a handful of transparent
 * es/sv ones; Hebrew/Japanese words simply fall through to 'misc'.
 *
 * When a stem could fit two themes we pick the one that best matches how the
 * word FEELS to a player skimming the board (e.g. nail → body, fish → nature,
 * cuff → clothing, egg → food).
 */
const THEME_STEMS: Record<Exclude<PuzzleTheme, 'misc'>, readonly string[]> = {
  nature: [
    'sea', 'sun', 'rain', 'snow', 'storm', 'tree', 'flower', 'grass', 'wood',
    'stone', 'moon', 'star', 'sand', 'cloud', 'wind', 'sky', 'leaf', 'root',
    'river', 'lake', 'ice', 'frost', 'fog', 'rock', 'earth', 'world', 'wave',
    'ocean', 'shore', 'bay', 'horse', 'bull', 'cow', 'cat', 'dog', 'bird',
    'fish', 'whale', 'bee', 'bear', 'lion', 'fox', 'wolf', 'shark', 'snake',
    'wing', 'sheep', 'pig', 'hen', 'duck', 'goose', 'pine', 'palm', 'oak',
    'bug', 'ant', 'worm', 'frog', 'owl', 'deer', 'goat', 'mouse', 'rat',
    'crab', 'petal', 'thunder', 'lightning',
    // es / sv transparent
    'sol', 'mar', 'flor', 'perro', 'gato', 'pez', 'caballo', 'oso', 'ola',
    'hav', 'regn', 'blom', 'träd', 'hund', 'katt', 'häst', 'björn', 'gran',
    'ros', 'gås', 'rayos', 'piedra',
    // he — sea/sun/tree/garden/seasons/bird (top-frequency pool tokens)
    'ים', 'עץ', 'גן', 'שמש', 'לילה', 'חורף', 'קיץ', 'ציפור', 'מים', 'אדמה',
    // ja — sun/water/mountain/river/tree/fire/fish/flower/rain/sky
    '日', '水', '山', '川', '木', '火', '魚', '花', '雨', '空', '星', '雪',
  ],
  body: [
    'eye', 'hand', 'foot', 'head', 'hair', 'tooth', 'finger', 'nail', 'brow',
    'shoulder', 'bone', 'heart', 'belly', 'arm', 'knee', 'ear', 'thumb',
    'skin', 'blood', 'chin', 'lip', 'nose', 'neck', 'face', 'cheek', 'jaw',
    'rib', 'hip', 'wrist', 'ankle', 'leg', 'toe', 'vein', 'brain', 'mouth',
    'tongue', 'throat', 'waist', 'elbow', 'heel', 'spine', 'gut',
    // es / sv
    'mano', 'ojo', 'pie', 'cabeza', 'uña', 'diente', 'hueso', 'corazon',
    'lengua', 'cara', 'pierna', 'brazo', 'cuello', 'öga', 'huvud', 'tand',
    'hjärta', 'hår', 'manos', 'ojos', 'boca', 'lenguas',
    // he — head/hand/foot/eye/eyes/mouth/heart
    'ראש', 'יד', 'רגל', 'עין', 'עיניים', 'פה', 'לב', 'אוזן', 'אף',
    // ja — hand/body/eye/mouth/head/heart/foot/ear
    '手', '体', '目', '口', '頭', '心', '足', '耳', '鼻', '歯',
  ],
  food: [
    'apple', 'butter', 'cup', 'cake', 'milk', 'honey', 'corn', 'bread',
    'sauce', 'spoon', 'egg', 'salt', 'sugar', 'pie', 'cheese', 'meat', 'soup',
    'rice', 'bean', 'nut', 'jam', 'tea', 'coffee', 'wine', 'beer', 'fruit',
    'berry', 'candy', 'cookie', 'cream', 'dough', 'flour', 'oat', 'pea',
    'pepper', 'bacon', 'ham', 'lemon', 'lime', 'plum', 'grape', 'melon',
    'peach', 'cherry', 'mango', 'banana', 'oil', 'syrup', 'mint', 'toast',
    'roll', 'bun', 'pizza', 'pasta', 'noodle', 'curry', 'fork', 'kettle',
    // es / sv
    'pan', 'leche', 'queso', 'carne', 'sopa', 'arroz', 'huevo', 'azucar',
    'vino', 'cafe', 'café', 'fruta', 'manzana', 'bröd', 'mjölk', 'ost', 'kött',
    'kaka', 'sås', 'ägg', 'socker', 'saft', 'peppar', 'platos', 'plato',
    'cerveza', 'hielo',
    // he — coffee/meal/cup/wine/cake(of)/milk/slice(of)/bread
    'קפה', 'ארוחת', 'כוס', 'יין', 'עוגת', 'חלב', 'פרוסת', 'לחם', 'בשר', 'מאפה',
    // ja — eat/rice/tea/meat/drink
    '食', '米', '茶', '肉', '飲',
  ],
  structure: [
    'house', 'ship', 'wall', 'door', 'gate', 'board', 'room', 'port', 'road',
    'field', 'yard', 'shop', 'store', 'bridge', 'rail', 'market', 'post',
    'station', 'tower', 'castle', 'barn', 'shed', 'fence', 'roof', 'floor',
    'stair', 'window', 'hall', 'mall', 'bank', 'church', 'school', 'office',
    'hotel', 'garage', 'dock', 'pier', 'street', 'lane', 'path', 'track',
    'tunnel', 'dam', 'well', 'mill', 'hut', 'cabin', 'lodge', 'palace',
    'temple', 'arch', 'brick', 'tile', 'deck', 'ramp', 'fort', 'home',
    // es / sv
    'casa', 'calle', 'puerta', 'muro', 'torre', 'tienda', 'hus', 'vägg',
    'dörr', 'väg', 'tak', 'gata', 'torn', 'hylla', 'mesa',
    // he — house/station(of)/door/entrance/room/court/train/table
    'בית', 'תחנת', 'דלת', 'כניסה', 'חדר', 'מגרש', 'רכבת', 'שולחן', 'גשר',
    // ja — road/path/shop/car/school/city/place/shop/station
    '道', '路', '屋', '車', '校', '市', '場', '店', '駅', '館',
  ],
  tool: [
    'saw', 'knife', 'screw', 'pick', 'pen', 'hook', 'bell', 'comb', 'key',
    'hammer', 'pin', 'drill', 'axe', 'blade', 'wrench', 'rope', 'chain',
    'wire', 'clip', 'hose', 'gear', 'spring', 'lever', 'switch', 'plug',
    'bolt', 'rod', 'stick', 'wheel', 'brush', 'ruler', 'needle', 'thread',
    'spade', 'rake', 'shovel', 'spanner', 'vise', 'nut', 'gauge', 'crank',
    // es / sv
    'clavo', 'llave', 'sierra', 'gancho', 'martillo', 'kniv', 'nyckel',
    'krok', 'hammare', 'spik',
    // he — computer/bottle/TV/clock/screen/ticket/paper/key/bag/book
    'מחשב', 'בקבוק', 'טלוויזיה', 'שעון', 'מסך', 'כרטיס', 'נייר', 'מפתח',
    'שקית', 'ספר', 'מצלמה',
    // ja — electric/paper/key/machine/pen
    '電', '紙', '鍵', '機', '筆',
  ],
  clothing: [
    'shoe', 'ring', 'bow', 'tie', 'cap', 'cuff', 'button', 'hat', 'coat',
    'sock', 'glove', 'shirt', 'pant', 'dress', 'skirt', 'scarf', 'belt',
    'boot', 'vest', 'jacket', 'sleeve', 'collar', 'hood', 'robe', 'gown',
    'suit', 'jeans', 'cloak', 'mitten', 'slipper', 'sandal', 'zipper', 'lace',
    'pocket', 'hem', 'cape', 'apron', 'helmet', 'crown',
    // es / sv
    'zapato', 'anillo', 'sombrero', 'bota', 'botas', 'camisa', 'guante', 'sko',
    'hatt', 'mössa', 'skjorta', 'stövel',
    // he — shoe/hat/shirt/coat/sock
    'נעל', 'כובע', 'חולצה', 'מעיל', 'גרב',
    // ja — clothes/hat/shoe
    '服', '帽', '靴',
  ],
};

/** Inverted lookup: stem → theme. Built once at module load. */
const STEM_TO_THEME: ReadonlyMap<string, PuzzleTheme> = (() => {
  const m = new Map<string, PuzzleTheme>();
  for (const theme of Object.keys(THEME_STEMS) as Exclude<PuzzleTheme, 'misc'>[]) {
    for (const stem of THEME_STEMS[theme]) {
      // First definition wins — keep authored order authoritative.
      if (!m.has(stem)) m.set(stem, theme);
    }
  }
  return m;
})();

function lookup(word: string | undefined): PuzzleTheme | null {
  if (!word) return null;
  return STEM_TO_THEME.get(word.toLowerCase()) ?? null;
}

/**
 * Resolve the coarse theme for a puzzle. Explicit `theme` wins; otherwise infer
 * from word1 → word2 → bridge; falls back to 'misc'.
 */
export function inferTheme(p: {
  word1: string;
  word2: string;
  bridge: string;
  theme?: PuzzleTheme;
}): PuzzleTheme {
  if (p.theme) return p.theme;
  return lookup(p.word1) ?? lookup(p.word2) ?? lookup(p.bridge) ?? 'misc';
}
