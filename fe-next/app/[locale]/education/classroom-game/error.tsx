'use client';

import { EduRouteError } from '@/components/education/shell/EduRouteError';

export default function ClassroomGameError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <EduRouteError {...props} boundary="classroom-game" area="teacher" />;
}
