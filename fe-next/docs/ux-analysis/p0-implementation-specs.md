# Teacher Onboarding Wizard - Detailed Specification

**Feature**: 3-Step Guided Onboarding for New Teachers
**Impact**: Time to first lesson: 20 min → 5 min (75% reduction)
**Effort**: Medium (5-7 days)

---

## Wizard Flow Diagram

```
┌─────────────────────────────────────────┐
│ Check: Has teacher completed onboarding?│
└───────────┬─────────────────────────────┘
            │
     ┌──────┴──────┐
     │             │
    Yes            No
     │             │
     │        ┌────▼────┐
     │        │ Show    │
     │        │ Wizard  │
     │        └────┬────┘
     │             │
     │   ┌─────────▼─────────┐
     │   │ Step 1: Classroom │
     │   └─────────┬─────────┘
     │             │
     │   ┌─────────▼─────────┐
     │   │ Step 2: Lesson    │
     │   └─────────┬─────────┘
     │             │
     │   ┌─────────▼─────────┐
     │   │ Step 3: Invite    │
     │   └─────────┬─────────┘
     │             │
     │   ┌─────────▼─────────┐
     │   │ Completion        │
     │   └─────────┬─────────┘
     │             │
     │   Mark onboarding_completed = true
     │             │
     └─────────────▼─────────────────────┐
               │ Dashboard               │
               └─────────────────────────┘
```

---

## Step-by-Step Visual Mockups

### Step 1: Create Your First Classroom

```
┌──────────────────────────────────────────────────────┐
│  🎓 Step 1 of 3: Create Your First Classroom         │
│  ●──○──○                                             │ (Progress)
│                                                      │
│  This is where your students will gather to learn.  │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Classroom Name *                               │ │
│  │ [English 101                             ]     │ │ (Pre-filled)
│  │                                                │ │
│  │ Description (optional)                         │ │
│  │ [Beginner English vocabulary and grammar  ]    │ │
│  │                                                │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  📱 Preview: What students will see                  │
│  ┌────────────────────────────────────────────────┐ │
│  │ English 101                                    │ │
│  │ Beginner English vocabulary and grammar        │ │
│  │                                                │ │
│  │ [Join with Code: ABC123]                       │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [Skip this step]            [Next: Choose Lesson →]│
│                                                      │
│  (Skipping creates "My Classroom" with default settings)
└──────────────────────────────────────────────────────┘
```

---

### Step 2: Choose a Starter Lesson

```
┌──────────────────────────────────────────────────────┐
│  📚 Step 2 of 3: Choose a Starter Lesson             │
│  ○──●──○                                             │
│                                                      │
│  Pick a template to get started quickly, or import  │
│  your own word list.                                │
│                                                      │
│  ┌─────────────────┬─────────────────┬─────────────┐│
│  │ Basic Vocabulary│  SAT Prep       │ ESL Beginner││ (Templates)
│  │                 │                 │             ││
│  │ 20 common words │ 50 SAT words    │ 30 ESL words││
│  │ Beginner        │ Advanced        │ Beginner    ││
│  │                 │                 │             ││
│  │ [Preview]       │ [Preview]       │ [Preview]   ││
│  │ [Select] ✓      │ [Select]        │ [Select]    ││ (Selected)
│  └─────────────────┴─────────────────┴─────────────┘│
│                                                      │
│  Or import your own:                                │
│  ┌────────────────────────────────────────────────┐ │
│  │ [📎 Upload CSV File]  [✏️ Enter Words Manually] │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [← Back]                     [Next: Invite Students→]│
└──────────────────────────────────────────────────────┘

Template Preview Modal (when clicking "Preview"):
┌──────────────────────────────────────────────────────┐
│  Basic Vocabulary - Preview              [✕]         │
│                                                      │
│  Words included (20 total):                          │
│  ┌────────────────────────────────────────────────┐ │
│  │ 1. Apple      - A round fruit                  │ │
│  │ 2. Book       - Pages bound together           │ │
│  │ 3. Cat        - A small domestic animal        │ │
│  │ 4. Dog        - A domesticated canine          │ │
│  │ 5. Elephant   - A large mammal with trunk      │ │
│  │ ...           - (15 more words)                │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Difficulty: ●○○ Beginner                           │
│  Estimated practice time: 10-15 minutes             │
│                                                      │
│  [Close]                              [Select This] │
└──────────────────────────────────────────────────────┘
```

---

### Step 3: Invite Students

```
┌──────────────────────────────────────────────────────┐
│  🎉 Step 3 of 3: Invite Your Students                │
│  ○──○──●                                             │
│                                                      │
│  Share this join code with your students to get     │
│  started!                                            │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │           Join Code                            │ │
│  │      ┌──────────────┐                          │ │
│  │      │   ABC123     │  (Large, bold)           │ │
│  │      └──────────────┘                          │ │
│  │                                                │ │
│  │  ┌──────────────┐                              │ │
│  │  │ [QR Code]    │  (Scannable QR)              │ │
│  │  └──────────────┘                              │ │
│  │                                                │ │
│  │  [📋 Copy Join Code]  [📤 Copy Invite Link]    │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Or send via email:                                 │
│  ┌────────────────────────────────────────────────┐ │
│  │ To: [students@example.com              ]       │ │
│  │                                                │ │
│  │ Subject: Join my LexiClash classroom           │ │
│  │                                                │ │
│  │ Body:                                          │ │
│  │ Hi! I've created a LexiClash classroom for     │ │
│  │ us. Join using code: ABC123                    │ │
│  │                                                │ │
│  │ Or click this link: [invite link]              │ │
│  │                                                │ │
│  │ [✉️ Send Email]                                 │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [← Back]    [Skip for Now]  [Finish Setup →]       │
└──────────────────────────────────────────────────────┘
```

---

### Completion Screen

```
┌──────────────────────────────────────────────────────┐
│  🎊 You're All Set!                                  │
│                                                      │
│  Your classroom is ready to go! Here's what you     │
│  created:                                            │
│                                                      │
│  ✅ Classroom: English 101                           │
│  ✅ Lesson: Basic Vocabulary (20 words)              │
│  ✅ Join Code: ABC123                                │
│                                                      │
│  Next Steps:                                         │
│  • Wait for students to join using the code         │
│  • Explore the analytics dashboard                  │
│  • Create more lessons when ready                   │
│                                                      │
│  📹 Want a quick tour?                               │
│  We can show you around the teacher dashboard in    │
│  2 minutes.                                          │
│                                                      │
│  [Take the Tour]          [Skip to Dashboard]        │
│                                                      │
│  (You can access this tour later from Help menu)    │
└──────────────────────────────────────────────────────┘
```

---

## Component Implementation

### Main Wizard Component

```typescript
// components/teacher/TeacherOnboardingWizard.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { WelcomeScreen } from './onboarding/WelcomeScreen';
import { ClassroomStep } from './onboarding/ClassroomStep';
import { LessonStep } from './onboarding/LessonStep';
import { InviteStep } from './onboarding/InviteStep';
import { CompletionScreen } from './onboarding/CompletionScreen';

export type OnboardingData = {
  classroom: {
    name: string;
    description: string;
  } | null;
  lesson: {
    template: string | null;
    customWords: Array<{ word: string; definition: string }>;
  } | null;
  joinCode: string | null;
};

export function TeacherOnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<'welcome' | 1 | 2 | 3 | 'complete'>('welcome');
  const [data, setData] = useState<OnboardingData>({
    classroom: null,
    lesson: null,
    joinCode: null
  });
  const router = useRouter();

  const handleWelcome = () => {
    setStep(1);
  };

  const handleSkipSetup = async () => {
    // Create defaults and mark onboarding complete
    await createDefaults();
    await markOnboardingComplete();
    onComplete();
    router.push('/teacher');
  };

  const handleStep1 = (classroom: OnboardingData['classroom']) => {
    setData(prev => ({ ...prev, classroom }));
    setStep(2);
  };

  const handleStep2 = (lesson: OnboardingData['lesson']) => {
    setData(prev => ({ ...prev, lesson }));
    setStep(3);
  };

  const handleStep3 = async (joinCode: string) => {
    setData(prev => ({ ...prev, joinCode }));
    setStep('complete');
  };

  const handleFinish = async () => {
    await markOnboardingComplete();
    onComplete();
    router.push('/teacher');
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-3xl bg-neo-navy border-neo border-black rounded-neo shadow-hard-lg"
        hideCloseButton // Prevent closing wizard mid-flow
      >
        {step === 'welcome' && (
          <WelcomeScreen
            onStart={handleWelcome}
            onSkip={handleSkipSetup}
          />
        )}

        {step === 1 && (
          <ClassroomStep
            onNext={handleStep1}
            onSkip={() => handleStep1(null)} // Skip creates default
          />
        )}

        {step === 2 && (
          <LessonStep
            classroomName={data.classroom?.name || 'My Classroom'}
            onNext={handleStep2}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <InviteStep
            classroomName={data.classroom?.name || 'My Classroom'}
            onNext={handleStep3}
            onBack={() => setStep(2)}
            onSkip={() => handleStep3(data.joinCode || '')}
          />
        )}

        {step === 'complete' && (
          <CompletionScreen
            data={data}
            onTakeTour={() => {
              handleFinish();
              // TODO: Start interactive tour
            }}
            onSkipTour={handleFinish}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper Functions

async function createDefaults() {
  // Create default classroom and lesson
  const { data: classroom } = await supabase
    .from('classrooms')
    .insert({
      name: 'My Classroom',
      description: 'Default classroom'
    })
    .select()
    .single();

  const { data: lesson } = await supabase
    .from('vocabulary_lessons')
    .insert({
      name: 'Starter Lesson',
      description: 'Basic vocabulary',
      classroom_id: classroom.id
    })
    .select()
    .single();

  // Add default words (from template)
  const defaultWords = LESSON_TEMPLATES.find(t => t.id === 'basic-vocab')!.words;
  await supabase
    .from('vocabulary_lesson_words')
    .insert(
      defaultWords.map(w => ({
        lesson_id: lesson.id,
        word: w.word,
        definition: w.definition
      }))
    );
}

async function markOnboardingComplete() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('users')
    .update({ onboarding_completed: true })
    .eq('id', user.id);
}
```

---

### Step Components

#### Step 1: Classroom

```typescript
// components/teacher/onboarding/ClassroomStep.tsx

'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { StepHeader } from './StepHeader';

export function ClassroomStep({
  onNext,
  onSkip
}: {
  onNext: (data: { name: string; description: string }) => void;
  onSkip: () => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState('English 101');
  const [description, setDescription] = useState('Beginner English vocabulary and grammar');

  const handleNext = async () => {
    // Create classroom
    const { data: classroom } = await supabase
      .from('classrooms')
      .insert({ name, description })
      .select()
      .single();

    onNext({ name, description });
  };

  return (
    <div>
      <StepHeader
        title={t('onboarding.step1.title')}
        subtitle={t('onboarding.step1.subtitle')}
        currentStep={1}
        totalSteps={3}
      />

      <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
        {/* Classroom Name */}
        <div className="mb-4">
          <label className="block text-white font-neo-body font-bold mb-2">
            {t('onboarding.step1.classroomName')} *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-800 text-white border-neo border-black rounded-neo focus:outline-none focus:ring-2 focus:ring-neo-cyan"
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-white font-neo-body font-bold mb-2">
            {t('onboarding.step1.description')} ({t('common.optional')})
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 bg-gray-800 text-white border-neo border-black rounded-neo focus:outline-none focus:ring-2 focus:ring-neo-cyan"
          />
        </div>

        {/* Preview */}
        <div className="mb-6 p-4 bg-gray-800 border-neo border-gray-700 rounded-neo">
          <h4 className="text-sm text-gray-400 mb-2">
            📱 {t('onboarding.step1.preview')}
          </h4>
          <div className="p-3 bg-neo-navy border-neo border-black rounded-neo">
            <p className="text-lg font-neo-display text-neo-yellow">{name}</p>
            <p className="text-sm text-gray-400">{description}</p>
            <div className="mt-3">
              <button className="text-sm bg-neo-cyan text-black px-3 py-1 rounded-neo">
                [Join with Code: ABC123]
              </button>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 text-gray-400 hover:text-white"
          >
            {t('onboarding.skipThisStep')}
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-neo-cyan text-black font-neo-body font-bold rounded-neo border-neo border-black shadow-hard hover:shadow-hard-lg"
          >
            {t('onboarding.nextChooseLesson')} →
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

#### Step 2: Lesson Selection

```typescript
// components/teacher/onboarding/LessonStep.tsx

'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { LESSON_TEMPLATES, LessonTemplate } from '@/data/lessonTemplates';

export function LessonStep({
  classroomName,
  onNext,
  onBack
}: {
  classroomName: string;
  onNext: (lesson: { template: string | null; customWords: any[] }) => void;
  onBack: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>('basic-vocab');
  const [previewTemplate, setPreviewTemplate] = useState<LessonTemplate | null>(null);

  const handleNext = async () => {
    const template = LESSON_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;

    // Create lesson from template
    const { data: lesson } = await supabase
      .from('vocabulary_lessons')
      .insert({
        name: template.name,
        description: template.description
      })
      .select()
      .single();

    // Add words
    await supabase
      .from('vocabulary_lesson_words')
      .insert(
        template.words.map(w => ({
          lesson_id: lesson.id,
          word: w.word,
          definition: w.definition
        }))
      );

    onNext({ template: selectedTemplate, customWords: [] });
  };

  return (
    <div>
      <StepHeader
        title="Choose a Starter Lesson"
        subtitle="Pick a template to get started quickly"
        currentStep={2}
        totalSteps={3}
      />

      {/* Template Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {LESSON_TEMPLATES.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplate === template.id}
            onSelect={() => setSelectedTemplate(template.id)}
            onPreview={() => setPreviewTemplate(template)}
          />
        ))}
      </div>

      {/* Import Options */}
      <div className="mb-6 p-4 bg-gray-800 border-neo border-gray-700 rounded-neo">
        <p className="text-white font-neo-body font-bold mb-3">
          Or import your own:
        </p>
        <div className="flex gap-3">
          <button className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-neo border-neo border-black hover:bg-gray-600">
            📎 Upload CSV File
          </button>
          <button className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-neo border-neo border-black hover:bg-gray-600">
            ✏️ Enter Words Manually
          </button>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-400 hover:text-white"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedTemplate}
          className="px-6 py-2 bg-neo-cyan text-black font-neo-body font-bold rounded-neo border-neo border-black shadow-hard hover:shadow-hard-lg disabled:opacity-50"
        >
          Next: Invite Students →
        </button>
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={() => {
            setSelectedTemplate(previewTemplate.id);
            setPreviewTemplate(null);
          }}
        />
      )}
    </div>
  );
}

function TemplateCard({ template, isSelected, onSelect, onPreview }: any) {
  return (
    <div
      className={`p-4 rounded-neo border-neo cursor-pointer transition-all ${
        isSelected
          ? 'bg-neo-cyan/20 border-neo-cyan shadow-hard'
          : 'bg-gray-800 border-black hover:border-gray-600'
      }`}
      onClick={onSelect}
    >
      <h4 className="font-neo-body font-bold text-white mb-2">
        {template.name}
      </h4>
      <p className="text-sm text-gray-400 mb-2">
        {template.wordCount} words
      </p>
      <p className="text-xs text-gray-500 mb-3">
        {template.difficulty}
      </p>
      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
          className="flex-1 text-xs px-2 py-1 bg-gray-700 text-white rounded-neo hover:bg-gray-600"
        >
          Preview
        </button>
        {isSelected && (
          <span className="text-neo-cyan">✓</span>
        )}
      </div>
    </div>
  );
}
```

---

### Lesson Template Data

```typescript
// data/lessonTemplates.ts

export interface LessonTemplate {
  id: string;
  name: string;
  description: string;
  wordCount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  words: Array<{ word: string; definition: string }>;
}

export const LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: 'basic-vocab',
    name: 'Basic Vocabulary',
    description: 'Common everyday words',
    wordCount: 20,
    difficulty: 'beginner',
    words: [
      { word: 'Apple', definition: 'A round fruit that grows on trees' },
      { word: 'Book', definition: 'Pages bound together for reading' },
      { word: 'Cat', definition: 'A small domesticated feline animal' },
      { word: 'Dog', definition: 'A domesticated canine animal' },
      { word: 'Elephant', definition: 'A large mammal with a trunk' },
      { word: 'Fish', definition: 'An aquatic animal' },
      { word: 'Guitar', definition: 'A stringed musical instrument' },
      { word: 'House', definition: 'A building where people live' },
      { word: 'Ice', definition: 'Frozen water' },
      { word: 'Jump', definition: 'To push oneself off the ground' },
      { word: 'Kite', definition: 'A toy that flies in the wind' },
      { word: 'Lion', definition: 'A large wild cat' },
      { word: 'Moon', definition: 'Earth\'s natural satellite' },
      { word: 'Nest', definition: 'A bird\'s home' },
      { word: 'Orange', definition: 'A citrus fruit' },
      { word: 'Piano', definition: 'A keyboard musical instrument' },
      { word: 'Queen', definition: 'A female monarch' },
      { word: 'Rain', definition: 'Water falling from clouds' },
      { word: 'Sun', definition: 'The star at the center of our solar system' },
      { word: 'Tree', definition: 'A woody plant with a trunk and branches' }
    ]
  },
  {
    id: 'sat-prep',
    name: 'SAT Vocabulary',
    description: 'College entrance exam prep',
    wordCount: 50,
    difficulty: 'advanced',
    words: [
      { word: 'Ubiquitous', definition: 'Present everywhere at once' },
      { word: 'Ephemeral', definition: 'Lasting a very short time' },
      { word: 'Cacophony', definition: 'A harsh, discordant mixture of sounds' },
      { word: 'Benevolent', definition: 'Well-meaning and kindly' },
      { word: 'Anomaly', definition: 'Something that deviates from the norm' },
      // ... (45 more SAT words)
    ]
  },
  {
    id: 'esl-beginner',
    name: 'ESL Beginner',
    description: 'English as Second Language starter pack',
    wordCount: 30,
    difficulty: 'beginner',
    words: [
      { word: 'Hello', definition: 'A greeting' },
      { word: 'Goodbye', definition: 'A farewell' },
      { word: 'Thank you', definition: 'Expression of gratitude' },
      // ... (27 more ESL words)
    ]
  }
];
```

---

## Database Schema Updates

```sql
-- Add onboarding_completed flag to users table

ALTER TABLE users
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;

-- Index for fast lookups
CREATE INDEX idx_users_onboarding ON users(onboarding_completed);
```

---

## Testing Checklist

- [ ] **Unit Tests**:
  - [ ] WizardComponent renders all steps
  - [ ] Step progression works (1 → 2 → 3)
  - [ ] Skip creates default classroom
  - [ ] Template selection works

- [ ] **Integration Tests**:
  - [ ] Classroom created in database
  - [ ] Lesson created with words
  - [ ] Join code generated
  - [ ] Onboarding flag set to true

- [ ] **E2E Tests** (Playwright):
  - [ ] New teacher sees wizard on first login
  - [ ] Complete wizard flow creates all resources
  - [ ] Skip button creates defaults
  - [ ] Returning teacher doesn't see wizard

---

## Estimated Effort

- **Welcome + Step 1**: 1 day
- **Step 2 (Templates)**: 2 days
- **Step 3 (Invite)**: 1 day
- **Completion Screen**: 0.5 days
- **Template Data**: 1 day (create 3 robust templates with 20-50 words each)
- **Testing**: 1.5 days
- **Total**: 7 days

---

## Files to Create

1. `components/teacher/TeacherOnboardingWizard.tsx`
2. `components/teacher/onboarding/WelcomeScreen.tsx`
3. `components/teacher/onboarding/ClassroomStep.tsx`
4. `components/teacher/onboarding/LessonStep.tsx`
5. `components/teacher/onboarding/InviteStep.tsx`
6. `components/teacher/onboarding/CompletionScreen.tsx`
7. `components/teacher/onboarding/StepHeader.tsx`
8. `data/lessonTemplates.ts`
9. `app/[locale]/teacher/onboarding/page.tsx` (route)

## Files to Modify

1. `app/[locale]/teacher/PageClient.tsx` - Show wizard if onboarding incomplete
2. Database migration - Add `onboarding_completed` column
3. `translations/en.json` (+ he, sv, ja) - Add all onboarding strings

---

This completes the detailed specification for Feature 3 (Onboarding Wizard).
