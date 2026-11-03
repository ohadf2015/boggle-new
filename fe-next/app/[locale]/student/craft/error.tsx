'use client';

import { EduRouteError } from '@/components/education/shell/EduRouteError';

export default function WordWorkshopPageError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <EduRouteError {...props} boundary="student-word-workshop" area="student" />;
}
