/**
 * First-assignment starter packs.
 *
 * Dogfooding: teachers create a class, open Create Assignment, and stall
 * because the lesson dropdown is empty. These packs create the lesson AND
 * assign it (Word Craft, due tomorrow) in one tap so the onboarding
 * checklist can move past `create_first_assignment`.
 *
 * Words are copied from the existing lesson-template catalog so a pack
 * here is the same list a teacher would pick in Lesson Builder.
 */
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';
import { WORDCRAFT_FOCUS } from './wordcraftAssignment';
import type { CreateLessonFn, CreateLessonAndAssignResult } from './createLessonWithAssignment';
import { createLessonAndAssign } from './createLessonWithAssignment';

export const FIRST_ASSIGNMENT_DUE_IN_DAYS = 1;

export interface FirstAssignmentTemplate {
  id: string;
  language: Language;
  nameKey: string;
  descriptionKey: string;
  words: VocabularyWord[];
}

const w = (word: string, definition: string): VocabularyWord => ({
  word,
  definition,
  canIntegrate: true,
});

export const FIRST_ASSIGNMENT_TEMPLATES: FirstAssignmentTemplate[] = [
  {
    id: 'starter-animals-en',
    language: 'en',
    nameKey: 'teacher.assignment.starterAnimals',
    descriptionKey: 'teacher.assignment.starterAnimalsDesc',
    words: [
      w('cat', 'A small furry pet'),
      w('dog', 'A loyal four-legged pet'),
      w('fish', 'An animal that swims in water'),
      w('bird', 'An animal that flies'),
      w('horse', 'A large animal used for riding'),
      w('snake', 'A long animal with no legs'),
      w('mouse', 'A small rodent'),
      w('frog', 'An amphibian that hops'),
      w('bear', 'A large furry animal'),
      w('lion', 'A big cat known as king of the jungle'),
    ],
  },
  {
    id: 'starter-colors-en',
    language: 'en',
    nameKey: 'teacher.assignment.starterColors',
    descriptionKey: 'teacher.assignment.starterColorsDesc',
    words: [
      w('red', 'The color of apples'),
      w('blue', 'The color of the sky'),
      w('green', 'The color of grass'),
      w('yellow', 'The color of the sun'),
      w('circle', 'A round shape'),
      w('square', 'A shape with four equal sides'),
      w('triangle', 'A shape with three sides'),
      w('orange', 'A color between red and yellow'),
      w('purple', 'A color made from red and blue'),
      w('oval', 'An egg-shaped figure'),
    ],
  },
  {
    id: 'starter-animals-he',
    language: 'he',
    nameKey: 'teacher.assignment.starterAnimals',
    descriptionKey: 'teacher.assignment.starterAnimalsDesc',
    words: [
      w('חתול', 'בעל חיים רך ופרוותי'),
      w('כלב', 'חבר נאמן בעל ארבע רגליים'),
      w('דג', 'בעל חיים שחי במים'),
      w('ציפור', 'בעל חיים שעף'),
      w('סוס', 'בעל חיים גדול לרכיבה'),
      w('נחש', 'בעל חיים ארוך ללא רגליים'),
      w('עכבר', 'מכרסם קטן'),
      w('צפרדע', 'דו-חי שקופץ'),
      w('דוב', 'בעל חיים גדול ופרוותי'),
      w('אריה', 'חתול גדול מלך החיות'),
    ],
  },
  {
    id: 'starter-food-he',
    language: 'he',
    nameKey: 'teacher.assignment.starterFood',
    descriptionKey: 'teacher.assignment.starterFoodDesc',
    words: [
      w('לחם', 'מאכל בסיסי מאפה'),
      w('חלב', 'משקה לבן מפרות'),
      w('תפוח', 'פרי עגול ומתוק'),
      w('גבינה', 'מוצר חלב מוצק'),
      w('ביצה', 'מזון מן העוף'),
      w('אורז', 'דגן לבן מבושל'),
      w('עוגה', 'קינוח מתוק'),
      w('מים', 'נוזל שקוף חיוני לחיים'),
      w('פיצה', 'מאכל איטלקי עם גבינה'),
      w('עוגיה', 'חטיף מתוק קטן'),
    ],
  },
  {
    id: 'starter-animals-sv',
    language: 'sv',
    nameKey: 'teacher.assignment.starterAnimals',
    descriptionKey: 'teacher.assignment.starterAnimalsDesc',
    words: [
      w('katt', 'Ett litet fluffigt husdjur'),
      w('hund', 'En trogen fyrfotat husdjur'),
      w('fisk', 'Ett djur som lever i vatten'),
      w('fågel', 'Ett djur som kan flyga'),
      w('häst', 'Ett större djur som man kan rida'),
      w('orm', 'Ett långt djur utan ben'),
      w('björn', 'Ett stort fluffigt djur'),
      w('lejon', 'En stor katt från Afrika'),
    ],
  },
  {
    id: 'starter-animals-es',
    language: 'es',
    nameKey: 'teacher.assignment.starterAnimals',
    descriptionKey: 'teacher.assignment.starterAnimalsDesc',
    words: [
      w('gato', 'Un pequeño animal doméstico esponjoso'),
      w('perro', 'Un animal leal de cuatro patas'),
      w('pez', 'Un animal que vive en el agua'),
      w('pájaro', 'Un animal que puede volar'),
      w('caballo', 'Un animal grande para montar'),
      w('serpiente', 'Un animal largo sin patas'),
      w('oso', 'Un animal grande y esponjoso'),
      w('león', 'Un gran gato de África'),
    ],
  },
  {
    id: 'starter-animals-ja',
    language: 'ja',
    nameKey: 'teacher.assignment.starterAnimals',
    descriptionKey: 'teacher.assignment.starterAnimalsDesc',
    words: [
      w('ねこ', '小さくてかわいいペット'),
      w('いぬ', '忠実な四本足のペット'),
      w('さかな', '水に住んでいる動物'),
      w('とり', '飛べる動物'),
      w('うま', 'のれる大きな動物'),
      w('へび', '足がない長い動物'),
      w('くま', '大きくてふかふかな動物'),
      w('ライオン', 'アフリカの大きなねこ'),
    ],
  },
  {
    id: 'starter-animals-ru',
    language: 'ru',
    nameKey: 'teacher.assignment.starterAnimals',
    descriptionKey: 'teacher.assignment.starterAnimalsDesc',
    words: [
      w('кошка', 'Маленькое пушистое домашнее животное'),
      w('собака', 'Верный четырёхногий питомец'),
      w('рыба', 'Животное, которое живёт в воде'),
      w('птица', 'Животное, которое может летать'),
      w('лошадь', 'Большое животное для верховой езды'),
      w('змея', 'Длинное животное без ног'),
      w('медведь', 'Большое пушистое животное'),
      w('лев', 'Большой кот из Африки'),
    ],
  },
];

/** Local calendar date `days` from `now`, YYYY-MM-DD — what `<input type="date">` writes. */
export function dueDateIso(daysFromNow: number, now = new Date()): string {
  const d = new Date(now.getTime());
  d.setDate(d.getDate() + daysFromNow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Packs for this classroom language. English is the fallback so a language
 * without packs still has a one-tap path (never an empty grid).
 */
export function firstAssignmentTemplatesFor(language: Language): FirstAssignmentTemplate[] {
  const match = FIRST_ASSIGNMENT_TEMPLATES.filter((t) => t.language === language);
  if (match.length > 0) return match;
  return FIRST_ASSIGNMENT_TEMPLATES.filter((t) => t.language === 'en');
}

export async function assignFirstAssignmentTemplate({
  template,
  classroomId,
  teacherId,
  lessonName,
  lessonDescription,
  createLesson,
  now,
}: {
  template: FirstAssignmentTemplate;
  classroomId: string;
  teacherId: string;
  lessonName: string;
  lessonDescription?: string;
  createLesson: CreateLessonFn;
  now?: Date;
}): Promise<CreateLessonAndAssignResult> {
  return createLessonAndAssign({
    lesson: {
      name: lessonName,
      description: lessonDescription,
      language: template.language,
      words: template.words,
      classroomId,
      isPublic: false,
    },
    teacherId,
    createLesson,
    dueDate: dueDateIso(FIRST_ASSIGNMENT_DUE_IN_DAYS, now),
    practiceFocus: WORDCRAFT_FOCUS,
  });
}
