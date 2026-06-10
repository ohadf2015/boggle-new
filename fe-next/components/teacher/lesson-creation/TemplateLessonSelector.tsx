/**
 * TemplateLessonSelector Component
 *
 * Allows teachers to browse and select pre-built lesson templates
 * filtered by classroom language and category.
 *
 * Templates are hardcoded for Phase 42 (DB storage is future enhancement).
 */

'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { BookTemplate, Download } from 'lucide-react';
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';

// ============================================
// TYPES
// ============================================

interface LessonTemplate {
  id: string;
  name: string;
  description: string;
  language: Language;
  wordCount: number;
  category: 'grade-1' | 'grade-2' | 'grade-3' | 'academic' | 'everyday';
  words: VocabularyWord[];
}

interface TemplateLessonSelectorProps {
  onSelect: (template: LessonTemplate) => void;
  classroomLanguage: Language;
}

type CategoryFilter = 'all' | 'grade-1' | 'grade-2' | 'grade-3' | 'academic' | 'everyday';

// ============================================
// HARDCODED TEMPLATES (Phase 42 scope)
// ============================================

const LESSON_TEMPLATES: LessonTemplate[] = [
  // English Templates
  {
    id: 'en-grade1-animals',
    name: 'Grade 1: Animals',
    description: 'Common animal words for early learners',
    language: 'en',
    wordCount: 10,
    category: 'grade-1',
    words: [
      { word: 'cat', definition: 'A small furry pet', canIntegrate: true },
      { word: 'dog', definition: 'A loyal four-legged pet', canIntegrate: true },
      { word: 'fish', definition: 'An animal that swims in water', canIntegrate: true },
      { word: 'bird', definition: 'An animal that flies', canIntegrate: true },
      { word: 'horse', definition: 'A large animal used for riding', canIntegrate: true },
      { word: 'snake', definition: 'A long animal with no legs', canIntegrate: true },
      { word: 'mouse', definition: 'A small rodent', canIntegrate: true },
      { word: 'frog', definition: 'An amphibian that hops', canIntegrate: true },
      { word: 'bear', definition: 'A large furry animal', canIntegrate: true },
      { word: 'lion', definition: 'A big cat known as king of the jungle', canIntegrate: true },
    ],
  },
  {
    id: 'en-grade2-colors',
    name: 'Grade 2: Colors & Shapes',
    description: 'Colors and basic shapes vocabulary',
    language: 'en',
    wordCount: 10,
    category: 'grade-2',
    words: [
      { word: 'red', definition: 'The color of apples', canIntegrate: true },
      { word: 'blue', definition: 'The color of the sky', canIntegrate: true },
      { word: 'green', definition: 'The color of grass', canIntegrate: true },
      { word: 'yellow', definition: 'The color of the sun', canIntegrate: true },
      { word: 'circle', definition: 'A round shape', canIntegrate: true },
      { word: 'square', definition: 'A shape with four equal sides', canIntegrate: true },
      { word: 'triangle', definition: 'A shape with three sides', canIntegrate: true },
      { word: 'orange', definition: 'A color between red and yellow', canIntegrate: true },
      { word: 'purple', definition: 'A color made from red and blue', canIntegrate: true },
      { word: 'oval', definition: 'An egg-shaped figure', canIntegrate: true },
    ],
  },
  {
    id: 'en-academic-science',
    name: 'Academic: Science Terms',
    description: 'Common science vocabulary for elementary students',
    language: 'en',
    wordCount: 10,
    category: 'academic',
    words: [
      { word: 'water', definition: 'A clear liquid essential for life', canIntegrate: true },
      { word: 'plant', definition: 'A living organism that grows in soil', canIntegrate: true },
      { word: 'energy', definition: 'The power to do work', canIntegrate: true },
      { word: 'earth', definition: 'The planet we live on', canIntegrate: true },
      { word: 'force', definition: 'A push or pull on an object', canIntegrate: true },
      { word: 'matter', definition: 'Anything that has mass and takes up space', canIntegrate: true },
      { word: 'light', definition: 'Energy that lets us see', canIntegrate: true },
      { word: 'sound', definition: 'Vibrations we can hear', canIntegrate: true },
      { word: 'heat', definition: 'Energy that makes things warm', canIntegrate: true },
      { word: 'magnet', definition: 'An object that attracts metal', canIntegrate: true },
    ],
  },
  // Hebrew Templates (normalized without niqqud)
  {
    id: 'he-grade1-animals',
    name: 'כיתה א: חיות',
    description: 'מילות חיות נפוצות לתלמידים צעירים',
    language: 'he',
    wordCount: 10,
    category: 'grade-1',
    words: [
      { word: 'חתול', definition: 'בעל חיים רך ופרוותי', canIntegrate: true },
      { word: 'כלב', definition: 'חבר נאמן בעל ארבע רגליים', canIntegrate: true },
      { word: 'דג', definition: 'בעל חיים שחי במים', canIntegrate: true },
      { word: 'ציפור', definition: 'בעל חיים שעף', canIntegrate: true },
      { word: 'סוס', definition: 'בעל חיים גדול לרכיבה', canIntegrate: true },
      { word: 'נחש', definition: 'בעל חיים ארוך ללא רגליים', canIntegrate: true },
      { word: 'עכבר', definition: 'מכרסם קטן', canIntegrate: true },
      { word: 'צפרדע', definition: 'דו-חיים שקופץ', canIntegrate: true },
      { word: 'דב', definition: 'בעל חיים גדול ופרוותי', canIntegrate: true },
      { word: 'אריה', definition: 'חתול גדול הידוע כמלך הג׳ונגל', canIntegrate: true },
    ],
  },
  {
    id: 'he-grade2-family',
    name: 'כיתה ב: משפחה',
    description: 'אוצר מילים של קרובי משפחה',
    language: 'he',
    wordCount: 10,
    category: 'grade-2',
    words: [
      { word: 'אמא', definition: 'הורה נקבה', canIntegrate: true },
      { word: 'אבא', definition: 'הורה זכר', canIntegrate: true },
      { word: 'אח', definition: 'בן זכר של ההורים', canIntegrate: true },
      { word: 'אחות', definition: 'בת נקבה של ההורים', canIntegrate: true },
      { word: 'סבא', definition: 'אבא של ההורה', canIntegrate: true },
      { word: 'סבתא', definition: 'אמא של ההורה', canIntegrate: true },
      { word: 'דוד', definition: 'אח של ההורה', canIntegrate: true },
      { word: 'דודה', definition: 'אחות של ההורה', canIntegrate: true },
      { word: 'בן', definition: 'ילד זכר', canIntegrate: true },
      { word: 'בת', definition: 'ילדה נקבה', canIntegrate: true },
    ],
  },
  {
    id: 'he-everyday-food',
    name: 'יומיומי: אוכל',
    description: 'מילות אוכל שימושיות',
    language: 'he',
    wordCount: 10,
    category: 'everyday',
    words: [
      { word: 'לחם', definition: 'מזון בסיסי מקמח', canIntegrate: true },
      { word: 'חלב', definition: 'נוזל לבן מפרות', canIntegrate: true },
      { word: 'ביצה', definition: 'מזון מעוף', canIntegrate: true },
      { word: 'גבינה', definition: 'מוצר חלב מוצק', canIntegrate: true },
      { word: 'תפוח', definition: 'פרי עגול ומתוק', canIntegrate: true },
      { word: 'בננה', definition: 'פרי צהוב וארוך', canIntegrate: true },
      { word: 'עוגה', definition: 'קינוח מתוק', canIntegrate: true },
      { word: 'מים', definition: 'נוזל שקוף חיוני לחיים', canIntegrate: true },
      { word: 'פיצה', definition: 'מאכל איטלקי עם גבינה', canIntegrate: true },
      { word: 'עוגיה', definition: 'חטיף מתוק קטן', canIntegrate: true },
    ],
  },
];

// ============================================
// COMPONENT
// ============================================

export default function TemplateLessonSelector({
  onSelect,
  classroomLanguage,
}: TemplateLessonSelectorProps) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');

  // Filter templates by classroom language
  const languageFilteredTemplates = useMemo(
    () => LESSON_TEMPLATES.filter((template) => template.language === classroomLanguage),
    [classroomLanguage]
  );

  // Further filter by category
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') {
      return languageFilteredTemplates;
    }
    return languageFilteredTemplates.filter((template) => template.category === selectedCategory);
  }, [languageFilteredTemplates, selectedCategory]);

  const categories: CategoryFilter[] = ['all', 'grade-1', 'grade-2', 'grade-3', 'academic', 'everyday'];

  return (
    <div className="bg-neo-navy/50 border-neo border-neo-black rounded-neo p-6">
      <div className="flex items-center gap-3 mb-4">
        <BookTemplate className="w-6 h-6 text-neo-cyan" />
        <h3 className="text-xl font-neo-display text-neo-white">
          {t('teacher.lesson.templates')}
        </h3>
      </div>

      {/* Category filters */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              'px-3 py-2 rounded-neo border-neo font-neo-body text-sm transition-all',
              selectedCategory === category
                ? 'bg-neo-pink text-neo-black shadow-hard-sm'
                : 'bg-neo-navy text-neo-white hover:bg-neo-navy/80'
            )}
          >
            {t(`teacher.lesson.category.${category}`)}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={cn(
              'p-4 bg-neo-black/30 border-neo border-neo-cyan/50',
              'rounded-neo text-left hover:shadow-hard-sm transition-all',
              'hover:translate-x-[-2px] hover:translate-y-[-2px]'
            )}
          >
            <div className="font-neo-display text-neo-white mb-1 text-balance">
              {template.name}
            </div>
            <div className="text-sm text-neo-white mb-2 text-pretty">
              {template.description}
            </div>
            <div className="flex items-center gap-2 text-xs text-neo-cyan">
              <Download className="w-3 h-3" />
              {template.wordCount} {classroomLanguage === 'he' ? 'מילים' : 'words'}
            </div>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-neo-white font-neo-body">
          No templates available for this category
        </div>
      )}
    </div>
  );
}
