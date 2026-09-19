/**
 * Pre-built Lesson Packs for Teacher Onboarding
 *
 * 3 starter packs that teachers can instantly assign.
 * Reduces "blank slate" friction — the #1 drop-off point for EdTech products.
 *
 * Each pack includes curated words with definitions, hints, and difficulty tiers.
 */

import type { LessonWord } from '@/types/education';

import type { Language } from '@/lib/supabase/education/types';

export interface StarterLessonPack {
  nameKey: string;        // i18n key for lesson name
  descriptionKey: string; // i18n key for description
  category: 'general' | 'academic' | 'language';
  targetLevel: 'beginner' | 'intermediate' | 'advanced';
  language: Language;     // Language of this pack
  words: LessonWord[];
  settings: {
    gridSize: 4 | 5;
    minWordLength: number;
    timeLimit: number;
    allowDiagonal: boolean;
  };
}

// ============================================
// PACK 1: Common English Words (Beginner)
// ============================================

const commonEnglishWords: LessonWord[] = [
  { word: 'house', definition: 'A building where people live', hint: 'Where you sleep at night', difficulty: 'easy' },
  { word: 'water', definition: 'A clear liquid essential for life', hint: 'You drink this', difficulty: 'easy' },
  { word: 'light', definition: 'Brightness that lets you see', hint: 'Opposite of dark', difficulty: 'easy' },
  { word: 'earth', definition: 'The planet we live on', hint: 'Third from the sun', difficulty: 'easy' },
  { word: 'plant', definition: 'A living thing that grows in soil', hint: 'Needs sunlight and water', difficulty: 'easy' },
  { word: 'sleep', definition: 'To rest with eyes closed', hint: 'What you do at night', difficulty: 'easy' },
  { word: 'dream', definition: 'Images in your mind while sleeping', hint: 'Happens during sleep', difficulty: 'easy' },
  { word: 'heart', definition: 'The organ that pumps blood', hint: 'Beats in your chest', difficulty: 'easy' },
  { word: 'voice', definition: 'Sound made by a person speaking', hint: 'Used for talking and singing', difficulty: 'easy' },
  { word: 'smile', definition: 'A happy expression on your face', hint: 'Shows you are happy', difficulty: 'easy' },
  { word: 'stone', definition: 'A hard piece of rock', hint: 'Found on the ground', difficulty: 'easy' },
  { word: 'river', definition: 'A large flowing body of water', hint: 'Flows to the sea', difficulty: 'medium' },
  { word: 'bridge', definition: 'A structure over water or a gap', hint: 'Helps you cross a river', difficulty: 'medium' },
  { word: 'garden', definition: 'A place where plants are grown', hint: 'Has flowers and vegetables', difficulty: 'medium' },
  { word: 'winter', definition: 'The coldest season of the year', hint: 'Snow falls in this season', difficulty: 'medium' },
  { word: 'island', definition: 'Land surrounded by water', hint: 'You need a boat to reach it', difficulty: 'medium' },
  { word: 'forest', definition: 'A large area with many trees', hint: 'Home to many animals', difficulty: 'medium' },
  { word: 'shadow', definition: 'A dark shape made by blocking light', hint: 'Follows you on sunny days', difficulty: 'medium' },
  { word: 'mirror', definition: 'A surface that reflects images', hint: 'You see yourself in it', difficulty: 'medium' },
  { word: 'castle', definition: 'A large fortified building', hint: 'Kings and queens lived here', difficulty: 'medium' },
  { word: 'desert', definition: 'A dry area with little rainfall', hint: 'Very hot and sandy', difficulty: 'medium' },
  { word: 'silver', definition: 'A shiny gray precious metal', hint: 'Used to make jewelry', difficulty: 'medium' },
  { word: 'travel', definition: 'To go from one place to another', hint: 'By plane, train, or car', difficulty: 'medium' },
  { word: 'sunset', definition: 'When the sun goes below the horizon', hint: 'Beautiful colors in the evening sky', difficulty: 'medium' },
  { word: 'puzzle', definition: 'A game or problem to solve', hint: 'You are playing one now!', difficulty: 'medium' },
  { word: 'thunder', definition: 'The loud sound during a storm', hint: 'Comes after lightning', difficulty: 'hard' },
  { word: 'whisper', definition: 'To speak very quietly', hint: 'So others cannot hear', difficulty: 'hard' },
  { word: 'harvest', definition: 'Gathering crops from fields', hint: 'Happens in autumn', difficulty: 'hard' },
  { word: 'journey', definition: 'A long trip from one place to another', hint: 'An adventure on the road', difficulty: 'hard' },
  { word: 'crystal', definition: 'A clear, transparent mineral', hint: 'Sparkles in the light', difficulty: 'hard' },
];

// ============================================
// PACK 2: Academic Vocabulary (Intermediate)
// ============================================

const academicVocabulary: LessonWord[] = [
  { word: 'analyze', definition: 'To examine something in detail', hint: 'Break it down to understand', difficulty: 'medium' },
  { word: 'concept', definition: 'An abstract idea or general notion', hint: 'A thought or theory', difficulty: 'medium' },
  { word: 'debate', definition: 'A formal discussion on a topic', hint: 'Two sides argue their points', difficulty: 'medium' },
  { word: 'effect', definition: 'A result or change caused by something', hint: 'Cause and ___', difficulty: 'easy' },
  { word: 'factor', definition: 'Something that influences a result', hint: 'One piece of the puzzle', difficulty: 'medium' },
  { word: 'method', definition: 'A way of doing something', hint: 'A process or technique', difficulty: 'medium' },
  { word: 'theory', definition: 'An idea used to explain something', hint: 'Scientists test these', difficulty: 'medium' },
  { word: 'source', definition: 'Where something comes from', hint: 'The origin or beginning', difficulty: 'medium' },
  { word: 'research', definition: 'Careful study to find new facts', hint: 'Scientists do this in labs', difficulty: 'medium' },
  { word: 'pattern', definition: 'A repeated design or sequence', hint: 'Something that repeats', difficulty: 'medium' },
  { word: 'context', definition: 'The situation surrounding an event', hint: 'Helps you understand meaning', difficulty: 'medium' },
  { word: 'complex', definition: 'Having many connected parts', hint: 'Not simple', difficulty: 'medium' },
  { word: 'compare', definition: 'To find similarities and differences', hint: 'Look at two things side by side', difficulty: 'medium' },
  { word: 'define', definition: 'To explain the meaning of a word', hint: 'What a dictionary does', difficulty: 'easy' },
  { word: 'predict', definition: 'To say what will happen in the future', hint: 'Make a guess about tomorrow', difficulty: 'medium' },
  { word: 'conclude', definition: 'To reach a decision after reasoning', hint: 'The end of an argument', difficulty: 'hard' },
  { word: 'evidence', definition: 'Facts that prove something is true', hint: 'What a detective looks for', difficulty: 'hard' },
  { word: 'evaluate', definition: 'To judge the value or quality of', hint: 'Rate how good something is', difficulty: 'hard' },
  { word: 'sequence', definition: 'Things arranged in a specific order', hint: '1, 2, 3 is a ___', difficulty: 'hard' },
  { word: 'interpret', definition: 'To explain the meaning of something', hint: 'A translator does this', difficulty: 'hard' },
  { word: 'classify', definition: 'To arrange into groups or categories', hint: 'Sort things by type', difficulty: 'hard' },
  { word: 'summarize', definition: 'To give a brief account of main points', hint: 'Make something shorter', difficulty: 'hard' },
  { word: 'construct', definition: 'To build or put together', hint: 'What builders do', difficulty: 'hard' },
  { word: 'persuade', definition: 'To convince someone to do something', hint: 'Change someone\'s mind', difficulty: 'hard' },
  { word: 'relevant', definition: 'Connected to the topic being discussed', hint: 'Important to the subject', difficulty: 'hard' },
];

// ============================================
// PACK 3: Beginner Hebrew (for Hebrew learners)
// ============================================

const beginnerHebrew: LessonWord[] = [
  { word: 'שלום', definition: 'Hello / Peace', hint: 'The most common greeting', difficulty: 'easy' },
  { word: 'תודה', definition: 'Thank you', hint: 'Say this when someone helps you', difficulty: 'easy' },
  { word: 'מים', definition: 'Water', hint: 'You drink this every day', difficulty: 'easy' },
  { word: 'לחם', definition: 'Bread', hint: 'A basic food item', difficulty: 'easy' },
  { word: 'בית', definition: 'House / Home', hint: 'Where you live', difficulty: 'easy' },
  { word: 'ספר', definition: 'Book', hint: 'You read this', difficulty: 'easy' },
  { word: 'שמש', definition: 'Sun', hint: 'Shines in the sky during the day', difficulty: 'easy' },
  { word: 'ירח', definition: 'Moon', hint: 'Visible at night', difficulty: 'easy' },
  { word: 'חתול', definition: 'Cat', hint: 'A small furry pet that purrs', difficulty: 'easy' },
  { word: 'כלב', definition: 'Dog', hint: 'A loyal pet that barks', difficulty: 'easy' },
  { word: 'ילד', definition: 'Boy / Child', hint: 'A young person', difficulty: 'easy' },
  { word: 'ילדה', definition: 'Girl', hint: 'A young female person', difficulty: 'easy' },
  { word: 'מורה', definition: 'Teacher', hint: 'Works in a school', difficulty: 'medium' },
  { word: 'חבר', definition: 'Friend', hint: 'Someone you like to spend time with', difficulty: 'medium' },
  { word: 'משפחה', definition: 'Family', hint: 'Parents, siblings, grandparents', difficulty: 'medium' },
  { word: 'גשם', definition: 'Rain', hint: 'Falls from clouds', difficulty: 'medium' },
  { word: 'פרח', definition: 'Flower', hint: 'Grows in a garden, smells nice', difficulty: 'medium' },
  { word: 'עץ', definition: 'Tree', hint: 'Has leaves and branches', difficulty: 'easy' },
  { word: 'דג', definition: 'Fish', hint: 'Lives in water', difficulty: 'easy' },
  { word: 'ציפור', definition: 'Bird', hint: 'Has wings and can fly', difficulty: 'medium' },
];

// ============================================
// PACK 4: Beginner Spanish (Beginner)
// ============================================

const beginnerSpanish: LessonWord[] = [
  { word: 'sol', definition: 'Estrella que nos da luz de día', hint: 'Brilla en el cielo', difficulty: 'easy' },
  { word: 'mar', definition: 'Gran masa de agua salada', hint: 'Donde nadan los peces', difficulty: 'easy' },
  { word: 'pan', definition: 'Alimento hecho de harina', hint: 'Lo comes para desayunar', difficulty: 'easy' },
  { word: 'gato', definition: 'Felino doméstico que maúlla', hint: 'Tiene bigotes y cola', difficulty: 'easy' },
  { word: 'casa', definition: 'Lugar donde vivimos', hint: 'Tiene puerta y ventanas', difficulty: 'easy' },
  { word: 'mesa', definition: 'Mueble con patas para comer', hint: 'Dónde pones los platos', difficulty: 'easy' },
  { word: 'flor', definition: 'Parte colorida de una planta', hint: 'Bonita y perfumada', difficulty: 'easy' },
  { word: 'agua', definition: 'Líquido que bebemos', hint: 'Lo necesitas para vivir', difficulty: 'easy' },
  { word: 'ojo', definition: 'Órgano con el que vemos', hint: 'Tienes dos en la cara', difficulty: 'easy' },
  { word: 'pie', definition: 'Parte del cuerpo para caminar', hint: 'Llevas zapatos en esto', difficulty: 'easy' },
  { word: 'luna', definition: 'Brilla en el cielo de noche', hint: 'Sale cuando oscurece', difficulty: 'medium' },
  { word: 'rosa', definition: 'Flor con espinas', hint: 'Bonita y roja', difficulty: 'medium' },
  { word: 'nube', definition: 'Flota en el cielo y trae lluvia', hint: 'Blanca y esponjosa', difficulty: 'medium' },
  { word: 'oso', definition: 'Animal grande y peludo del bosque', hint: 'Es muy fuerte', difficulty: 'medium' },
  { word: 'ala', definition: 'Con ella vuela el pájaro', hint: 'Tienen los pájaros', difficulty: 'medium' },
];

// ============================================
// PACK 5: Beginner Swedish (Beginner)
// ============================================

const beginnerSwedish: LessonWord[] = [
  { word: 'sol', definition: 'Lyser på himlen om dagen', hint: 'Varm och ljus', difficulty: 'easy' },
  { word: 'hus', definition: 'Byggnad där man bor', hint: 'Där du bor', difficulty: 'easy' },
  { word: 'katt', definition: 'Husdjur som jamar', hint: 'Säger mjau', difficulty: 'easy' },
  { word: 'hund', definition: 'Husdjur som skäller', hint: 'Säger vov', difficulty: 'easy' },
  { word: 'bok', definition: 'Den läser man', hint: 'Har många sidor', difficulty: 'easy' },
  { word: 'bil', definition: 'Fordon med fyra hjul', hint: 'Du kör den', difficulty: 'easy' },
  { word: 'fisk', definition: 'Djur som lever i vatten', hint: 'Simmar i sjön', difficulty: 'easy' },
  { word: 'barn', definition: 'En liten människa', hint: 'Du var detta som liten', difficulty: 'easy' },
  { word: 'hand', definition: 'Kroppsdel med fem fingrar', hint: 'Du skriver med denna', difficulty: 'easy' },
  { word: 'fot', definition: 'Kroppsdel man går på', hint: 'Längst ned på benet', difficulty: 'easy' },
  { word: 'måne', definition: 'Lyser på himlen på natten', hint: 'Stor och gul på natten', difficulty: 'medium' },
  { word: 'ros', definition: 'Blomma med taggar', hint: 'Fin och doftande', difficulty: 'medium' },
  { word: 'träd', definition: 'Stor växt med stam och löv', hint: 'Växer från jorden', difficulty: 'medium' },
  { word: 'näsa', definition: 'Med den luktar man', hint: 'Sitter mellan ögonen', difficulty: 'medium' },
  { word: 'dörr', definition: 'Den öppnar man för att gå in', hint: 'Du öppnar denna', difficulty: 'medium' },
];

// ============================================
// PACK 6: Beginner Japanese (Beginner)
// ============================================

const beginnerJapanese: LessonWord[] = [
  { word: 'ねこ', definition: 'ニャーと鳴く動物', hint: 'かわいいペット', difficulty: 'easy' },
  { word: 'いぬ', definition: 'ワンワンとほえる動物', hint: '人間の友達', difficulty: 'easy' },
  { word: 'はな', definition: 'きれいに咲く植物', hint: 'いろとかおりがある', difficulty: 'easy' },
  { word: 'そら', definition: 'あたまの上に広がる青いもの', hint: '昼間は青い', difficulty: 'easy' },
  { word: 'うみ', definition: '塩水の広い場所', hint: 'クジラが住んでいる', difficulty: 'easy' },
  { word: 'やま', definition: 'とても高い地形', hint: '上に登る', difficulty: 'easy' },
  { word: 'かわ', definition: '水が流れる細い道', hint: 'うみに流れ込む', difficulty: 'easy' },
  { word: 'つき', definition: '夜空に光る丸いもの', hint: 'よる見える', difficulty: 'easy' },
  { word: 'ほし', definition: '夜空でキラキラ光る小さな光', hint: 'いくつもある', difficulty: 'easy' },
  { word: 'みず', definition: 'のどがかわいたら飲むもの', hint: '透明で大事', difficulty: 'easy' },
  { word: 'とり', definition: '空を飛ぶ動物', hint: 'はねがある', difficulty: 'medium' },
  { word: 'あめ', definition: '空から降る水', hint: 'ぬれる', difficulty: 'medium' },
  { word: 'ゆき', definition: '冬に降る白いもの', hint: 'つめたい', difficulty: 'medium' },
  { word: 'ほん', definition: 'ページをめくって読むもの', hint: 'じをたくさん読む', difficulty: 'medium' },
  { word: 'くち', definition: '食べたり話したりする体の部分', hint: '歯がある', difficulty: 'medium' },
];

// ============================================
// PACK 7: Beginner Russian (Beginner)
// ============================================

const beginnerRussian: LessonWord[] = [
  { word: 'кот', definition: 'Домашний питомец, который мяукает', hint: 'Маленький пушистый', difficulty: 'easy' },
  { word: 'собака', definition: 'Домашний питомец, который лает', hint: 'Верный друг', difficulty: 'easy' },
  { word: 'дом', definition: 'Строение где люди живут', hint: 'Там твоя семья', difficulty: 'easy' },
  { word: 'вода', definition: 'Прозрачная жидкость для питья', hint: 'Пьешь каждый день', difficulty: 'easy' },
  { word: 'солнце', definition: 'Яркое светило на небе днем', hint: 'Источник света и тепла', difficulty: 'easy' },
  { word: 'луна', definition: 'Светит на небе ночью', hint: 'Видна ночью', difficulty: 'easy' },
  { word: 'рыба', definition: 'Животное живущее в воде', hint: 'Плывет в море', difficulty: 'easy' },
  { word: 'птица', definition: 'Животное с крыльями и перьями', hint: 'Летает в небе', difficulty: 'easy' },
  { word: 'дерево', definition: 'Большое растение с стволом и листьями', hint: 'Растет из земли', difficulty: 'easy' },
  { word: 'цветок', definition: 'Красивая часть растения', hint: 'Приятный запах', difficulty: 'easy' },
  { word: 'глаз', definition: 'Орган зрения', hint: 'Видишь этим', difficulty: 'medium' },
  { word: 'рука', definition: 'Конечность для работы и движения', hint: 'У тебя их две', difficulty: 'medium' },
  { word: 'нога', definition: 'Конечность для ходьбы', hint: 'Ходишь на них', difficulty: 'medium' },
  { word: 'озеро', definition: 'Большое количество воды на суше', hint: 'Вода пресная', difficulty: 'medium' },
  { word: 'гора', definition: 'Высокий холм', hint: 'Надо подняться', difficulty: 'medium' },
];

// ============================================
// EXPORTED PACKS
// ============================================

export const STARTER_LESSON_PACKS: StarterLessonPack[] = [
  {
    nameKey: 'education.starterPacks.commonEnglish.name',
    descriptionKey: 'education.starterPacks.commonEnglish.description',
    category: 'general',
    targetLevel: 'beginner',
    language: 'en',
    words: commonEnglishWords,
    settings: {
      gridSize: 4,
      minWordLength: 3,
      timeLimit: 180,
      allowDiagonal: true,
    },
  },
  {
    nameKey: 'education.starterPacks.academicVocab.name',
    descriptionKey: 'education.starterPacks.academicVocab.description',
    category: 'academic',
    targetLevel: 'intermediate',
    language: 'en',
    words: academicVocabulary,
    settings: {
      gridSize: 5,
      minWordLength: 4,
      timeLimit: 240,
      allowDiagonal: true,
    },
  },
  {
    nameKey: 'education.starterPacks.beginnerHebrew.name',
    descriptionKey: 'education.starterPacks.beginnerHebrew.description',
    category: 'language',
    targetLevel: 'beginner',
    language: 'he',
    words: beginnerHebrew,
    settings: {
      gridSize: 4,
      minWordLength: 2,
      timeLimit: 180,
      allowDiagonal: true,
    },
  },
  {
    nameKey: 'education.starterPacks.beginnerSpanish.name',
    descriptionKey: 'education.starterPacks.beginnerSpanish.description',
    category: 'general',
    targetLevel: 'beginner',
    language: 'es',
    words: beginnerSpanish,
    settings: {
      gridSize: 4,
      minWordLength: 3,
      timeLimit: 180,
      allowDiagonal: true,
    },
  },
  {
    nameKey: 'education.starterPacks.beginnerSwedish.name',
    descriptionKey: 'education.starterPacks.beginnerSwedish.description',
    category: 'general',
    targetLevel: 'beginner',
    language: 'sv',
    words: beginnerSwedish,
    settings: {
      gridSize: 4,
      minWordLength: 3,
      timeLimit: 180,
      allowDiagonal: true,
    },
  },
  {
    nameKey: 'education.starterPacks.beginnerJapanese.name',
    descriptionKey: 'education.starterPacks.beginnerJapanese.description',
    category: 'general',
    targetLevel: 'beginner',
    language: 'ja',
    words: beginnerJapanese,
    settings: {
      gridSize: 4,
      minWordLength: 1,
      timeLimit: 180,
      allowDiagonal: true,
    },
  },
  {
    nameKey: 'education.starterPacks.beginnerRussian.name',
    descriptionKey: 'education.starterPacks.beginnerRussian.description',
    category: 'general',
    targetLevel: 'beginner',
    language: 'ru',
    words: beginnerRussian,
    settings: {
      gridSize: 4,
      minWordLength: 3,
      timeLimit: 180,
      allowDiagonal: true,
    },
  },
];

export default STARTER_LESSON_PACKS;
