/**
 * The room, on the wire.
 *
 * Lifted out of `ClassroomGameLobby` unchanged in behaviour, with one addition
 * the poster picker needs: a tap can now arrive BEFORE the socket has finished
 * connecting. That used to be a silent no-op — the teacher tapped, nothing
 * happened, no message (recurring pitfall class 4). A launch asked for early is
 * held and flushed the moment the socket is up.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';
import { getSocketURL } from '@/utils/SocketContext';
import { classroomMultiplayerPath } from '@/lib/education/classroomGameHandoff';
import type { ClassroomGameMode, PracticeFocusSetting } from '@/shared/types/vocabQuiz';
import type { PlayStyle } from '@/shared/utils/teamBattle';
import type { ClassroomAccessibility } from '@/shared/types/classroom';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface ClassroomLaunchPayload {
  gameCode: string;
  classroomId: string;
  teacherId: string;
  teacherName: string;
  lessonIds: string[];
  lessonNames: string[];
  vocabularyWords: string[];
  settings: {
    timerMinutes: number;
    boardSize: 'small' | 'medium' | 'large';
    allowLateJoin: boolean;
    gameMode: ClassroomGameMode;
    targetWord?: string;
    vocabQuizFocus?: PracticeFocusSetting;
    vocabQuizQuestionCount?: number;
    vocabQuizSeconds?: number;
    playStyle: PlayStyle;
    teamCount?: number;
    accessibility?: ClassroomAccessibility;
  };
}

function randomGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export function useClassroomLaunchSocket(t: Translate, language: string) {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [gameCode] = useState<string>(() => randomGameCode());

  /** A launch asked for before the socket existed. Flushed on connect. */
  const pendingRef = useRef<ClassroomLaunchPayload | null>(null);

  useEffect(() => {
    let socketInstance: Socket | undefined;

    async function initSocket() {
      let token: string | undefined;
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const {
          data: { session },
        } = await createClient().auth.getSession();
        token = session?.access_token;
      } catch {
        // proceed without a token; the server will refuse out loud
      }

      socketInstance = io(getSocketURL(), {
        transports: ['websocket', 'polling'],
        auth: token ? { token } : {},
      });

      socketInstance.on('connect', () => {
        logger.info('Connected to Socket.IO');
      });
      socketInstance.on('classroomGameCreated', (data: { success: boolean; gameCode: string }) => {
        if (data.success) {
          toast.success(t('education.classroomGame.gameCreated'));
          router.push(classroomMultiplayerPath(language, data.gameCode));
        }
      });
      // The server's error text is internal English ("Invalid payload: …").
      // A Hebrew or Japanese teacher was shown it raw in an RTL toast. The real
      // text is logged for us; the teacher gets a sentence in their language.
      socketInstance.on('classroomGameError', (data: { error: string }) => {
        logger.error('Classroom game create rejected:', data?.error);
        toast.error(t('education.classroomGame.startFailed'));
        setStartError('education.classroomGame.startFailed');
        setIsStarting(false);
      });
      // Rate limiting emits its OWN event. Without this listener a double-tapped
      // launch stayed disabled with no message and no way out but a reload.
      socketInstance.on('rateLimited', () => {
        toast.error(t('education.classroomGame.tooFast'));
        setStartError('education.classroomGame.tooFast');
        setIsStarting(false);
      });

      setSocket(socketInstance);

      const queued = pendingRef.current;
      if (queued) {
        pendingRef.current = null;
        socketInstance.emit('createClassroomGame', queued);
      }
    }

    void initSocket();
    return () => {
      socketInstance?.disconnect();
    };
  }, [t, language, router]);

  const launch = useCallback(
    (payload: ClassroomLaunchPayload) => {
      setStartError(null);
      setIsStarting(true);
      if (socket) {
        socket.emit('createClassroomGame', payload);
        return;
      }
      // Held, not dropped: the flush above sends it the instant we connect.
      pendingRef.current = payload;
    },
    [socket]
  );

  return { gameCode, isStarting, setIsStarting, startError, setStartError, launch };
}
