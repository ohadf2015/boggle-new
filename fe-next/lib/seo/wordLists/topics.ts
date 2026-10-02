/**
 * One topic taxonomy for list names written in English, Hebrew and Spanish.
 * Order matters: specific topics are tried before broad ones ("Basic Food" is food,
 * not everyday words; "בית ספר" is school, not home).
 */
export const TOPIC_IDS = [
  'animals',
  'food',
  'body',
  'colors',
  'numbers',
  'family',
  'clothes',
  'school',
  'home',
  'weather-seasons',
  'calendar',
  'emotions',
  'verbs',
  'adjectives',
  'transportation',
  'jobs',
  'technology',
  'question-words',
  'literature',
  'academic',
  'science',
  'math',
  'history',
  'geography',
  'everyday-words',
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];

const RULES: ReadonlyArray<[TopicId, RegExp]> = [
  ['academic', /bagrut|בגרות|academic|אקדמי/i],
  ['animals', /animal|חיות|חיה|בעלי חיים|animales/i],
  ['food', /food|meal|drink|kitchen|fruit|vegetable|אוכל|ארוח|פירות|ירקות|מטבח|comida/i],
  ['body', /body|גוף|cuerpo/i],
  ['colors', /colou?r|shape|צבע|colores/i],
  ['numbers', /number|מספר|números/i],
  ['family', /family|people|משפחה|אנשים|familia/i],
  ['clothes', /cloth|בגד|ropa/i],
  ['school', /school|ציוד|בית ספר|בית הספר|לימוד|escuela/i],
  ['home', /home|house|room|הבית|חדרים|casa/i],
  ['weather-seasons', /weather|season|מזג|עונות|clima/i],
  ['calendar', /days of the week|months|ימות השבוע|חודשי/i],
  ['emotions', /emotion|feeling|רגש|emocion/i],
  ['verbs', /verb|פעל/i],
  ['adjectives', /adjective|descriptive|synonym|תואר|נרדפות|descriptivo/i],
  ['transportation', /transport|תחבורה/i],
  ['jobs', /profession|job|מקצועות/i],
  ['technology', /technolog|טכנולוג/i],
  ['question-words', /question|מילות שאלה/i],
  ['literature', /literar|ספרות|literatura/i],
  ['academic', /transition|linking|abstract|מופשט|קישור|band 2|high school|לתיכון|writing|filosof|ética|ערכים|valores/i],
  ['science', /science|מדע|biology|chemistry|physics|ciencias/i],
  ['math', /math|algebra|geometry|calculus|trigonometry|quadratic|equation|מתמטיקה|matemáticas/i],
  ['history', /history|היסטוריה|historia|ancient|middle ages|ציביליזציות/i],
  ['geography', /geograph|גאוגרפיה|גיאוגרפיה|maps|geografía/i],
];

const SUBJECT_TOPIC: Record<string, TopicId> = {
  science: 'science',
  math: 'math',
  history: 'history',
  geography: 'geography',
};

export function classifyTopic(name: string, description: string, subject: string): TopicId {
  for (const [topic, re] of RULES) if (re.test(name)) return topic;
  if (SUBJECT_TOPIC[subject]) return SUBJECT_TOPIC[subject];
  for (const [topic, re] of RULES) if (re.test(description)) return topic;
  return 'everyday-words';
}

export function isTopicId(value: string): value is TopicId {
  return (TOPIC_IDS as readonly string[]).includes(value);
}
