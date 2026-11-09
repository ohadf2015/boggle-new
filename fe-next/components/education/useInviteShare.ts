'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { trackEduJoinCodeCopied, trackEduJoinCodeShared } from '@/lib/education/telemetry';
import { shareWithFallback } from '@/utils/shareWithFallback';
import type { InviteChannel } from './ClassSetupInviteCode';

type T = (key: string, params?: Record<string, string | number>) => string;

/** The share channels behind every "share the code" surface (ready screen, Home share sheet). */
export function useInviteShare(classroom: { id: string; name: string }, t: T) {
  return useCallback(
    async (channel: InviteChannel, payload: { url: string; text: string }) => {
      if (channel === 'whatsapp' || channel === 'google_classroom') {
        trackEduJoinCodeShared({ classroomId: classroom.id, method: channel });
        return;
      }
      if (channel === 'copy') {
        try {
          await navigator.clipboard.writeText(payload.url);
          toast.success(t('eduShell.setup.copied'));
          trackEduJoinCodeCopied({ classroomId: classroom.id });
        } catch {
          toast.error(t('eduShell.setup.copyFailed'));
        }
        return;
      }
      const result = await shareWithFallback({ title: classroom.name, text: payload.text, url: payload.url, clipboardText: payload.url });
      if (result === 'shared') trackEduJoinCodeShared({ classroomId: classroom.id, method: 'native' });
      if (result === 'copied') {
        trackEduJoinCodeShared({ classroomId: classroom.id, method: 'copy_fallback' });
        toast.success(t('eduShell.setup.copied'));
      }
      if (result === 'failed') toast.error(t('eduShell.setup.copyFailed'));
    },
    [classroom.id, classroom.name, t],
  );
}
