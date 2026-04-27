const ADJECTIVES = [
  'EPIC', 'ZESTY', 'NEON', 'PIZZA', 'LIME', 'COSMIC',
  'GLITCH', 'BOLT', 'SUPER', 'TURBO', 'MAGIC', 'SOLID',
  'WORD', 'MEGA', 'WILD', 'FUNKY', 'ROYAL', 'LUCKY',
];

const NOUNS = [
  'TIGER', 'CAT', 'WOLF', 'OWL', 'FOX', 'BEAR',
  'WIZARD', 'NINJA', 'PILOT', 'GHOST', 'COMET', 'KNIGHT',
  'ROBOT', 'LEGEND', 'CHAMP', 'ROOKIE', 'HERO', 'SCOUT',
];

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function suggestPlayerName(): string {
  return `${pickOne(ADJECTIVES)}-${pickOne(NOUNS)}`;
}
