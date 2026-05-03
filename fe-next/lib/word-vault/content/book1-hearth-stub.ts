import type { Cousin, Item, RoomConfig } from '../types';

export const CINDER: Cousin = {
  id: 'cinder',
  nameHe: 'גחלת',
  nameEn: 'Gachelet',
  was: 'warm-hearted cook, fed everyone, knew every recipe by heart',
  is: 'charred-black cube wreathed in lava-cracks, hungry, raging',
  domain: 'Hearth Halls — burned-down kitchen, ash-covered counters',
};

export const BOOK_1_ITEMS: Item[] = [
  {
    id: 'melo-lantern',
    name: { he: 'הפנס של אש', en: "Esh's Lantern" },
    description: { he: 'חושף אות אחת בכל קיר חרוט', en: 'Reveals one letter on a carved wall' },
  },
  {
    id: 'defrost-candle',
    name: { he: 'נר להמסה', en: 'Defrost Candle' },
    description: { he: 'מנגב פיח מהר יותר', en: 'Wipes soot faster' },
  },
  {
    id: 'brass-key',
    name: { he: 'מפתח ברונזה', en: 'Brass Key' },
    description: { he: 'מתקן את ברז הזמן', en: 'Fixes the broken time-valve' },
  },
  {
    id: 'cael-recipe-book',
    name: { he: 'ספר המתכונים של אורי', en: "Uri's Recipe Book" },
    description: {
      he: 'מציג את סדר המתכון של אורי פעם אחת',
      en: "Shows Uri's recipe order once",
    },
  },
  {
    id: 'family-photo',
    name: { he: 'תצלום משפחתי', en: 'Family Photo' },
    description: { he: 'חושף את האות הראשונה של המצרך הבא', en: 'Reveals first letter of next ingredient' },
  },
  {
    id: 'cinder-charm',
    name: { he: 'קמע גחלת', en: 'Gachelet Charm' },
    description: {
      he: '+1 מטבעות זיכרון מחידות אש',
      en: '+1 Memory Coin from fire-themed riddles',
    },
    passive: 'fire-coin-bonus',
  },
  {
    id: 'broom',
    name: { he: 'מטאטא קש ישן', en: 'Old Straw Broom' },
    description: {
      he: 'מנקה ערמות פיח עבות בקירות הסדוקים',
      en: 'Sweeps thick soot from cracked walls',
    },
  },
];

export const BOOK_1_HEARTH_ROOMS: RoomConfig[] = [
  {
    id: 'room-1-1',
    chapter: 1,
    title: { he: 'הדלת הסדוקה', en: 'The Cracked Door' },
    storyBeat: {
      he: 'אש נכנסת. הפנס נדלק. שאון רחוק. גחלת קוראת: "חזרי, קטנטונת!"',
      en: 'Esh enters. Lantern lights up. Distant roar. Gachelet calls: "GO BACK, LITTLE ONE!"',
    },
    riddle: {
      engine: 'word-constraint',
      tiles: [
        { id: 't-aleph', letter: 'א' },
        { id: 't-shin', letter: 'ש' },
      ],
      minLength: 2,
      targetWords: ['אש'],
    },
    rewards: { coins: 10, items: ['melo-lantern'] },
  },
  {
    id: 'room-1-2',
    chapter: 1,
    title: { he: 'קיר המתכונים', en: 'The Recipe Wall' },
    storyBeat: {
      he: 'בעת שהקלפים מסתדרים, נשמעת מנגינת זמזום קלה — שירת הבישול הישנה של אורי.',
      en: "As cards align, faint humming melody plays — Uri's old cooking song.",
    },
    riddle: {
      engine: 'logic-sequence',
      steps: [
        { id: 's-boil', label: { he: 'מרתיחים', en: 'BOIL' } },
        { id: 's-knead', label: { he: 'לשים', en: 'KNEAD' } },
        { id: 's-bake', label: { he: 'אופים', en: 'BAKE' } },
      ],
      correctOrder: ['s-boil', 's-knead', 's-bake'],
      hintRhyme: {
        he: 'תחילה רותחים, אחר כך לשים, ולבסוף אופים.',
        en: 'First boil, then knead, finally bake.',
      },
    },
    rewards: { coins: 20, items: ['defrost-candle'] },
  },
  {
    id: 'room-1-3',
    chapter: 1,
    title: { he: 'מזווה הצופן', en: 'The Cipher Pantry' },
    storyBeat: {
      he: 'כששלוש תוויות נכונות מונחות, דלת המזווה נפתחת.',
      en: 'When 3 correct labels placed, pantry door opens.',
    },
    riddle: {
      engine: 'cipher',
      jars: [
        {
          id: 'jar-sugar',
          scrambled: 'רכוס',
          answer: 'סוכר',
          hint: { he: 'מתוק, נמס בכוס תה', en: 'Sweet, dissolves in tea' },
        },
        {
          id: 'jar-flour',
          scrambled: 'חמק',
          answer: 'קמח',
          hint: { he: 'אבקה לבנה לאפייה', en: 'White powder for baking' },
        },
        {
          id: 'jar-bread',
          scrambled: 'חמל',
          answer: 'לחם',
          hint: { he: 'יוצא מן התנור, נחתך לפרוסות', en: 'Comes from the oven, sliced' },
        },
        {
          id: 'jar-red',
          scrambled: 'חתפ',
          answer: 'פתח',
          isRedHerring: true,
          hint: { he: 'פעולה — לא מצרך', en: 'An action — not an ingredient' },
        },
      ],
    },
    rewards: { coins: 25, items: ['brass-key'] },
  },
  {
    id: 'room-1-4',
    chapter: 1,
    title: { he: 'המרתף המעשן', en: 'The Smouldering Vault' },
    storyBeat: {
      he: 'המרתף נפתח, ומגלה את ספר המתכונים של אורי.',
      en: "Vault opens, reveals Uri's Recipe Book.",
    },
    riddle: {
      engine: 'logic-sequence',
      steps: [
        { id: 's-oven', label: { he: 'תנור', en: 'OVEN' } },
        { id: 's-knife', label: { he: 'סכין', en: 'KNIFE' } },
        { id: 's-fork', label: { he: 'מזלג', en: 'FORK' } },
        { id: 's-pot', label: { he: 'סיר', en: 'POT' } },
      ],
      correctOrder: ['s-oven', 's-knife', 's-fork', 's-pot'],
      hintRhyme: {
        he: 'קודם מחמם, אחר כך חותך, ואז מרים, ואז מגיש.',
        en: 'First it heats, then it slices, then it lifts, then it serves.',
      },
    },
    rewards: { coins: 30, items: ['cael-recipe-book'] },
    twinVoiceTease: {
      text: {
        he: 'יומן מפויח על שולחן צד מזכיר "שני קולות שלא היו צריכים לדבר".',
        en: 'Charred diary on a side desk mentions "two voices that should not have spoken".',
      },
      trigger: 'on-enter',
    },
  },
  {
    id: 'room-1-5',
    chapter: 1,
    title: { he: 'המטבח הישן של אורי', en: "Uri's Old Kitchen" },
    storyBeat: {
      he: 'מטבח נקי, קפוא בזמן שלפני ההשחתה. תמונה משפחתית של חמשת בני הדודים. אש מזילה דמעה. סדר המנה החתומה נחשף בסביבה.',
      en: 'A clean kitchen frozen in time before corruption. Family photo of all 5 cousins. Esh sheds a tear. Signature dish ingredient ORDER revealed environmentally.',
    },
    riddle: null,
    rewards: { coins: 15, items: ['family-photo'], letterFragment: 1 },
    isStoryOnly: true,
  },
  {
    id: 'room-1-6',
    chapter: 1,
    title: { he: 'המתכון האחרון', en: 'The Last Recipe' },
    storyBeat: {
      he: 'כשהפריטים נחים יחד על המזבח, גחלת חוזרת לרגע להיות אורי, בוכה, מחבק את אש ונעלם — ומשאיר אחריו את שירת האותיות.',
      en: 'When the ritual items rest together on the altar, Gachelet transforms back into Uri for a moment, weeps, hugs Esh, then vanishes — leaving the Letter-Song.',
    },
    riddle: {
      engine: 'word-constraint',
      tiles: [
        { id: 't-mem', letter: 'מ' },
        { id: 't-yod', letter: 'י' },
        { id: 't-mem-final', letter: 'ם' },
        { id: 't-qof', letter: 'ק' },
        { id: 't-het', letter: 'ח' },
        { id: 't-dalet', letter: 'ד' },
        { id: 't-bet', letter: 'ב' },
        { id: 't-shin', letter: 'ש' },
      ],
      minLength: 3,
      targetWords: ['מים', 'קמח', 'דבש'],
    },
    rewards: { coins: 50, items: ['cinder-charm'], letterFragment: 1 },
    twinVoiceTease: {
      text: {
        he: 'לחישה מעוותת בסיום הקטע — "עזבת אותנו…"',
        en: 'Glitched whisper at end of cinematic — "you left us…"',
      },
      trigger: 'cinematic',
    },
  },
];
