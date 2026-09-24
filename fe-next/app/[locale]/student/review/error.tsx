'use client';

import AcademyModeError from '@/components/education/academyModes/AcademyModeError';

export default function MissedWordsReviewPageError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <AcademyModeError {...props} boundary="student-missed-words-review" />;
}
