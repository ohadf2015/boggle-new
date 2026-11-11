import { teacherLifecycleNudge } from '../templates/teacherLifecycleNudge';
import { TEACHER_LOCALES, type EmailSample } from './types';

const STAGES = ['share_code', 'start_live', 'second_game', 'reactivate'] as const;

export const samples: EmailSample[] = TEACHER_LOCALES.flatMap((locale) =>
  STAGES.map((stage) => ({
    name: `teacherLifecycleNudge.${stage}`,
    locale,
    render: () =>
      teacherLifecycleNudge({
        fullName: 'Dana',
        locale,
        stage,
        classroom: stage === 'reactivate' ? null : { id: 'c-1', joinCode: 'KITE43', language: locale },
      }),
  })),
);
