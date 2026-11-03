'use client';

import { EduRouteError } from '@/components/education/shell/EduRouteError';

export default function StudentError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <EduRouteError {...props} boundary="student" area="student" />;
}
