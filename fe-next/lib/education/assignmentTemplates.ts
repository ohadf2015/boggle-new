/**
 * Assignment template gallery — pre-made word-list assignments a teacher can
 * browse by grade band and subject, preview, and one-click assign to a
 * classroom.
 *
 * Stored as a typed in-repo data file (no CMS) so the gallery ships with the
 * same review gate as code. Assigning reuses the exact creation path a
 * hand-built lesson takes (`createLessonAndAssign` → `vocabulary_lessons` +
 * `lesson_assignments`), so Academy/progress reporting sees a normal
 * assignment. i18n follows the starter-pack convention: `nameKey`/
 * `descriptionKey` resolve at render/assign time via `t()`.
 */
import type {
  CurriculumSubject,
  Language,
  VocabularyWord,
} from '@/lib/supabase/education/types';
import { WORDCRAFT_FOCUS } from './wordcraftAssignment';
import {
  createLessonAndAssign,
  type CreateLessonFn,
  type CreateLessonAndAssignResult,
} from './createLessonWithAssignment';
import { dueDateIso } from './firstAssignmentTemplates';

export const ASSIGNMENT_TEMPLATE_DUE_IN_DAYS = 7;

export type AssignmentTemplateGradeBand = 'elementary' | 'middle' | 'high';

export type AssignmentTemplateSubject = Extract<
  CurriculumSubject,
  'english' | 'science' | 'geography'
>;

export interface AssignmentTemplate {
  id: string;
  gradeBand: AssignmentTemplateGradeBand;
  subject: AssignmentTemplateSubject;
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

export const ASSIGNMENT_TEMPLATE_GRADE_BANDS: AssignmentTemplateGradeBand[] = [
  'elementary',
  'middle',
  'high',
];

export const ASSIGNMENT_TEMPLATE_SUBJECTS: AssignmentTemplateSubject[] = [
  'english',
  'science',
  'geography',
];

export const ASSIGNMENT_TEMPLATES: AssignmentTemplate[] = [
  {
    id: 'tpl-elem-english-short-vowels',
    gradeBand: 'elementary',
    subject: 'english',
    language: 'en',
    nameKey: 'teacher.assignment.templates.shortVowels',
    descriptionKey: 'teacher.assignment.templates.shortVowelsDesc',
    words: [
      w('cat', 'A small furry pet that says meow'),
      w('hat', 'You wear it on your head'),
      w('map', 'A drawing that shows places'),
      w('pan', 'You cook eggs in it'),
      w('bat', 'An animal that flies at night'),
      w('van', 'A big car for carrying people or things'),
      w('jam', 'A sweet spread made from fruit'),
      w('fan', 'It blows air to cool you down'),
    ],
  },
  {
    id: 'tpl-elem-science-plant-parts',
    gradeBand: 'elementary',
    subject: 'science',
    language: 'en',
    nameKey: 'teacher.assignment.templates.plantParts',
    descriptionKey: 'teacher.assignment.templates.plantPartsDesc',
    words: [
      w('seed', 'The small part a plant grows from'),
      w('root', 'The part under the soil that drinks water'),
      w('stem', 'The stalk that holds a plant up'),
      w('leaf', 'The flat green part that catches sunlight'),
      w('flower', 'The colorful blooming part of a plant'),
      w('soil', 'The dirt plants grow in'),
      w('petal', 'One soft piece of a flower'),
      w('plant', 'A living thing that grows in soil'),
    ],
  },
  {
    id: 'tpl-elem-geography-land-water',
    gradeBand: 'elementary',
    subject: 'geography',
    language: 'en',
    nameKey: 'teacher.assignment.templates.landWater',
    descriptionKey: 'teacher.assignment.templates.landWaterDesc',
    words: [
      w('map', 'A picture that shows where places are'),
      w('hill', 'A small rounded rise in the land'),
      w('river', 'A long stream of flowing water'),
      w('lake', 'Water with land all around it'),
      w('ocean', 'A very large body of salt water'),
      w('city', 'A big town with many people'),
      w('road', 'A path for cars to travel on'),
      w('island', 'Land with water all around it'),
    ],
  },
  {
    id: 'tpl-mid-english-strong-adjectives',
    gradeBand: 'middle',
    subject: 'english',
    language: 'en',
    nameKey: 'teacher.assignment.templates.strongAdjectives',
    descriptionKey: 'teacher.assignment.templates.strongAdjectivesDesc',
    words: [
      w('enormous', 'Extremely large in size'),
      w('miniature', 'Extremely small in size'),
      w('ancient', 'Very old, from long ago'),
      w('fragile', 'Easy to break or damage'),
      w('sturdy', 'Strong and well built'),
      w('radiant', 'Shining or glowing brightly'),
      w('gloomy', 'Dark, dim, or sad'),
      w('modern', 'From the present time or recent'),
    ],
  },
  {
    id: 'tpl-mid-science-states-of-matter',
    gradeBand: 'middle',
    subject: 'science',
    language: 'en',
    nameKey: 'teacher.assignment.templates.statesOfMatter',
    descriptionKey: 'teacher.assignment.templates.statesOfMatterDesc',
    words: [
      w('solid', 'Matter with a fixed shape'),
      w('liquid', 'Matter that flows and takes a container\'s shape'),
      w('gas', 'Matter that spreads to fill any space'),
      w('melt', 'To change from solid to liquid'),
      w('freeze', 'To change from liquid to solid'),
      w('evaporate', 'To change from liquid to gas'),
      w('condense', 'To change from gas to liquid'),
      w('particle', 'A tiny piece of matter'),
    ],
  },
  {
    id: 'tpl-mid-geography-landforms',
    gradeBand: 'middle',
    subject: 'geography',
    language: 'en',
    nameKey: 'teacher.assignment.templates.landforms',
    descriptionKey: 'teacher.assignment.templates.landformsDesc',
    words: [
      w('canyon', 'A deep valley with steep rocky sides'),
      w('plateau', 'A flat area of land raised above the land around it'),
      w('glacier', 'A slow-moving river of ice'),
      w('delta', 'Land built where a river meets the sea'),
      w('oasis', 'A fertile spot in a desert with water'),
      w('tundra', 'A cold, treeless plain'),
      w('volcano', 'A mountain that can erupt lava'),
      w('peninsula', 'Land almost surrounded by water'),
    ],
  },
  {
    id: 'tpl-high-english-college-prep',
    gradeBand: 'high',
    subject: 'english',
    language: 'en',
    nameKey: 'teacher.assignment.templates.collegePrep',
    descriptionKey: 'teacher.assignment.templates.collegePrepDesc',
    words: [
      w('ambivalent', 'Having mixed feelings about something'),
      w('resilient', 'Able to recover quickly from difficulty'),
      w('meticulous', 'Showing great attention to detail'),
      w('candid', 'Truthful and straightforward'),
      w('futile', 'Useless, having no effect'),
      w('obscure', 'Not well known or hard to understand'),
      w('tedious', 'Too long or slow, boring'),
      w('pragmatic', 'Practical rather than idealistic'),
    ],
  },
  {
    id: 'tpl-high-science-genetics',
    gradeBand: 'high',
    subject: 'science',
    language: 'en',
    nameKey: 'teacher.assignment.templates.genetics',
    descriptionKey: 'teacher.assignment.templates.geneticsDesc',
    words: [
      w('allele', 'One version of a gene'),
      w('chromosome', 'A thread-like strand of DNA in a cell'),
      w('genome', 'The full set of an organism\'s genes'),
      w('mutation', 'A change in a gene\'s DNA'),
      w('heredity', 'The passing of traits from parent to child'),
      w('trait', 'A characteristic passed down genetically'),
      w('nucleus', 'The cell part that holds DNA'),
      w('protein', 'A molecule built from genes\' instructions'),
    ],
  },
  {
    id: 'tpl-high-geography-world',
    gradeBand: 'high',
    subject: 'geography',
    language: 'en',
    nameKey: 'teacher.assignment.templates.worldGeography',
    descriptionKey: 'teacher.assignment.templates.worldGeographyDesc',
    words: [
      w('hemisphere', 'Half of the Earth divided by a line'),
      w('latitude', 'Distance north or south of the equator'),
      w('longitude', 'Distance east or west of the prime meridian'),
      w('climate', 'The typical weather of a place over time'),
      w('migration', 'The movement of people from one place to another'),
      w('urbanization', 'The growth of cities as people move to them'),
      w('border', 'The line separating two countries'),
      w('continent', 'One of Earth\'s large land masses'),
    ],
  },
];

/**
 * Templates for this classroom language. English is the fallback so a
 * language without templates still sees a full gallery (never an empty grid).
 */
export function assignmentTemplatesFor(language: Language): AssignmentTemplate[] {
  const match = ASSIGNMENT_TEMPLATES.filter((t) => t.language === language);
  if (match.length > 0) return match;
  return ASSIGNMENT_TEMPLATES.filter((t) => t.language === 'en');
}

/**
 * One-click assign: creates the template's lesson and links a normal
 * assignment to the classroom through the shared creation path — the same
 * `lesson_assignments` row a hand-built lesson produces.
 */
export async function assignAssignmentTemplate({
  template,
  classroomId,
  teacherId,
  lessonName,
  lessonDescription,
  createLesson,
  now,
}: {
  template: AssignmentTemplate;
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
    dueDate: dueDateIso(ASSIGNMENT_TEMPLATE_DUE_IN_DAYS, now),
    practiceFocus: WORDCRAFT_FOCUS,
  });
}
