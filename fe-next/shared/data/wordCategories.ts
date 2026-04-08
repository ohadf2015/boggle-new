/**
 * Word Categories for Word Hunt
 * Maps common English words to semantic categories for category hints.
 */

export const ALL_CATEGORIES = [
  'animals', 'food', 'nature', 'objects', 'actions',
  'colors', 'body', 'clothes', 'home', 'weather',
] as const;

export type WordCategory = (typeof ALL_CATEGORIES)[number];

export const CATEGORY_EMOJIS: Record<string, string> = {
  animals: '\uD83D\uDC3E', // 🐾
  food: '\uD83C\uDF7D\uFE0F', // 🍽️
  nature: '\uD83C\uDF3F', // 🌿
  objects: '\uD83D\uDCE6', // 📦
  actions: '\u26A1', // ⚡
  colors: '\uD83C\uDFA8', // 🎨
  body: '\uD83E\uDEC0', // 🫀
  clothes: '\uD83D\uDC54', // 👔
  home: '\uD83C\uDFE0', // 🏠
  weather: '\u26C5', // ⛅
};

const CATEGORY_WORDS: Record<string, string[]> = {
  animals: [
    'ant', 'ape', 'bat', 'bear', 'bee', 'bird', 'boar', 'buck', 'bull', 'calf',
    'cat', 'clam', 'cod', 'colt', 'cow', 'crab', 'crow', 'deer', 'dog', 'dove',
    'duck', 'eagle', 'eel', 'elk', 'ewe', 'fawn', 'fish', 'flea', 'fly', 'foal',
    'fox', 'frog', 'goat', 'goose', 'hare', 'hawk', 'hen', 'hog', 'horse', 'lamb',
    'lark', 'lion', 'lynx', 'mare', 'mice', 'mink', 'mole', 'moth', 'mouse', 'mule',
    'newt', 'owl', 'ox', 'pig', 'pony', 'puma', 'ram', 'rat', 'raven', 'seal',
    'shark', 'sheep', 'slug', 'snail', 'snake', 'stork', 'swan', 'toad', 'trout',
    'tuna', 'viper', 'wasp', 'whale', 'wolf', 'worm', 'wren', 'yak', 'zebra',
  ],
  food: [
    'apple', 'bacon', 'bagel', 'bean', 'beef', 'berry', 'bread', 'bun', 'cake',
    'candy', 'cheese', 'cherry', 'chip', 'chop', 'clam', 'cocoa', 'corn', 'cream',
    'curry', 'date', 'dough', 'egg', 'figs', 'flour', 'fruit', 'grape', 'gravy',
    'ham', 'honey', 'jam', 'jerky', 'juice', 'kale', 'lamb', 'lemon', 'lime',
    'mango', 'maple', 'meat', 'melon', 'milk', 'mint', 'muffin', 'naan', 'nuts',
    'oats', 'olive', 'onion', 'pasta', 'peach', 'pear', 'pie', 'pizza', 'plum',
    'pork', 'prawn', 'rice', 'roast', 'salad', 'salt', 'sauce', 'soup', 'spice',
    'steak', 'stew', 'sugar', 'sushi', 'syrup', 'taco', 'toast', 'wheat', 'yam',
  ],
  nature: [
    'bark', 'bay', 'beach', 'bloom', 'bog', 'brook', 'bud', 'bush', 'cave', 'clay',
    'cliff', 'coast', 'coral', 'creek', 'dale', 'delta', 'dew', 'dirt', 'dune',
    'earth', 'fern', 'field', 'flora', 'fog', 'ford', 'frost', 'gale', 'glen',
    'grass', 'grove', 'gulf', 'hay', 'heath', 'herb', 'hill', 'ivy', 'jade',
    'kelp', 'lake', 'leaf', 'marsh', 'mesa', 'mist', 'moon', 'moss', 'mud',
    'oasis', 'ocean', 'palm', 'path', 'peak', 'peat', 'pine', 'plain', 'plant',
    'pond', 'rain', 'reef', 'ridge', 'river', 'rock', 'root', 'rose', 'sand',
    'seed', 'shore', 'shrub', 'sky', 'snow', 'soil', 'star', 'stem', 'stone',
    'storm', 'sun', 'swamp', 'thorn', 'tide', 'tree', 'vale', 'vine', 'wave',
    'weed', 'wind', 'wood',
  ],
  objects: [
    'axe', 'bag', 'ball', 'band', 'bar', 'bell', 'belt', 'blade', 'block', 'board',
    'bolt', 'bone', 'book', 'bowl', 'box', 'brick', 'brush', 'cage', 'can', 'card',
    'chain', 'chest', 'clock', 'cloth', 'coin', 'cord', 'crate', 'cup', 'dart',
    'dial', 'disc', 'dish', 'door', 'drum', 'fan', 'flag', 'flask', 'fork', 'frame',
    'gear', 'gem', 'glass', 'globe', 'glue', 'grip', 'grill', 'harp', 'hook', 'horn',
    'jar', 'key', 'knob', 'knot', 'lamp', 'lens', 'lid', 'lock', 'map', 'mask',
    'mat', 'nail', 'net', 'pad', 'pan', 'peg', 'pen', 'pin', 'pipe', 'plate',
    'plug', 'pole', 'pot', 'pump', 'rack', 'rail', 'ring-3', 'rod', 'rope', 'rug',
    'sack', 'scale', 'seal', 'shelf', 'sign', 'slab', 'slot', 'spool', 'stamp',
    'stick', 'strap', 'string', 'tab', 'tag', 'tape', 'tile', 'tin', 'tool', 'tray',
    'tube', 'vase', 'vent', 'vest', 'wand', 'wheel', 'wire',
  ],
  actions: [
    'bark', 'bash', 'bend', 'bite', 'blow', 'bolt', 'bump', 'burn', 'buzz', 'carve',
    'catch', 'chase', 'chop', 'clap', 'climb', 'clip', 'crush', 'curl', 'cut',
    'dash', 'dig', 'dive', 'dodge', 'drag', 'draw', 'drift', 'drill', 'drink',
    'drip', 'drop', 'dump', 'fling', 'flip', 'float', 'fly', 'fold', 'grab',
    'grind', 'gulp', 'hike', 'hit', 'hop', 'hug', 'hunt', 'hurl', 'jab', 'jog',
    'jump', 'kick', 'kneel', 'knit', 'lean', 'leap', 'lick', 'lift', 'limp',
    'march', 'mix', 'mow', 'nod', 'pack', 'paint', 'peel', 'pick', 'pinch',
    'pluck', 'poke', 'pour', 'press', 'pull', 'punch', 'push', 'race', 'rip',
    'roar', 'roll', 'row', 'rub', 'run', 'rush', 'saw', 'scrub', 'shake', 'shove',
    'sink', 'skip', 'slam', 'slap', 'slash', 'slide', 'slip', 'smash', 'snap',
    'snip', 'soak', 'spin', 'splash', 'sprint', 'squeeze', 'stack', 'stir',
    'stomp', 'strike', 'stuff', 'surf', 'sweep', 'swim', 'swing', 'tilt', 'toss',
    'trip', 'tug', 'twist', 'wag', 'walk', 'wave', 'whip', 'wink', 'wrap', 'yank',
  ],
  colors: [
    'amber', 'aqua', 'beige', 'black', 'blue', 'blush', 'brown', 'coral', 'cream',
    'crimson', 'cyan', 'fawn', 'gold', 'gray', 'green', 'grey', 'hazel', 'ivory',
    'jade', 'khaki', 'lilac', 'lime', 'mauve', 'navy', 'olive', 'peach', 'pearl',
    'pink', 'plum', 'red', 'rose', 'ruby', 'rust', 'sage', 'sand', 'scarlet',
    'silver', 'slate', 'tan', 'teal', 'violet', 'white', 'wine', 'yellow',
  ],
  body: [
    'ankle', 'arm', 'back', 'bone', 'brain', 'brow', 'cheek', 'chest', 'chin',
    'ear', 'elbow', 'eye', 'face', 'fist', 'foot', 'gum', 'gut', 'hair', 'hand',
    'head', 'heart', 'heel', 'hip', 'jaw', 'joint', 'knee', 'leg', 'limb', 'lip',
    'lung', 'mouth', 'muscle', 'nail', 'neck', 'nerve', 'nose', 'palm', 'rib',
    'scalp', 'shin', 'skull', 'spine', 'thumb', 'toe', 'tongue', 'tooth', 'vein',
    'waist', 'wrist',
  ],
  clothes: [
    'belt', 'beret', 'blouse', 'boot', 'cap', 'cape', 'cloak', 'coat', 'dress',
    'glove', 'gown', 'hat', 'hood', 'jeans', 'kilt', 'lace', 'mask', 'mitt',
    'pants', 'robe', 'sash', 'scarf', 'shirt', 'shoe', 'shorts', 'skirt', 'sleeve',
    'slip', 'sock', 'suit', 'tie', 'tunic', 'vest', 'wrap',
  ],
  home: [
    'attic', 'bath', 'bed', 'bench', 'blind', 'broom', 'bulb', 'carpet', 'chair',
    'couch', 'crib', 'desk', 'drain', 'drape', 'fence', 'floor', 'gate', 'grill',
    'hall', 'hearth', 'hinge', 'knob', 'lamp', 'lawn', 'lock', 'mat', 'mirror',
    'mop', 'oven', 'patio', 'porch', 'quilt', 'ramp', 'roof', 'shelf', 'sink',
    'sofa', 'stair', 'stool', 'stove', 'table', 'tap', 'tiles', 'towel', 'tub',
    'wall', 'window', 'yard',
  ],
  weather: [
    'blaze', 'blizzard', 'bolt', 'breeze', 'calm', 'chill', 'cloud', 'cold',
    'cool', 'dew', 'draft', 'drizzle', 'drought', 'dusk', 'flood', 'fog', 'frost',
    'gale', 'gust', 'hail', 'haze', 'heat', 'humid', 'ice', 'mist', 'muggy',
    'rain', 'sleet', 'slush', 'smog', 'snow', 'squall', 'steam', 'storm', 'sun',
    'surge', 'thaw', 'thunder', 'warm', 'wind',
  ],
};

// Build reverse lookup: word -> category (first match wins)
const wordToCategory = new Map<string, string>();
for (const [category, words] of Object.entries(CATEGORY_WORDS)) {
  for (const word of words) {
    const lower = word.toLowerCase();
    if (!wordToCategory.has(lower)) {
      wordToCategory.set(lower, category);
    }
  }
}

/**
 * Look up the semantic category for a word.
 * Returns the category key or null if not categorized.
 */
export function getCategoryForWord(word: string): string | null {
  return wordToCategory.get(word.toLowerCase()) ?? null;
}

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  en: {
    animals: 'animal',
    food: 'food item',
    nature: 'nature word',
    objects: 'object',
    actions: 'action',
    colors: 'color',
    body: 'body part',
    clothes: 'clothing',
    home: 'household item',
    weather: 'weather word',
  },
  he: {
    animals: '\u05D7\u05D9\u05D4',
    food: '\u05DE\u05D0\u05DB\u05DC',
    nature: '\u05D8\u05D1\u05E2',
    objects: '\u05D7\u05E4\u05E5',
    actions: '\u05E4\u05E2\u05D5\u05DC\u05D4',
    colors: '\u05E6\u05D1\u05E2',
    body: '\u05D0\u05D9\u05D1\u05E8 \u05D2\u05D5\u05E3',
    clothes: '\u05D1\u05D2\u05D3',
    home: '\u05E4\u05E8\u05D9\u05D8 \u05D1\u05D9\u05EA',
    weather: '\u05DE\u05D6\u05D2 \u05D0\u05D5\u05D5\u05D9\u05E8',
  },
  sv: {
    animals: 'djur',
    food: 'mat',
    nature: 'natur',
    objects: 'f\u00F6rem\u00E5l',
    actions: 'handling',
    colors: 'f\u00E4rg',
    body: 'kroppsdel',
    clothes: 'kl\u00E4der',
    home: 'hush\u00E5ll',
    weather: 'v\u00E4der',
  },
  ja: {
    animals: '\u52D5\u7269',
    food: '\u98DF\u3079\u7269',
    nature: '\u81EA\u7136',
    objects: '\u7269',
    actions: '\u884C\u52D5',
    colors: '\u8272',
    body: '\u4F53\u306E\u90E8\u4F4D',
    clothes: '\u8863\u670D',
    home: '\u5BB6\u5EAD\u7528\u54C1',
    weather: '\u5929\u6C17',
  },
  es: {
    animals: 'animal',
    food: 'alimento',
    nature: 'naturaleza',
    objects: 'objeto',
    actions: 'acci\u00F3n',
    colors: 'color',
    body: 'parte del cuerpo',
    clothes: 'ropa',
    home: 'art\u00EDculo del hogar',
    weather: 'clima',
  },
};

/**
 * Get the localized display label for a category.
 * Falls back to English, then to generic "word".
 */
export function getCategoryLabel(category: string, locale: string): string {
  const lang = locale.split('-')[0].split('_')[0];
  return CATEGORY_LABELS[lang]?.[category]
    ?? CATEGORY_LABELS.en?.[category]
    ?? 'word';
}
