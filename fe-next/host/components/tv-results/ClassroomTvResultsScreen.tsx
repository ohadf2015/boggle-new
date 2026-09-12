/**
 * ClassroomTvResultsScreen — the wall, at the final whistle.
 *
 * WHY THIS FILE EXISTS AT ALL. The classroom recap used to be one branch deep
 * inside `TvResultsView`'s arcade layout, which meant it inherited everything
 * that layout wraps around its content: a slate gradient ground, a DJ mascot,
 * a gradient "RESULTS" wordmark, an install QR, a scaled-up players-ready
 * strip, a host word selector and a controls bar. Nine things competing for a
 * room that should read exactly one — and, fatally, a `z-[60]` root that the
 * projector LOBBY (`fixed inset-0 z-[65]`, opaque navy) painted straight over.
 * Both surfaces are mounted at the instant a round ends. The celebration was
 * never unmounting; it was underneath. See `lib/education/roundEndLayer`.
 *
 * So the classroom branch leaves before any of that: its own opaque navy
 * ground, its own stacking level, one piece of chrome (fullscreen), and the
 * recap. Everything the teacher needs to run it again is inside the recap,
 * where the class can see it too.
 *
 * CLASS-5 SAFE. No entrance tween on this layer — it is painted, at full
 * opacity, from its first frame; the only staged thing is the CONTENT of the
 * already-drawn podium placards inside. A screenshot at any instant shows a
 * finished-looking screen, which is the whole reason the podium was frozen
 * static before and why it no longer has to be.
 */

'use client';

import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import ClassroomTvResults from '@/components/education/results/ClassroomTvResults';
import { PROJECTOR_RESULTS_Z } from '@/lib/education/roundEndLayer';
import { useTvFullscreen } from '../../hooks/useTvFullscreen';
import type { ClassroomSummary } from '@/shared/types/classroom';

export interface ClassroomTvResultsScreenProps {
  summary: ClassroomSummary;
  /** Same list, same code. The screen's ONE primary action, inside the recap. */
  onRematch?: () => void;
  /**
   * Hands the room back to the projector lobby. This layer is `inset-0` and
   * opaque, so until it exists the lobby's "Change game" and START GAME are
   * unreachable — a capture run had to RELOAD the page to change modes, and
   * the click that failed reported `covered by <video>`. Quiet secondary: the
   * recap's one primary action is still REMATCH.
   */
  onClose?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ClassroomTvResultsScreen({
  summary,
  onRematch,
  onClose,
  t,
}: ClassroomTvResultsScreenProps) {
  const { isFullscreen, toggleFullscreen, isSupported } = useTvFullscreen({ enabled: true });

  return (
    <div
      data-testid="classroom-tv-results-screen"
      // z-[75]: above ProjectorLobby's z-[65] — the literal must match the
      // constant, and a test reads both files to prove it still does.
      // Opaque navy, hardcoded: a dark-only game surface never uses the
      // cream/dark pair, which flashes cream on a lazy mount (Class 5).
      className={cn(
        'fixed inset-0 overflow-hidden bg-neo-navy text-neo-white',
        `z-[${PROJECTOR_RESULTS_Z}]`,
        // Tailwind generates arbitrary values only from a LITERAL class string,
        // so the real one is written out here for the compiler to see.
        'z-[75]'
      )}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          data-testid="classroom-tv-dismiss"
          // Secondary, and it looks it: no fill of its own, a 3px cream edge
          // (16.8:1 on navy) so it still reads as a control from the back of
          // the room. The primary action is REMATCH, inside the recap.
          className={cn(
            'absolute top-4 start-4 z-10 flex items-center gap-2 px-4 py-3 rounded-neo',
            'bg-neo-navy-elevated text-neo-cream font-neo-display font-bold uppercase text-lg',
            'border-[3px] border-neo-cream shadow-hard-sm',
            'hover:bg-neo-navy-light transition-colors'
          )}
        >
          <DirectionalIcon icon={ArrowLeft} className="w-6 h-6 shrink-0" aria-hidden="true" />
          {t('education.results.backToLobby')}
        </button>
      )}

      {isSupported && (
        <button
          type="button"
          onClick={toggleFullscreen}
          data-testid="classroom-tv-fullscreen"
          title={isFullscreen ? t('tvBroadcast.exitFullscreen') : t('tvBroadcast.enterFullscreen')}
          aria-label={
            isFullscreen ? t('tvBroadcast.exitFullscreen') : t('tvBroadcast.enterFullscreen')
          }
          // A control has to read as one: solid fill plus a 3px CREAM edge
          // (16.8:1 on navy). A black border on navy measures 1.23:1 and
          // disappears — see the border-by-surface rule in the design cards.
          className={cn(
            'absolute top-4 end-4 z-10 p-3 rounded-neo',
            'bg-neo-navy-elevated text-neo-cream',
            'border-[3px] border-neo-cream shadow-hard-sm',
            'hover:bg-neo-navy-light transition-colors'
          )}
        >
          {isFullscreen ? (
            <Minimize className="w-6 h-6" aria-hidden />
          ) : (
            <Maximize className="w-6 h-6" aria-hidden />
          )}
        </button>
      )}

      {/* The shell is locked; this is the one region allowed to scroll (it
          rarely needs to — the recap is built to fit a 16:9 wall). */}
      <div className="h-full px-8 py-6">
        <ClassroomTvResults summary={summary} onRematch={onRematch} t={t} />
      </div>
    </div>
  );
}

export default ClassroomTvResultsScreen;
