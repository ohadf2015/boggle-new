'use client';

import AcademyModeError from '@/components/education/academyModes/AcademyModeError';

export default function WordWorkshopPageError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <AcademyModeError {...props} boundary="student-word-workshop" />;
}
