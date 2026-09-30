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
import type { ClassroomAccessibility, ClassroomPressure } from '@/shared/types/classroom';

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
    /**
     * The Pro pressure dials. NOT sent inside `createClassroomGame` — that
     * handler whitelists its settings keys — but held and emitted as
     * `updateClassroomGamePressure` the moment the room exists. Absent for a
     * free teacher: the loud default is the free tier.
     */
    pressure?: ClassroomPressure;
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
  const [roomCreatedGameCode, setRoomCreatedGameCode] = useState<string | null>(null);

  /** A launch asked for before the socket existed. Flushed on connect. */
  const pendingRef = useRef<ClassroomLaunchPayload | null>(null);
  /** The dials of the in-flight launch, emitted once the room exists. */
  const pressureRef = useRef<ClassroomPressure | null>(null);
  /** Watchdog on the pressure write ack (see classroomGameCreated above). */
  const pressureAckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressureAckGameCodeRef = useRef<string | null>(null);

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
          // The dials ride a follow-up emit, never the whitelisted create
          // payload — the room must exist before they can be written to it.
          const pressure = pressureRef.current;
          if (pressure) {
            pressureRef.current = null;
            socketInstance?.emit('updateClassroomGamePressure', {
              gameCode: data.gameCode,
              pressure,
            });
            // The two-step has a drop window: if the ack never lands the room
            // runs loud while the teacher believes they launched calm. A calm
            // setup that silently didn't apply is worse than none — scream.
            const expectedCode = data.gameCode;
            pressureAckTimerRef.current = setTimeout(() => {
              logger.error(
                'CLASSROOM_LAUNCH',
                `Pressure dials write never acked for ${expectedCode} — room runs the loud default`
              );
              toast.error(t('education.classroomGame.pressureFailed'));
            }, 5_000);
            pressureAckGameCodeRef.current = expectedCode;
          }
          toast.success(t('education.classroomGame.gameCreated'));
          setRoomCreatedGameCode(data.gameCode || gameCode);
          setIsStarting(false);
        }
      });
      socketInstance.on('classroomGamePressureChanged', (data: { gameCode: string }) => {
        if (data.gameCode === pressureAckGameCodeRef.current && pressureAckTimerRef.current) {
          clearTimeout(pressureAckTimerRef.current);
          pressureAckTimerRef.current = null;
          pressureAckGameCodeRef.current = null;
        }
      });
      // The server's error text is internal English ("Invalid payload: …").
      // A Hebrew or Japanese teacher was shown it raw in an RTL toast. The real
      // text is logged for us; the teacher gets a sentence in their language.
      socketInstance.on('classroomGameError', (data: { error: string }) => {
        logger.error('Classroom game create rejected:', data?.error);
        // A refused pressure WRITE is not a failed launch: the room exists and
        // is playable, the calm setup just did not apply. Route it to its own
        // message and disarm the watchdog — otherwise the teacher sees
        // startFailed now and pressureFailed from the watchdog 5s later, two
        // toasts for one refusal.
        if (data?.error === 'education.classroomGame.pressureFailed') {
          if (pressureAckTimerRef.current) {
            clearTimeout(pressureAckTimerRef.current);
            pressureAckTimerRef.current = null;
            pressureAckGameCodeRef.current = null;
          }
          toast.error(t('education.classroomGame.pressureFailed'));
          return;
        }
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
      if (pressureAckTimerRef.current) clearTimeout(pressureAckTimerRef.current);
      socketInstance?.disconnect();
    };
  }, [t, language, router, gameCode]);

  const launch = useCallback(
    (payload: ClassroomLaunchPayload) => {
      setStartError(null);
      setIsStarting(true);
      // The dials are peeled off HERE, not trusted to the server to strip:
      // the create handler whitelists its settings keys, so a pressure object
      // inside it would vanish without a trace (pitfall 4). They are emitted
      // to the room the moment the created ack lands.
      const { pressure, ...createSettings } = payload.settings;
      pressureRef.current = pressure ?? null;
      const createPayload = { ...payload, settings: createSettings };
      if (socket) {
        socket.emit('createClassroomGame', createPayload);
        return;
      }
      // Held, not dropped: the flush above sends it the instant we connect.
      pendingRef.current = createPayload;
    },
    [socket]
  );

  const startLiveGame = useCallback(() => {
    if (roomCreatedGameCode) {
      router.push(classroomMultiplayerPath(language, roomCreatedGameCode));
    }
  }, [roomCreatedGameCode, router, language]);

  return {
    gameCode,
    isStarting,
    setIsStarting,
    startError,
    setStartError,
    launch,
    socket,
    roomCreatedGameCode,
    startLiveGame,
  };
}
