/**
 * Pre-built Lesson Packs for Teacher Onboarding
 *
 * 3 starter packs that teachers can instantly assign.
 * Reduces "blank slate" friction — the #1 drop-off point for EdTech products.
 *
 * Each pack includes curated words with definitions, hints, and difficulty tiers.
 */

import type { LessonWord } from '@/types/education';

export interface StarterLessonPack {
  nameKey: string;        // i18n key for lesson name
  descriptionKey: string; // i18n key for description
  category: 'general' | 'academic' | 'language';
  targetLevel: 'beginner' | 'intermediate' | 'advanced';
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
// EXPORTED PACKS
// ============================================

export const STARTER_LESSON_PACKS: StarterLessonPack[] = [
  {
    nameKey: 'education.starterPacks.commonEnglish.name',
    descriptionKey: 'education.starterPacks.commonEnglish.description',
    category: 'general',
    targetLevel: 'beginner',
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
    words: beginnerHebrew,
    settings: {
      gridSize: 4,
      minWordLength: 2,
      timeLimit: 180,
      allowDiagonal: true,
    },
  },
];

export default STARTER_LESSON_PACKS;
