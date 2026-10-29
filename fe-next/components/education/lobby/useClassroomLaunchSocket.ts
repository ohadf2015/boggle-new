/**
 * The room, on the wire: the ONE launcher for every way into the setup lobby.
 * A launch asked for before the socket is up is held and flushed on connect,
 * and every dead end (refusal, rate limit, no connection, no answer) ends in a
 * named error the lobby shows with a retry (pitfall class 4).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';
import { getSocketURL } from '@/utils/SocketContext';
import { recordLessonPlays } from '@/lib/education/lessonPlayStat';
import { trackEduLiveGameStarted } from '@/lib/education/telemetry';
import type { ClassroomPressure } from '@/shared/types/classroom';
import { splitLaunchPayload, type ClassroomLaunchPayload } from './classroomLaunchPayload';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export type { ClassroomLaunchPayload } from './classroomLaunchPayload';
export type LaunchSource = 'create_room' | 'hq_express';

export const LAUNCH_ACK_TIMEOUT_MS = 20_000;
const START_FAILED = 'education.classroomGame.startFailed';

function randomGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

interface InFlight {
  classroomId: string;
  lessonIds: string[];
  source: LaunchSource;
  pressure: ClassroomPressure | null;
}

export function useClassroomLaunchSocket(t: Translate) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [gameCode] = useState<string>(() => randomGameCode());
  const [roomCreatedGameCode, setRoomCreatedGameCode] = useState<string | null>(null);
  // True while a pressure write awaits its ack; the caller holds navigation so a refusal is still shown.
  const [pressurePending, setPressurePending] = useState(false);

  const pendingRef = useRef<ReturnType<typeof splitLaunchPayload>['createPayload'] | null>(null);
  const inFlightRef = useRef<InFlight | null>(null);
  const ackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressureAckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressureAckGameCodeRef = useRef<string | null>(null);
  const tRef = useRef(t);
  tRef.current = t;

  const clearAckTimer = () => {
    if (ackTimerRef.current) clearTimeout(ackTimerRef.current);
    ackTimerRef.current = null;
  };

  const fail = useCallback((key: string) => {
    clearAckTimer();
    inFlightRef.current = null;
    pendingRef.current = null;
    toast.error(tRef.current(key));
    setStartError(key);
    setIsStarting(false);
  }, []);

  useEffect(() => {
    let socketInstance: Socket | undefined;
    let disposed = false;

    async function initSocket() {
      let token: string | undefined;
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const { data: { session } } = await createClient().auth.getSession();
        token = session?.access_token;
      } catch {
        // proceed without a token; the server will refuse out loud
      }
      if (disposed) return;

      socketInstance = io(getSocketURL(), { transports: ['websocket', 'polling'], auth: token ? { token } : {} });

      // The server also broadcasts `{gameCode, classroomId, …}` to the class room under this
      // event name; only the teacher's own `{success:true, gameCode}` is the confirmation.
      socketInstance.on('classroomGameCreated', (data: { success?: boolean; gameCode?: string }) => {
        if (data?.success !== true || !data.gameCode) return;
        clearAckTimer();
        const launched = inFlightRef.current;
        inFlightRef.current = null;
        if (launched) {
          trackEduLiveGameStarted({ classroomId: launched.classroomId, source: launched.source, lessonCount: launched.lessonIds.length });
          void recordLessonPlays(launched.lessonIds);
          // The create handler whitelists its settings, so the dials follow once the room exists.
          if (launched.pressure) {
            socketInstance?.emit('updateClassroomGamePressure', { gameCode: data.gameCode, pressure: launched.pressure });
            setPressurePending(true);
            const expectedCode = data.gameCode;
            pressureAckGameCodeRef.current = expectedCode;
            pressureAckTimerRef.current = setTimeout(() => {
              logger.error('CLASSROOM_LAUNCH', `Pressure dials write never acked for ${expectedCode}; room runs the loud default`);
              toast.error(tRef.current('education.classroomGame.pressureFailed'));
              setPressurePending(false);
            }, 5_000);
          }
        }
        toast.success(tRef.current('education.classroomGame.gameCreated'));
        setRoomCreatedGameCode(data.gameCode);
        setIsStarting(false);
      });
      socketInstance.on('classroomGamePressureChanged', (data: { gameCode: string }) => {
        if (data.gameCode === pressureAckGameCodeRef.current && pressureAckTimerRef.current) {
          clearTimeout(pressureAckTimerRef.current);
          pressureAckTimerRef.current = null;
          pressureAckGameCodeRef.current = null;
          setPressurePending(false);
        }
      });
      // The server's text is internal English; it is logged, the teacher gets their language.
      socketInstance.on('classroomGameError', (data: { error: string }) => {
        logger.error('Classroom game create rejected:', data?.error);
        // A refused pressure WRITE is not a failed launch: the room exists and is playable.
        if (data?.error === 'education.classroomGame.pressureFailed') {
          if (pressureAckTimerRef.current) clearTimeout(pressureAckTimerRef.current);
          pressureAckTimerRef.current = null;
          pressureAckGameCodeRef.current = null;
          toast.error(tRef.current('education.classroomGame.pressureFailed'));
          setPressurePending(false);
          return;
        }
        fail(START_FAILED);
      });
      socketInstance.on('rateLimited', () => fail('education.classroomGame.tooFast'));
      socketInstance.on('connect_error', (err: Error) => {
        if (!inFlightRef.current && !pendingRef.current) return;
        logger.error('Classroom launch socket failed:', err?.message || '');
        fail(START_FAILED);
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
      disposed = true;
      clearAckTimer();
      if (pressureAckTimerRef.current) clearTimeout(pressureAckTimerRef.current);
      socketInstance?.disconnect();
    };
  }, [fail]);

  const launch = useCallback(
    (payload: ClassroomLaunchPayload, source: LaunchSource = 'create_room') => {
      setStartError(null);
      setIsStarting(true);
      const { createPayload, pressure } = splitLaunchPayload(payload);
      inFlightRef.current = { classroomId: payload.classroomId, lessonIds: payload.lessonIds, source, pressure };
      clearAckTimer();
      ackTimerRef.current = setTimeout(() => {
        logger.error('CLASSROOM_LAUNCH', 'Room was never confirmed before the watchdog');
        fail(START_FAILED);
      }, LAUNCH_ACK_TIMEOUT_MS);
      if (socket) {
        socket.emit('createClassroomGame', createPayload);
        return;
      }
      pendingRef.current = createPayload;
    },
    [socket, fail]
  );

  return { gameCode, isStarting, startError, setStartError, launch, socket, roomCreatedGameCode, pressurePending };
}
