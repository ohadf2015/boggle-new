import { z } from 'zod';

// Zod schema for Tutorial composition props
export const TutorialSchema = z.object({
  locale: z.enum(['en', 'he', 'sv', 'ja']).default('en'),
});

// Inferred type from schema
export type TutorialProps = z.infer<typeof TutorialSchema>;

// Supported locales type
export type SupportedLocale = TutorialProps['locale'];

// Translation structure for tutorial steps
interface TutorialTranslation {
  step1: string; // Swipe instruction
  step2: string; // Word validation instruction
  step3: string; // Scoring instruction
}

// Embedded translations - cannot use React context in Remotion
// Must be defined directly here for video composition
export const tutorialTranslations: Record<SupportedLocale, TutorialTranslation> = {
  en: {
    step1: 'Swipe across letters to form words',
    step2: 'Valid words light up green',
    step3: 'Score points with longer words',
  },
  he: {
    step1: 'החלק על אותיות כדי ליצור מילים',
    step2: 'מילים תקינות מאירות בירוק',
    step3: 'צבור נקודות עם מילים ארוכות יותר',
  },
  sv: {
    step1: 'Svep over bokstaver for att bilda ord',
    step2: 'Giltiga ord lyser gront',
    step3: 'Fa poang med langre ord',
  },
  ja: {
    step1: 'Swipe across letters to form words',
    step2: 'Valid words light up green',
    step3: 'Score points with longer words',
  },
};
