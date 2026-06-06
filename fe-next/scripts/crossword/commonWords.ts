/**
 * Curated COMMON words for crossword seed generation. The game's main dictionary is a Boggle
 * validity list (415k EN words incl. obscure/archaic) — great for solvability, terrible for a
 * clueable, fun crossword. The CSP is fed THIS pool instead so generated grids contain words
 * players actually know. Every word here is also validated against the real dictionary at
 * generation time, so nothing un-submittable can appear.
 *
 * Keep entries common, neutral, 3–5 letters. Extend freely.
 */

export const COMMON_EN: string[] = [
  // 3
  'cat', 'dog', 'sun', 'sea', 'sky', 'ice', 'art', 'ace', 'arm', 'ear',
  'eat', 'tea', 'ten', 'net', 'nap', 'map', 'tap', 'top', 'pot', 'pet',
  'pen', 'pan', 'pin', 'pie', 'tie', 'toe', 'oak', 'owl', 'ant', 'bee',
  'bat', 'bar', 'bad', 'bag', 'big', 'bus', 'cup', 'car', 'cap', 'cab',
  'cow', 'dot', 'day', 'dry', 'ear', 'egg', 'elf', 'end', 'fan', 'far',
  'fig', 'fit', 'fox', 'fun', 'gas', 'gem', 'gum', 'hat', 'hen', 'hot',
  'ink', 'jam', 'jar', 'jet', 'key', 'kid', 'kit', 'lap', 'leg', 'lip',
  'log', 'mad', 'man', 'mat', 'mud', 'mug', 'nut', 'oar', 'oat', 'odd',
  'oil', 'one', 'owe', 'pad', 'paw', 'pea', 'pig', 'ear', 'rag', 'ram',
  'rat', 'red', 'rib', 'rim', 'rip', 'rod', 'row', 'rug', 'run', 'sad',
  'sit', 'six', 'ski', 'sob', 'son', 'spa', 'sum', 'tag', 'tan', 'tar',
  'tax', 'toy', 'tub', 'van', 'wax', 'web', 'wet', 'wig', 'win', 'yak',
  'yes', 'zip', 'zoo', 'are', 'eve', 'ore', 'use', 'age', 'ago', 'aid',
  'aim', 'air', 'ash', 'ask', 'bay', 'bed', 'bet', 'bin', 'bit', 'bow',
  'box', 'boy', 'cut', 'den', 'dim', 'dip', 'ebb', 'elk', 'era', 'fin',
  // 4
  'lake', 'rain', 'snow', 'star', 'moon', 'tree', 'leaf', 'rose', 'fish', 'bird',
  'bear', 'lion', 'wolf', 'frog', 'deer', 'goat', 'duck', 'crab', 'seal', 'mole',
  'cake', 'milk', 'rice', 'soup', 'corn', 'bean', 'pear', 'plum', 'lime', 'mint',
  'door', 'roof', 'wall', 'desk', 'lamp', 'sofa', 'bowl', 'fork', 'cup', 'dish',
  'road', 'park', 'shop', 'café', 'farm', 'city', 'town', 'home', 'room', 'gate',
  'blue', 'pink', 'gold', 'grey', 'ruby', 'jade', 'teal', 'cyan',
  'open', 'shut', 'fast', 'slow', 'cold', 'warm', 'soft', 'hard', 'good', 'kind',
  'cool', 'calm', 'busy', 'easy', 'tidy', 'neat', 'rich', 'wise', 'bold', 'glad',
  'walk', 'jump', 'swim', 'read', 'sing', 'cook', 'draw', 'play', 'work', 'rest',
  'gift', 'note', 'song', 'tale', 'poem', 'film', 'game', 'team', 'goal', 'race',
  'time', 'date', 'week', 'year', 'noon', 'dawn', 'dusk', 'tide', 'wave', 'wind',
  'east', 'west', 'main', 'edge', 'core', 'peak', 'path', 'trip', 'tour', 'ride',
  'idea', 'plan', 'fact', 'rule', 'name', 'word', 'page', 'line', 'list', 'menu',
  // 5
  'apple', 'grape', 'lemon', 'mango', 'peach', 'berry', 'melon', 'olive', 'onion', 'wheat',
  'beach', 'cloud', 'river', 'ocean', 'storm', 'field', 'grass', 'plant', 'stone', 'earth',
  'tiger', 'horse', 'sheep', 'mouse', 'snake', 'whale', 'shark', 'eagle', 'robin', 'zebra',
  'chair', 'table', 'house', 'plate', 'spoon', 'clock', 'phone', 'piano', 'brush', 'knife',
  'happy', 'green', 'white', 'black', 'brown', 'sweet', 'fresh', 'clean', 'quiet', 'brave',
  'smile', 'laugh', 'dance', 'dream', 'paint', 'write', 'learn', 'teach', 'build', 'climb',
  'water', 'light', 'music', 'sound', 'color', 'space', 'world', 'place', 'story', 'image',
  'north', 'south', 'today', 'night', 'month', 'first', 'third', 'sixth', 'early', 'later',
  'heart', 'brain', 'hands', 'voice', 'sense', 'power', 'magic', 'peace', 'truth', 'trust',
  'train', 'plane', 'truck', 'wheel', 'route', 'cabin', 'tower', 'house', 'plaza', 'court',
];

// Common Hebrew words (3–5 letters, no niqqud, regular forms). Kept basic and neutral; all are
// re-validated against the real Hebrew dictionary at generation time. Marked for admin QA.
export const COMMON_HE: string[] = [
  // 3
  'אור', 'יום', 'מים', 'איש', 'ילד', 'גשם', 'רוח', 'שמש', 'ירח', 'עץ',
  'פרי', 'דרך', 'בית', 'דלת', 'חלב', 'לחם', 'דבש', 'ביצ', 'תות', 'גזר',
  'כלב', 'חתל', 'אריה', 'דוב', 'דג', 'צבי', 'נמר', 'עז', 'פיל', 'סוס',
  'ראש', 'יד', 'רגל', 'אוז', 'עין', 'אזן', 'פה', 'אף', 'לב', 'דם',
  'ספר', 'עט', 'דף', 'שיר', 'סוד', 'חבר', 'אמא', 'אבא', 'אח', 'דוד',
  // 3 (more common nouns/verbs — re-validated against the dict at gen time)
  'חום', 'קור', 'קיר', 'סיר', 'חול', 'שלג', 'כוס', 'נוף', 'גוף', 'סוף',
  'עוף', 'אגס', 'נחש', 'קוף', 'תוף', 'חוף', 'שום', 'לוח', 'כוח', 'מוח',
  'צום', 'תור', 'עור', 'עיר', 'חבל', 'גבר', 'זהב', 'ברז', 'פרח', 'קמח',
  'בצל', 'רכב', 'ענף', 'גזע', 'זרע', 'חרב', 'קשת', 'דלק', 'מרק', 'פול',
  'נמל', 'גמל', 'דבר', 'יער', 'נהר', 'אגם', 'הרי', 'שדה', 'גשר', 'ים',
  // 4
  'שמים', 'ארץ', 'הרים', 'נהר', 'אגם', 'יער', 'פרח', 'עלה', 'ענן', 'ברק',
  'כוכב', 'בוקר', 'ערב', 'לילה', 'אביב', 'קיץ', 'סתיו', 'חורף', 'שבוע', 'חודש',
  'שולח', 'כסא', 'מיטה', 'דלת', 'חלון', 'מנורה', 'כוס', 'צלחת', 'מזלג', 'סכין',
  'כביש', 'גינה', 'חנות', 'שדה', 'עיר', 'כפר', 'חדר', 'בית', 'גשר', 'מגדל',
  // 5
  'תפוח', 'ענבים', 'לימון', 'אבטיח', 'תפוז', 'בננה', 'גזר', 'בצל', 'חיטה', 'זית',
  'אריות', 'נמרים', 'סוסים', 'דגים', 'ציפור', 'נשרים', 'דובים', 'זאבים', 'צבים', 'פילים',
  'כסאות', 'שולחן', 'מנורה', 'מקרר', 'תמונה', 'מוזיקה', 'צבעים', 'חלום', 'שלום', 'אמת',
];
