import type { Cousin, Item, RoomConfig } from '../types';

export const CINDER: Cousin = {
  id: 'cinder',
  nameHe: 'סינדר',
  nameEn: 'Cinder',
  was: 'warm-hearted cook, fed everyone, knew every recipe by heart',
  is: 'charred-black cube wreathed in lava-cracks, hungry, raging',
  domain: 'Hearth Halls — burned-down kitchen, ash-covered counters',
};

export const BOOK_1_ITEMS: Item[] = [
  {
    id: 'melo-lantern',
    name: { he: 'הפנס של מלו', en: "Melo's Lantern" },
    description: { he: 'מאיר את כל המילים', en: 'Lights all words' },
  },
  {
    id: 'cael-recipe-book',
    name: { he: 'ספר המתכונים של קאל', en: "Cael's Recipe Book" },
    description: {
      he: 'משלים אוטומטית רצפי מצרכים',
      en: 'Auto-completes ingredient sequences',
    },
  },
  {
    id: 'cinder-charm',
    name: { he: 'קמע סינדר', en: 'Cinder Charm' },
    description: {
      he: '+1 מטבעות זיכרון מחידות אש',
      en: '+1 Memory Coin from fire-themed riddles',
    },
    passive: 'fire-coin-bonus',
  },
];

export const BOOK_1_HEARTH_ROOMS: RoomConfig[] = [
  {
    id: 'room-1-1',
    chapter: 1,
    title: { he: 'הדלת הסדוקה', en: 'The Cracked Door' },
    storyBeat: {
      he: 'מלו נכנס. הפנס נדלק. שאון רחוק. סינדר קורא: "חזור, קטנטן!"',
      en: 'Melo enters. Lantern lights up. Distant roar. Cinder calls: "GO BACK, LITTLE ONE!"',
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
    rewards: { coins: 10 },
  },
  {
    id: 'room-1-2',
    chapter: 1,
    title: { he: 'קיר המתכונים', en: 'The Recipe Wall' },
    storyBeat: {
      he: 'בעת שהקלפים מסתדרים, נשמעת מנגינת זמזום קלה — שירת הבישול הישנה של קאל.',
      en: "As cards align, faint humming melody plays — Cael's old cooking song.",
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
    rewards: { coins: 20 },
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
    rewards: { coins: 25 },
  },
  {
    id: 'room-1-4',
    chapter: 1,
    title: { he: 'המרתף המעשן', en: 'The Smouldering Vault' },
    storyBeat: {
      he: 'המרתף נפתח, ומגלה את ספר המתכונים של קאל.',
      en: "Vault opens, reveals Cael's Recipe Book.",
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
    title: { he: 'המטבח הישן של קאל', en: "Cael's Old Kitchen" },
    storyBeat: {
      he: 'מטבח נקי, קפוא בזמן שלפני ההשחתה. תמונה משפחתית של חמשת בני הדודים. מלו מזיל דמעה. סדר המנה החתומה נחשף בסביבה.',
      en: 'A clean kitchen frozen in time before corruption. Family photo of all 5 cousins. Melo sheds a tear. Signature dish ingredient ORDER revealed environmentally.',
    },
    riddle: null,
    rewards: { coins: 15, letterFragment: 1 },
    isStoryOnly: true,
  },
  {
    id: 'room-1-6',
    chapter: 1,
    title: { he: 'המתכון האחרון', en: 'The Last Recipe' },
    storyBeat: {
      he: 'במילה הנכונה השלישית סינדר חוזר לרגע להיות קאל, בוכה, מחבק את מלו ונעלם — ומשאיר אחריו את ספר המתכונים ושירת אותיות.',
      en: 'On third correct word, Cinder transforms back into Cael for a moment, weeps, hugs Melo, then vanishes — leaving Recipe Book + Letter-Song.',
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
