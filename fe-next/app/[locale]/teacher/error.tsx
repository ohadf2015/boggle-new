'use client';

import { EduRouteError } from '@/components/education/shell/EduRouteError';

export default function TeacherError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <EduRouteError {...props} boundary="teacher" area="teacher" />;
}
