/**
 * ClassroomGameLobbyExpress — the screen the teacher sees for two seconds.
 *
 * Reached only from the dashboard's PLAY NOW button. There is nothing to fill
 * in here: the intent already says which words, `prepareQuickLaunch` provisions
 * the classroom and lesson behind it, and the room is on the wire before the
 * teacher has finished looking at the projector.
 *
 * Dark-only surface, so `bg-neo-navy` is hardcoded — the cream/dark pair
 * flashes cream on a lazy mount (pitfalls class 5).
 */

'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { Rocket, TriangleAlert, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRecentGameSettings } from '@/hooks/useRecentGameSettings';
import { getSocketURL } from '@/utils/SocketContext';
import { getClassrooms, getLesson, createLesson } from '@/lib/supabase/education';
import { createClient } from '@/utils/supabase/client';
import { classroomMultiplayerPath, type LessonGameData } from '@/lib/education/classroomGameHandoff';
import { clearQuickLaunchIntent, type QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';
import { ModePickerStrip } from './modePicker/ModePickerStrip';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { cn } from '@/lib/utils';
import logger from '@/utils/logger';
import type { Classroom, Language } from '@/lib/supabase/education/types';
import {
  abandonLaunch,
  ensureLaunch,
  getLaunch,
  subscribeLaunch,
  type LaunchSnapshot,
} from './ClassroomGameLobbyExpressController';
import {
  prepareQuickLaunch,
  EXPRESS_TIMER_MINUTES,
  EXPRESS_BOARD_SIZE,
  EXPRESS_MIN_WORD_LENGTH,
  type QuickLaunchFailure,
  type QuickLaunchStage,
} from './ClassroomGameLobbyExpressRunner';

/**
 * One watchdog over the WHOLE launch, not just the socket ack. The classroom
 * insert, the lesson insert and the room all sit inside it, because any of the
 * three can hang and all three look identical from the teacher's chair.
 */
const LAUNCH_TIMEOUT_MS = 20_000;

const EMPTY_SNAPSHOT: LaunchSnapshot = { stage: 'classroom', failure: null, gameCode: null, mode: null };

const STAGES: QuickLaunchStage[] = ['classroom', 'lesson', 'room'];
const STAGE_LABEL: Record<QuickLaunchStage, string> = {
  classroom: 'teacher.playNow.stageClassroom',
  lesson: 'teacher.playNow.stageLesson',
  room: 'teacher.playNow.stageRoom',
};

function randomGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export interface ClassroomGameLobbyExpressProps {
  intent: QuickLaunchIntent;
  /** Escape hatch: hand the teacher the full lobby instead of a dead end. */
  onOpenFullSetup: () => void;
}

export function ClassroomGameLobbyExpress({ intent, onOpenFullSetup }: ClassroomGameLobbyExpressProps) {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const router = useRouter();
  const { saveConfig } = useRecentGameSettings();
  // Read through a ref: the launch outlives this render, and the hook hands
  // back a new function identity each time.
  const saveConfigRef = useRef(saveConfig);
  saveConfigRef.current = saveConfig;

  const [attempt, setAttempt] = useState(0);
  /**
   * The poster the teacher tapped on the way past. `null` — the normal case —
   * leaves the runner's derived mode alone, so GO LIVE is still one tap and
   * nothing about the default path changed.
   */
  const [modeOverride, setModeOverride] = useState<ClassroomGameMode | null>(null);
  // One key per (intent, attempt, chosen mode). A remount reuses the run already
  // in flight; Retry — or a different poster — mints a new key and therefore a
  // genuinely new run.
  const launchKey = `${intent.createdAt}:${attempt}:${modeOverride ?? 'auto'}`;

  const snapshot =
    useSyncExternalStore(
      useCallback((cb) => subscribeLaunch(launchKey, cb), [launchKey]),
      useCallback(() => getLaunch(launchKey), [launchKey]),
      () => undefined
    ) ?? EMPTY_SNAPSHOT;

  const { stage, failure, gameCode: liveGameCode, mode: derivedMode } = snapshot;

  const teacherName = profile?.display_name || user?.email || 'Teacher';
  const defaultClassName = t('teacher.playNow.defaultClassName');

  useEffect(() => {
    if (!user?.id) return;
    const authUserId = user.id;

    ensureLaunch(launchKey, (control) => {
      const gameCode = randomGameCode();
      let socket: Socket | null = null;
      const watchdog = setTimeout(
        () => {
          logger.error('Quick launch timed out before the room was confirmed');
          control.fail({ code: 'room', reason: 'TIMEOUT' });
        },
        LAUNCH_TIMEOUT_MS
      );
      control.onDispose(() => {
        clearTimeout(watchdog);
        socket?.disconnect();
      });

      void (async () => {
        try {
          // The socket comes FIRST, listeners and all: a rejection from the
          // server must be able to land at any point, and a hang further down
          // must not be the reason the teacher never hears about it.
          let token: string | undefined;
          try {
            const { data } = await createClient().auth.getSession();
            token = data.session?.access_token;
          } catch {
            /* proceed unauthenticated; the server will say no, out loud */
          }

          const live = io(getSocketURL(), {
            transports: ['websocket', 'polling'],
            auth: token ? { token } : {},
          });
          socket = live;

          // `classroomGameCreated` arrives TWICE for the host, with two
          // different shapes (pitfalls class 3 — two paths, one event name).
          // The handler joins the teacher's socket to `classroom:<id>` and
          // then broadcasts `{gameCode, classroomId, classroomName, …}` to
          // that room BEFORE sending the teacher `{success:true, gameCode}`.
          // Treating the broadcast as "not success" failed a room that had
          // already been written to Redis — measured live 2026-09-11. Only
          // the teacher's own confirmation is an answer; the broadcast is
          // somebody else's news.
          live.on('classroomGameCreated', (data: { success?: boolean; gameCode?: string }) => {
            if (data?.success !== true || !data.gameCode) return;
            clearTimeout(watchdog);
            control.succeed(data.gameCode);
          });
          // The server's error text is internal English ("You are not the
          // teacher of this classroom"); log it, show the teacher a sentence.
          live.on('classroomGameError', (data: { error?: string }) => {
            logger.error('Quick launch rejected by server:', data?.error || '');
            control.fail({ code: 'room', reason: data?.error });
          });
          // Rate limiting emits its OWN event. Without this the teacher would
          // sit on "opening the room" until the watchdog gave up.
          live.on('rateLimited', () => control.fail({ code: 'room', reason: 'RATE_LIMITED' }));
          live.on('connect_error', (err: Error) => {
            logger.error('Quick launch socket failed:', err?.message || '');
            control.fail({ code: 'room', reason: 'SOCKET' });
          });

          const result = await prepareQuickLaunch(
            {
              userId: authUserId,
              teacherName,
              gameCode,
              defaultClassName,
              uiLanguage: language,
              onStage: control.setStage,
              modeOverride: modeOverride ?? undefined,
              listClassrooms: async () => {
                const { data } = await getClassrooms(authUserId);
                return (data || []) as Classroom[];
              },
              createClassroom: async (name, lang) => {
                try {
                  const res = await fetch('/api/education/classroom/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, language: lang }),
                  });
                  const body = await res.json().catch(() => ({}));
                  if (!res.ok) return { success: false, error: body?.message, code: body?.error };
                  return { success: true, data: body?.data as Classroom };
                } catch (err) {
                  return { success: false, error: String(err) };
                }
              },
              getLessonById: async (id) => (await getLesson(id)).data,
              createLesson: async (input) =>
                createLesson({
                  teacher_id: authUserId,
                  classroom_id: null,
                  name: input.name,
                  description: input.description || '',
                  language: input.language as Language,
                  words: input.words,
                  is_public: false,
                  source_game_code: null,
                }),
            },
            intent
          );

          if (!result.ok) {
            logger.error('Quick launch failed:', result.failure.code, result.failure.reason || '');
            control.fail(result.failure);
            return;
          }

          // Tell the screen which game it is about to be, so the strip below
          // can mark it before the room even answers.
          control.setMode(result.payload.settings.gameMode);

          const staged: LessonGameData = {
            lessonId: result.lesson.id,
            lessonName: result.lesson.name,
            vocabularyWords: result.payload.vocabularyWords,
            language: result.lesson.language || language,
            gameMode: result.payload.settings.gameMode,
            playStyle: 'ffa',
            templateSettings: {
              timerSeconds: EXPRESS_TIMER_MINUTES * 60,
              difficulty: EXPRESS_BOARD_SIZE,
              minWordLength: EXPRESS_MIN_WORD_LENGTH,
              allowLateJoin: true,
            },
          };
          try {
            sessionStorage.setItem('lessonGameData', JSON.stringify(staged));
          } catch {
            /* storage off — the socket payload still carries the words */
          }

          live.emit('createClassroomGame', result.payload);

          // Bookkeeping only, and AFTER the room is asked for: a throw in the
          // recents store must never be the reason a class has no game.
          try {
            saveConfigRef.current({
              id: `${Date.now()}`,
              classroomId: result.classroom.id,
              classroomName: result.classroom.name,
              lessonIds: result.payload.lessonIds,
              lessonNames: result.payload.lessonNames,
              settings: {
                timerMinutes: EXPRESS_TIMER_MINUTES,
                boardSize: EXPRESS_BOARD_SIZE,
                allowLateJoin: true,
              },
              savedAt: Date.now(),
            });
          } catch (err) {
            logger.warn('Could not save the recent game config:', err);
          }
        } catch (err) {
          // Anything unexpected — a chunk that will not load, a throwing
          // store — becomes a NAMED failure. An unhandled rejection here
          // reads to the teacher as a spinner that never ends.
          logger.error('Quick launch threw:', err);
          control.fail({ code: 'room', reason: String(err) });
        }
      })();
    });
    // Deliberately NOT cleaning up here: the launch belongs to the intent, not
    // to this mount. `abandonLaunch` runs on Retry and on the way out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchKey, user?.id]);

  // The one navigation, driven by the server's confirmation.
  useEffect(() => {
    if (!liveGameCode) return;
    clearQuickLaunchIntent();
    router.push(classroomMultiplayerPath(language, liveGameCode));
  }, [liveGameCode, router, language]);

  const retry = useCallback(() => {
    abandonLaunch(launchKey);
    setAttempt((n) => n + 1);
  }, [launchKey]);

  /**
   * A second tap, on a poster. Abandons the run in flight (its socket and its
   * watchdog go with it) and starts a fresh one with the chosen game. Tapping
   * the game that is already loading does nothing — a teacher confirming their
   * own choice should not cost the class a restart.
   */
  const switchMode = useCallback(
    (mode: ClassroomGameMode) => {
      if (mode === (modeOverride ?? derivedMode)) return;
      abandonLaunch(launchKey);
      setModeOverride(mode);
    },
    [launchKey, modeOverride, derivedMode]
  );

  const openFullSetup = useCallback(() => {
    abandonLaunch(launchKey);
    onOpenFullSetup();
  }, [launchKey, onOpenFullSetup]);

  if (failure) {
    return (
      <div
        data-testid="express-failure"
        className="min-h-0 flex-1 overflow-y-auto rounded-neo-lg border-4 border-neo-red bg-neo-cream p-6 shadow-hard-lg text-center"
      >
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-neo border-3 border-black bg-neo-red/15 shadow-hard-sm">
          <TriangleAlert className="size-7 text-neo-red" strokeWidth={3} aria-hidden="true" />
        </div>
        <p className="font-neo-display text-xl font-black text-black text-balance">
          {t(`teacher.playNow.failure.${failure.code}`)}
        </p>
        <p className="mt-1 font-neo-body text-sm font-bold text-black/60 text-pretty">
          {t('teacher.playNow.failureHint')}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            data-testid="express-retry"
            onClick={retry}
            className="inline-flex min-h-11 items-center rounded-neo border-3 border-black bg-neo-lime px-6 py-2.5 font-neo-display font-black uppercase text-black shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5"
          >
            {t('teacher.playNow.retry')}
          </button>
          <button
            type="button"
            data-testid="express-open-full-setup"
            onClick={openFullSetup}
            className="inline-flex min-h-11 items-center rounded-neo border-3 border-black bg-neo-cyan px-6 py-2.5 font-neo-display font-black uppercase text-black shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard"
          >
            {t('teacher.playNow.openFullSetup')}
          </button>
        </div>
      </div>
    );
  }

  const stageIndex = STAGES.indexOf(stage);
  const liveMode = (modeOverride ?? derivedMode) as ClassroomGameMode | null;

  return (
    <div
      data-testid="express-progress"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-neo-lg border-4 border-black bg-neo-navy p-5 shadow-hard-lg sm:p-8"
    >
      <div className="flex items-center justify-center gap-3">
        <Rocket className="size-9 shrink-0 text-neo-lime motion-safe:animate-bounce" strokeWidth={3} aria-hidden="true" />
        <h1 className="font-neo-display text-3xl font-black uppercase tracking-tight text-neo-lime sm:text-4xl">
          {t('teacher.playNow.goingLive')}
        </h1>
      </div>
      <p className="mt-2 text-center font-neo-body text-sm font-bold text-neo-white/70">
        {intent.title}
      </p>

      <ol className="mx-auto mt-7 max-w-sm space-y-2" aria-live="polite">
        {STAGES.map((s, i) => {
          const done = i < stageIndex;
          const now = i === stageIndex;
          return (
            <li
              key={s}
              className={cn(
                'flex min-h-12 items-center gap-3 rounded-neo border-3 border-black px-4 py-2',
                done && 'bg-neo-lime/90 text-black shadow-hard-sm',
                now && 'bg-neo-cream text-black shadow-hard',
                !done && !now && 'bg-neo-navy-light text-neo-cream/80'
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center" aria-hidden="true">
                {done ? (
                  <Check className="size-5" strokeWidth={4} />
                ) : now ? (
                  <Loader2 className="size-5 motion-safe:animate-spin" strokeWidth={3} />
                ) : null}
              </span>
              <span className="font-neo-display text-sm font-black uppercase">{t(STAGE_LABEL[s])}</span>
            </li>
          );
        })}
      </ol>

      {/*
        The picker, while the room spins up. GO LIVE stays one tap — this costs
        the teacher who does not care exactly nothing — but the teacher who
        glanced at the projector and wanted Blast instead has somewhere to say
        so, without being sent back through the full setup screen.

        Held back until the runner has derived a mode. The strip leads with the
        chosen poster, so painting it early puts Classic at the head of the row
        and then reshuffles every tile when the real answer arrives — pitfall
        class 1, and on a screen that is up for two seconds that reorder is the
        whole screen. There is also nothing to offer yet: "switch the game"
        needs a game to switch away from.
      */}
      {liveMode && (
        <div className="mx-auto mt-6 max-w-3xl border-t-2 border-neo-white/15 pt-4">
          <p className="text-center font-neo-display text-xs font-black uppercase tracking-tight text-neo-white/70">
            {t('education.modePicker.sheetTitle')}
          </p>
          <p className="mb-3 mt-0.5 text-center font-neo-body text-[0.7rem] font-bold text-neo-cream/80">
            {t('education.modePicker.sheetHint')}
          </p>
          <ModePickerStrip selected={liveMode} recommended={null} onPick={switchMode} />
        </div>
      )}
    </div>
  );
}

export default ClassroomGameLobbyExpress;
