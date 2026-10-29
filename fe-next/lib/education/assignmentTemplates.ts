/**
 * Assignment template gallery — pre-made word-list homework, in-repo, no CMS.
 *
 * Time-to-first-assignment is the Teacher Pro activation lever: teachers stall
 * on a blank lesson dropdown. These packs are organized by grade band + subject
 * so a teacher can preview a list and one-click assign a normal classroom
 * assignment (createLessonAndAssign — same path as a hand-built lesson).
 */
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';
import { WORDCRAFT_FOCUS } from './wordcraftAssignment';
import {
  createLessonAndAssign,
  type CreateLessonFn,
  type CreateLessonAndAssignResult,
} from './createLessonWithAssignment';
import { dueDateIso, FIRST_ASSIGNMENT_DUE_IN_DAYS } from './firstAssignmentTemplates';
import { INTL_ASSIGNMENT_TEMPLATES } from './assignmentTemplatesIntl';

export const GRADE_BANDS = ['k-2', '3-5', '6-8'] as const;
export type GradeBand = (typeof GRADE_BANDS)[number];

export const SUBJECTS = ['english', 'language', 'science', 'geography'] as const;
export type AssignmentSubject = (typeof SUBJECTS)[number];

export interface AssignmentTemplate {
  id: string;
  language: Language;
  gradeBand: GradeBand;
  subject: AssignmentSubject;
  nameKey: string;
  descriptionKey: string;
  words: VocabularyWord[];
}

const w = (word: string, definition: string): VocabularyWord => ({
  word,
  definition,
  canIntegrate: true,
});

export const ASSIGNMENT_TEMPLATES: AssignmentTemplate[] = [
  {
    id: 'en-k2-english-animals',
    language: 'en',
    gradeBand: 'k-2',
    subject: 'english',
    nameKey: 'teacher.assignment.templateK2EnglishAnimals',
    descriptionKey: 'teacher.assignment.templateK2EnglishAnimalsDesc',
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
    id: 'en-k2-science-senses',
    language: 'en',
    gradeBand: 'k-2',
    subject: 'science',
    nameKey: 'teacher.assignment.templateK2ScienceSenses',
    descriptionKey: 'teacher.assignment.templateK2ScienceSensesDesc',
    words: [
      w('see', 'To look with your eyes'),
      w('hear', 'To listen with your ears'),
      w('touch', 'To feel with your hands'),
      w('smell', 'To notice a scent with your nose'),
      w('taste', 'To notice flavor with your tongue'),
      w('plant', 'A living thing that grows in soil'),
      w('water', 'A clear liquid living things need'),
      w('sun', 'The star that lights the day'),
      w('seed', 'The part of a plant that can grow'),
      w('leaf', 'The green part of a plant'),
    ],
  },
  {
    id: 'en-k2-geography-places',
    language: 'en',
    gradeBand: 'k-2',
    subject: 'geography',
    nameKey: 'teacher.assignment.templateK2GeographyPlaces',
    descriptionKey: 'teacher.assignment.templateK2GeographyPlacesDesc',
    words: [
      w('map', 'A drawing that shows places'),
      w('city', 'A large town with many people'),
      w('road', 'A path for cars and buses'),
      w('hill', 'Land that rises above the ground'),
      w('river', 'Water that flows across land'),
      w('lake', 'A body of water with land around it'),
      w('park', 'A green place to play outside'),
      w('home', 'The place where you live'),
      w('school', 'A place where students learn'),
      w('world', 'The planet we all live on'),
    ],
  },
  {
    id: 'en-35-english-colors',
    language: 'en',
    gradeBand: '3-5',
    subject: 'english',
    nameKey: 'teacher.assignment.template35EnglishColors',
    descriptionKey: 'teacher.assignment.template35EnglishColorsDesc',
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
    id: 'en-35-science-earth',
    language: 'en',
    gradeBand: '3-5',
    subject: 'science',
    nameKey: 'teacher.assignment.template35ScienceEarth',
    descriptionKey: 'teacher.assignment.template35ScienceEarthDesc',
    words: [
      w('earth', 'The planet we live on'),
      w('water', 'A clear liquid essential for life'),
      w('plant', 'A living organism that grows in soil'),
      w('energy', 'The power to do work'),
      w('force', 'A push or pull on an object'),
      w('matter', 'Anything that has mass and takes up space'),
      w('light', 'Energy that lets us see'),
      w('sound', 'Vibrations we can hear'),
      w('heat', 'Energy that makes things warm'),
      w('magnet', 'An object that attracts metal'),
    ],
  },
  {
    id: 'en-35-geography-continents',
    language: 'en',
    gradeBand: '3-5',
    subject: 'geography',
    nameKey: 'teacher.assignment.template35GeographyContinents',
    descriptionKey: 'teacher.assignment.template35GeographyContinentsDesc',
    words: [
      w('africa', 'A continent south of Europe'),
      w('asia', 'The largest continent'),
      w('europe', 'A continent west of Asia'),
      w('ocean', 'A very large body of salt water'),
      w('island', 'Land with water all around it'),
      w('desert', 'A dry place with little rain'),
      w('forest', 'A large area with many trees'),
      w('mountain', 'Very high land that rises steeply'),
      w('coast', 'Land next to the sea'),
      w('equator', 'An imaginary line around the middle of Earth'),
    ],
  },
  {
    id: 'en-68-english-academic',
    language: 'en',
    gradeBand: '6-8',
    subject: 'english',
    nameKey: 'teacher.assignment.template68EnglishAcademic',
    descriptionKey: 'teacher.assignment.template68EnglishAcademicDesc',
    words: [
      w('analyze', 'To examine something in detail'),
      w('evidence', 'Facts that help prove something is true'),
      w('summarize', 'To give the main points briefly'),
      w('compare', 'To find similarities and differences'),
      w('context', 'The situation surrounding a word or event'),
      w('infer', 'To figure out meaning from clues'),
      w('theme', 'The central idea of a text'),
      w('source', 'Where information comes from'),
      w('argue', 'To give reasons for a claim'),
      w('revise', 'To change writing to make it clearer'),
    ],
  },
  {
    id: 'en-68-science-energy',
    language: 'en',
    gradeBand: '6-8',
    subject: 'science',
    nameKey: 'teacher.assignment.template68ScienceEnergy',
    descriptionKey: 'teacher.assignment.template68ScienceEnergyDesc',
    words: [
      w('energy', 'The ability to do work or cause change'),
      w('matter', 'Anything that has mass and volume'),
      w('atom', 'The smallest unit of an element'),
      w('gravity', 'The force that pulls objects toward Earth'),
      w('circuit', 'A closed path electricity can flow through'),
      w('habitat', 'The place where an organism lives'),
      w('cell', 'The basic unit of living things'),
      w('climate', 'The usual weather of a place over time'),
      w('variable', 'Something that can change in an experiment'),
      w('hypothesis', 'A testable explanation for an observation'),
    ],
  },
  {
    id: 'en-68-geography-climate',
    language: 'en',
    gradeBand: '6-8',
    subject: 'geography',
    nameKey: 'teacher.assignment.template68GeographyClimate',
    descriptionKey: 'teacher.assignment.template68GeographyClimateDesc',
    words: [
      w('climate', 'Typical weather of a region over many years'),
      w('latitude', 'Distance north or south of the equator'),
      w('longitude', 'Distance east or west of the prime meridian'),
      w('current', 'A stream of water moving through the ocean'),
      w('erosion', 'Wearing away of land by water or wind'),
      w('urban', 'Related to cities'),
      w('rural', 'Related to the countryside'),
      w('migration', 'Movement of people from one place to another'),
      w('resource', 'Something people use from the environment'),
      w('border', 'A line that separates two places'),
    ],
  },
  ...INTL_ASSIGNMENT_TEMPLATES,
];

export function assignmentTemplatesFor(language: Language): AssignmentTemplate[] {
  const match = ASSIGNMENT_TEMPLATES.filter((t) => t.language === language);
  if (match.length > 0) return match;
  return ASSIGNMENT_TEMPLATES.filter((t) => t.language === 'en');
}

export function filterAssignmentTemplates({
  language,
  gradeBand,
  subject,
}: {
  language: Language;
  gradeBand?: GradeBand | 'all';
  subject?: AssignmentSubject | 'all';
}): AssignmentTemplate[] {
  return assignmentTemplatesFor(language).filter((t) => {
    if (gradeBand && gradeBand !== 'all' && t.gradeBand !== gradeBand) return false;
    if (subject && subject !== 'all' && t.subject !== subject) return false;
    return true;
  });
}

export function getAssignmentTemplate(id: string): AssignmentTemplate | undefined {
  return ASSIGNMENT_TEMPLATES.find((t) => t.id === id);
}

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
    dueDate: dueDateIso(FIRST_ASSIGNMENT_DUE_IN_DAYS, now),
    practiceFocus: WORDCRAFT_FOCUS,
  });
}
