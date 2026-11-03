'use client';

import { EduRouteError } from '@/components/education/shell/EduRouteError';

export default function MissedWordsReviewPageError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <EduRouteError {...props} boundary="student-missed-words-review" area="student" />;
}
