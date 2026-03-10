/**
 * Curated list of ~500 common English words (3-8 letters).
 * Sorted alphabetically for binary search. All lowercase.
 */
export const WORD_LIST: string[] = [
  'ace', 'act', 'add', 'age', 'ago', 'aid', 'aim', 'air', 'ale', 'all',
  'and', 'ant', 'ape', 'arc', 'are', 'ark', 'arm', 'art', 'ash', 'ask',
  'ate', 'awe', 'axe', 'back', 'bade', 'bake', 'bale', 'ball', 'band',
  'bane', 'bank', 'bare', 'bark', 'barn', 'base', 'bash', 'bask', 'bat',
  'bath', 'bead', 'beam', 'bean', 'bear', 'beat', 'bed', 'been', 'beer',
  'bell', 'belt', 'bend', 'best', 'bid', 'big', 'bind', 'bird', 'bit',
  'bite', 'blade', 'blame', 'blank', 'blast', 'blaze', 'bleat', 'bleed',
  'blend', 'bless', 'blind', 'bliss', 'block', 'blood', 'bloom', 'blown',
  'blue', 'blur', 'board', 'boast', 'boat', 'bold', 'bolt', 'bond',
  'bone', 'book', 'bore', 'born', 'both', 'bound', 'bow', 'bowl', 'box',
  'brain', 'brake', 'brand', 'brave', 'bread', 'break', 'breed', 'brick',
  'bride', 'brief', 'bring', 'broad', 'broke', 'brook', 'brown', 'brush',
  'build', 'built', 'bulk', 'burn', 'burst', 'bus', 'bush', 'busy',
  'cab', 'cage', 'cake', 'call', 'calm', 'came', 'camp', 'can', 'cap',
  'cape', 'card', 'care', 'cart', 'case', 'cash', 'cast', 'cat', 'catch',
  'cave', 'chair', 'chalk', 'champ', 'chance', 'change', 'charm', 'chart',
  'chase', 'cheap', 'check', 'cheek', 'cheer', 'chess', 'chest', 'chief',
  'child', 'chill', 'chin', 'chip', 'choir', 'chop', 'chunk', 'claim',
  'clam', 'clap', 'clash', 'clasp', 'class', 'claw', 'clay', 'clean',
  'clear', 'clerk', 'cliff', 'climb', 'cling', 'clip', 'cloak', 'clock',
  'clone', 'close', 'cloth', 'cloud', 'club', 'clue', 'coal', 'coast',
  'coat', 'code', 'coin', 'cold', 'colt', 'come', 'cone', 'cook',
  'cool', 'cope', 'copy', 'cord', 'core', 'cork', 'corn', 'cost',
  'couch', 'could', 'count', 'couple', 'court', 'cover', 'crack',
  'craft', 'crane', 'crash', 'crawl', 'cream', 'create', 'creek',
  'crest', 'crew', 'crime', 'crisp', 'crop', 'cross', 'crowd', 'crown',
  'crush', 'cry', 'cup', 'cure', 'curl', 'cut', 'cycle',
  'dale', 'dame', 'damp', 'dance', 'dare', 'dark', 'dart', 'dash',
  'date', 'dawn', 'deal', 'dear', 'debt', 'deck', 'deed', 'deem',
  'deep', 'deer', 'den', 'desk', 'dew', 'dial', 'dice', 'dig', 'dim',
  'dine', 'dip', 'dirt', 'dish', 'disk', 'dock', 'dog', 'dome', 'done',
  'door', 'dose', 'dot', 'doubt', 'dove', 'down', 'draft', 'drain',
  'drake', 'drank', 'drape', 'draw', 'drawn', 'dream', 'dress', 'drew',
  'dried', 'drift', 'drill', 'drink', 'drive', 'drop', 'drove', 'drum',
  'dry', 'duck', 'due', 'dug', 'duke', 'dull', 'dune', 'dusk', 'dust',
  'each', 'eagle', 'ear', 'earn', 'earth', 'ease', 'east', 'eat',
  'edge', 'eel', 'eight', 'elder', 'elm', 'else', 'end', 'era', 'eve',
  'even', 'ever', 'evil', 'eye',
  'face', 'fact', 'fade', 'fail', 'fair', 'fake', 'fall', 'fame',
  'fan', 'far', 'fare', 'farm', 'fast', 'fat', 'fate', 'fear', 'feast',
  'feat', 'fed', 'feed', 'feel', 'feet', 'fell', 'felt', 'fence',
  'few', 'field', 'fight', 'file', 'fill', 'film', 'fin', 'find',
  'fine', 'fire', 'firm', 'first', 'fish', 'fist', 'fit', 'five',
  'fix', 'flag', 'flame', 'flash', 'flat', 'fled', 'flesh', 'flew',
  'flip', 'float', 'flock', 'flood', 'floor', 'flour', 'flow', 'flown',
  'fly', 'foam', 'fog', 'fold', 'folk', 'fond', 'food', 'fool', 'foot',
  'for', 'force', 'ford', 'form', 'fort', 'found', 'four', 'fox',
  'frame', 'free', 'fresh', 'frog', 'from', 'front', 'frost', 'fruit',
  'fuel', 'full', 'fun', 'fur',
  'gain', 'gale', 'game', 'gap', 'gas', 'gate', 'gave', 'gaze', 'gear',
  'gem', 'get', 'ghost', 'gift', 'girl', 'give', 'glad', 'gland',
  'glare', 'glass', 'gleam', 'glen', 'glide', 'globe', 'gloom', 'glory',
  'glow', 'glue', 'goal', 'goat', 'gold', 'golf', 'gone', 'good',
  'got', 'grace', 'grade', 'grain', 'grand', 'grant', 'grape', 'grasp',
  'grass', 'grave', 'gray', 'great', 'greed', 'green', 'greet', 'grew',
  'grief', 'grill', 'grim', 'grin', 'grind', 'grip', 'grit', 'groom',
  'gross', 'ground', 'group', 'grove', 'grow', 'grown', 'growl', 'guard',
  'guess', 'guest', 'guide', 'guilt', 'gulf', 'gun', 'gut',
  'habit', 'had', 'hail', 'hair', 'half', 'hall', 'halt', 'ham',
  'hand', 'hang', 'hard', 'hare', 'harm', 'harp', 'harsh', 'has',
  'haste', 'hat', 'hate', 'haul', 'have', 'hay', 'head', 'heal',
  'heap', 'hear', 'heart', 'heat', 'hedge', 'heel', 'held', 'help',
  'hen', 'her', 'herb', 'herd', 'here', 'hero', 'hid', 'hide', 'high',
  'hike', 'hill', 'him', 'hint', 'hip', 'hire', 'his', 'hit', 'hive',
  'hold', 'hole', 'home', 'hood', 'hook', 'hope', 'horn', 'horse',
  'host', 'hot', 'hour', 'house', 'how', 'hub', 'hug', 'hull', 'hum',
  'hung', 'hunt', 'hurl', 'hurt', 'hut',
  'ice', 'idea', 'ill', 'inch', 'ink', 'inn', 'ion', 'iron', 'isle',
  'item', 'its', 'jade', 'jail', 'jam', 'jar', 'jaw', 'jet', 'job',
  'join', 'joke', 'joy', 'judge', 'jug', 'jump', 'just',
  'keen', 'keep', 'kept', 'key', 'kick', 'kid', 'kill', 'kind', 'king',
  'kiss', 'kit', 'kite', 'knee', 'knew', 'knit', 'knob', 'knock',
  'knot', 'know', 'known',
  'lace', 'lack', 'lad', 'laid', 'lake', 'lamb', 'lame', 'lamp',
  'land', 'lane', 'lap', 'lark', 'lash', 'last', 'late', 'launch',
  'law', 'lawn', 'lay', 'lead', 'leaf', 'leak', 'lean', 'leap',
  'learn', 'least', 'left', 'lemon', 'lend', 'lens', 'lent', 'less',
  'let', 'lid', 'lie', 'life', 'lift', 'light', 'like', 'limb', 'lime',
  'limp', 'line', 'link', 'lion', 'lip', 'list', 'lit', 'live', 'load',
  'loaf', 'loan', 'lock', 'log', 'lone', 'long', 'look', 'loop',
  'lord', 'lose', 'loss', 'lost', 'lot', 'loud', 'love', 'low', 'luck',
  'lump', 'lung',
  'mad', 'made', 'mail', 'main', 'make', 'male', 'mall', 'malt', 'man',
  'map', 'march', 'mark', 'mask', 'mass', 'mast', 'match', 'mate',
  'maze', 'meal', 'mean', 'meat', 'meet', 'melt', 'mend', 'mere',
  'mesh', 'mess', 'met', 'mild', 'mile', 'milk', 'mill', 'mind',
  'mine', 'mint', 'miss', 'mist', 'mix', 'moan', 'moat', 'mock',
  'mode', 'mold', 'mole', 'monk', 'mood', 'moon', 'moor', 'more',
  'moss', 'most', 'moth', 'mount', 'mouse', 'mouth', 'move', 'much',
  'mud', 'mug', 'mule', 'must',
  'nail', 'name', 'nap', 'near', 'neat', 'neck', 'need', 'nest',
  'net', 'new', 'news', 'next', 'nice', 'nine', 'nod', 'none', 'noon',
  'norm', 'north', 'nose', 'note', 'noun', 'now', 'null', 'nut',
  'oak', 'oar', 'oat', 'odd', 'off', 'oil', 'old', 'once', 'one',
  'only', 'open', 'oral', 'ore', 'other', 'ought', 'our', 'out',
  'outer', 'oven', 'over', 'owe', 'owl', 'own',
  'pace', 'pack', 'pad', 'page', 'paid', 'pail', 'pain', 'pair',
  'pale', 'palm', 'pan', 'pane', 'park', 'part', 'pass', 'past',
  'paste', 'pat', 'patch', 'path', 'pause', 'pave', 'pay', 'peace',
  'peak', 'pear', 'pearl', 'peel', 'pen', 'pet', 'pick', 'pie',
  'pier', 'pile', 'pill', 'pin', 'pine', 'pink', 'pipe', 'pit',
  'pitch', 'place', 'plain', 'plan', 'plane', 'plank', 'plant', 'plate',
  'play', 'plead', 'pleat', 'pledge', 'plod', 'plot', 'plow', 'pluck',
  'plug', 'plum', 'plumb', 'plume', 'plump', 'plunge', 'plus', 'poem',
  'poet', 'point', 'poke', 'pole', 'pond', 'pool', 'poor', 'pop',
  'pork', 'port', 'pose', 'post', 'pot', 'pound', 'pour', 'power',
  'praise', 'pray', 'press', 'price', 'pride', 'prime', 'prince',
  'print', 'prize', 'probe', 'proof', 'prose', 'proud', 'prove', 'pull',
  'pulse', 'pump', 'punch', 'pure', 'purse', 'push', 'put',
  'queen', 'quest', 'quick', 'quiet', 'quilt', 'quit', 'quite',
  'race', 'rack', 'rage', 'raid', 'rail', 'rain', 'raise', 'rake',
  'ram', 'ran', 'range', 'rank', 'rap', 'rare', 'rash', 'rat', 'rate',
  'raw', 'ray', 'reach', 'read', 'real', 'realm', 'reap', 'rear',
  'red', 'reed', 'reef', 'reel', 'reign', 'rein', 'rent', 'rest',
  'rib', 'rice', 'rich', 'rid', 'ride', 'ridge', 'right', 'rim',
  'ring', 'rip', 'ripe', 'rise', 'risk', 'river', 'road', 'roam',
  'roar', 'rob', 'robe', 'rock', 'rod', 'rode', 'role', 'roll',
  'roof', 'room', 'root', 'rope', 'rose', 'rot', 'rough', 'round',
  'route', 'row', 'rub', 'rug', 'ruin', 'rule', 'run', 'rush', 'rust',
  'sack', 'sad', 'safe', 'sage', 'said', 'sail', 'sake', 'sale',
  'salt', 'same', 'sand', 'sang', 'sank', 'sat', 'save', 'saw', 'say',
  'scale', 'scar', 'scene', 'scent', 'score', 'scout', 'seal', 'search',
  'seat', 'seed', 'seek', 'seem', 'seen', 'self', 'sell', 'send',
  'sense', 'sent', 'serve', 'set', 'shade', 'shadow', 'shaft', 'shake',
  'shall', 'shame', 'shape', 'share', 'shark', 'sharp', 'shed', 'sheer',
  'sheet', 'shelf', 'shell', 'shield', 'shift', 'shine', 'ship', 'shirt',
  'shock', 'shoe', 'shone', 'shook', 'shoot', 'shop', 'shore', 'short',
  'shot', 'shout', 'show', 'shown', 'shut', 'sick', 'side', 'sigh',
  'sight', 'sign', 'silk', 'sin', 'since', 'sing', 'sink', 'sir',
  'sit', 'site', 'six', 'size', 'skill', 'skin', 'skip', 'skull',
  'slab', 'slag', 'slain', 'slap', 'slash', 'slate', 'slave', 'sled',
  'sleep', 'slept', 'slew', 'slice', 'slid', 'slide', 'slim', 'sling',
  'slip', 'slit', 'slope', 'slot', 'slow', 'slug', 'slump', 'small',
  'smart', 'smell', 'smile', 'smoke', 'smooth', 'snap', 'snare',
  'snow', 'soak', 'soap', 'soar', 'sob', 'sock', 'soft', 'soil',
  'sold', 'sole', 'solid', 'solve', 'some', 'son', 'song', 'soon',
  'sort', 'soul', 'sound', 'soup', 'sour', 'south', 'sow', 'space',
  'span', 'spare', 'spark', 'speak', 'spear', 'speed', 'spell', 'spend',
  'spent', 'spice', 'spill', 'spin', 'spine', 'spite', 'split', 'spoke',
  'sport', 'spot', 'spray', 'spread', 'spring', 'squad', 'square',
  'stack', 'staff', 'stage', 'stain', 'stair', 'stake', 'stale', 'stalk',
  'stall', 'stamp', 'stand', 'star', 'stare', 'stark', 'start', 'state',
  'stay', 'steak', 'steal', 'steam', 'steel', 'steep', 'steer', 'stem',
  'step', 'stern', 'stew', 'stick', 'stiff', 'still', 'sting', 'stir',
  'stock', 'stoke', 'stole', 'stone', 'stood', 'stool', 'stoop', 'stop',
  'store', 'storm', 'story', 'stout', 'stove', 'strain', 'strand',
  'strange', 'strap', 'straw', 'stray', 'stream', 'street', 'stress',
  'stretch', 'stride', 'strike', 'string', 'strip', 'stroke', 'strong',
  'struck', 'stuff', 'stump', 'stung', 'stunk', 'style', 'such', 'suit',
  'sum', 'sun', 'sung', 'sunk', 'sure', 'surf', 'surge', 'swam',
  'swamp', 'swan', 'swap', 'swear', 'sweat', 'sweep', 'sweet', 'swept',
  'swift', 'swim', 'swing', 'swirl', 'swore', 'sworn', 'swung',
  'tail', 'take', 'tale', 'talk', 'tall', 'tame', 'tan', 'tank', 'tap',
  'tape', 'tar', 'task', 'taste', 'tax', 'tea', 'teach', 'team',
  'tear', 'tell', 'ten', 'tend', 'tent', 'term', 'test', 'than',
  'thank', 'that', 'them', 'then', 'there', 'these', 'thick', 'thief',
  'thin', 'thing', 'think', 'third', 'thorn', 'those', 'thread',
  'threat', 'three', 'threw', 'thrill', 'thrive', 'throat', 'throne',
  'throng', 'throw', 'thrown', 'thumb', 'tide', 'tie', 'tier', 'tight',
  'tile', 'till', 'tilt', 'time', 'tin', 'tip', 'tire', 'toe', 'told',
  'toll', 'tone', 'tongue', 'took', 'tool', 'top', 'torch', 'tore',
  'torn', 'toss', 'total', 'touch', 'tough', 'tour', 'tower', 'town',
  'trace', 'track', 'trade', 'trail', 'train', 'trait', 'trap', 'trash',
  'tread', 'treat', 'tree', 'trend', 'trial', 'tribe', 'trick', 'tried',
  'trim', 'trip', 'trod', 'troop', 'truck', 'true', 'trunk', 'trust',
  'truth', 'try', 'tube', 'tuck', 'tug', 'tune', 'turn', 'twice',
  'twin', 'twist', 'type',
  'unit', 'up', 'upon', 'urge', 'use', 'used',
  'vain', 'vale', 'vast', 'veil', 'vein', 'verb', 'verse', 'very',
  'vest', 'view', 'vine', 'voice', 'void', 'vote', 'vow',
  'wade', 'wage', 'wait', 'wake', 'walk', 'wall', 'wand', 'want',
  'ward', 'warm', 'warn', 'warp', 'wash', 'waste', 'watch', 'water',
  'wave', 'wax', 'way', 'weak', 'wealth', 'wear', 'web', 'wed', 'weed',
  'week', 'weep', 'weigh', 'weight', 'weird', 'well', 'went', 'wept',
  'were', 'west', 'wet', 'wheat', 'wheel', 'when', 'where', 'which',
  'while', 'whip', 'whole', 'whose', 'wide', 'wife', 'wild', 'will',
  'win', 'wind', 'wine', 'wing', 'wipe', 'wire', 'wise', 'wish',
  'with', 'woke', 'wolf', 'won', 'wood', 'wool', 'word', 'wore',
  'work', 'world', 'worm', 'worn', 'worst', 'worth', 'would', 'wound',
  'wrap', 'wrath', 'wrist', 'write', 'wrong', 'wrote',
  'yard', 'yarn', 'year', 'yell', 'yet', 'yield', 'you', 'young',
  'youth', 'zeal', 'zone', 'zoo',
];

/** Set for O(1) lookup */
const WORD_SET = new Set(WORD_LIST);

/**
 * Find all valid words that can be formed from the given letters.
 * Uses letter frequency counting (not permutations) for efficiency.
 */
export function findWords(letters: string): string[] {
  const input = letters.toLowerCase().replace(/[^a-z]/g, '');
  if (input.length === 0) return [];

  const inputCounts = getLetterCounts(input);
  const results: string[] = [];

  for (const word of WORD_SET) {
    if (word.length > input.length) continue;
    if (canFormWord(word, inputCounts)) {
      results.push(word);
    }
  }

  // Sort by length descending, then alphabetically
  results.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return results;
}

function getLetterCounts(str: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ch of str) {
    counts[ch] = (counts[ch] || 0) + 1;
  }
  return counts;
}

function canFormWord(word: string, available: Record<string, number>): boolean {
  const needed = getLetterCounts(word);
  for (const [letter, count] of Object.entries(needed)) {
    if ((available[letter] || 0) < count) return false;
  }
  return true;
}

/** Group words by length, returning entries sorted by length descending */
export function groupByLength(words: string[]): [number, string[]][] {
  const groups: Record<number, string[]> = {};
  for (const word of words) {
    const len = word.length;
    if (!groups[len]) groups[len] = [];
    groups[len].push(word);
  }
  return Object.entries(groups)
    .map(([len, ws]) => [Number(len), ws] as [number, string[]])
    .sort((a, b) => b[0] - a[0]);
}
