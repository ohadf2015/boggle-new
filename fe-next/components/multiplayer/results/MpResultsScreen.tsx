'use client';

import { MpScreen } from '../shell/MpScreen';
import { MpHudBar } from '../shell/MpHudBar';
import { MpBackButton } from '../shell/MpBackButton';
import { ResultsFriendStatusProvider } from '@/components/results/ResultsFriendStatus';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useMpResultsController, type MpResultsProps, type MpResultsController } from './useMpResultsController';
import { MpResultsStage } from './MpResultsStage';
import { resultsExitCopy } from '@/lib/multiplayer/resultsExitCopy';

export type MpResultsScreenProps = MpResultsProps;

/**
 * RESULTS — the one results screen for both the between-rounds intermission
 * and the final results. It branches inside on `seriesRoundNumber <
 * seriesTotalGames` (read after the TIME! beat, see useLockedBranch), so the
 * router needs no discriminator. All behaviour lives in useMpResultsController;
 * the reveal lives in MpResultsStage; the deep dive in MpResultsDetails.
 */
export default function MpResultsScreen(props: MpResultsScreenProps) {
  return (
    <ResultsFriendStatusProvider>
      <MpResultsScreenInner {...props} />
    </ResultsFriendStatusProvider>
  );
}

function MpResultsScreenInner(props: MpResultsScreenProps) {
  const c = useMpResultsController(props);
  const { t } = c;

  // Exit confirmed: a clean navy wash, never a half-torn results screen.
  if (c.isExiting) {
    return <div data-testid="results-exit-wash" className="fixed inset-0 z-[9999] bg-neo-navy" />;
  }

  // Host tapped next: a brand wash over the interstitial teardown / socket gap.
  if (c.nextRound.isStartingNextRound) {
    return (
      <div data-testid="results-next-round-wash" role="status" aria-live="polite" className="fixed inset-0 z-[9998] bg-neo-navy grid place-items-center">
        <div className="flex flex-col items-center gap-4 font-neo-display text-neo-white">
          <div aria-hidden="true" className="w-12 h-12 rounded-full border-4 border-neo-pink border-t-transparent animate-spin" />
          <div className="text-lg tracking-wide uppercase">{t('common.preparingGame')}</div>
        </div>
      </div>
    );
  }

  // No scores yet (20s requestResults fallback / socket reorder): a visible
  // "calculating" card, never a blank navy viewport.
  if (c.data.sortedScores.length === 0) return <CalculatingScreen c={c} />;

  return <MpResultsStage c={c} />;
}

function CalculatingScreen({ c }: { c: MpResultsController }) {
  const { t, props } = c;
  const exitCopy = resultsExitCopy({ isClassroom: c.isClassroom, isHost: !!props.isHost });
  return (
    <>
      <MpScreen
        testId="mp-results"
        header={<MpHudBar start={<MpBackButton kind="leave" onPress={c.requestExit} />} center={null} end={null} />}
        body={
          <div data-testid="results-empty-state" className="flex-1 grid place-items-center px-6 text-center">
            <div className="flex flex-col items-center gap-4 max-w-md">
              <div aria-hidden="true" className="w-12 h-12 rounded-full border-2 border-neo-cyan/40 border-t-neo-cyan animate-spin" />
              <h2 className="font-neo-display font-bold text-2xl uppercase tracking-wide">{t('results.calculating', 'Calculating results')}</h2>
              <p className="text-sm opacity-70">{t('results.calculatingHint', 'Tallying scores and validating words — this only takes a moment.')}</p>
              {props.onReturnToRoom && (
                <button
                  type="button"
                  onClick={props.onReturnToRoom}
                  className="mt-2 px-4 py-2 rounded-neo border-2 border-neo-cyan/40 text-sm font-neo-display font-bold uppercase tracking-wide"
                >
                  {t('results.backToLobby', 'Back to lobby')}
                </button>
              )}
            </div>
          </div>
        }
      />
      <ConfirmationDialog
        open={c.showExitConfirm}
        onOpenChange={c.setShowExitConfirm}
        title={t(exitCopy.titleKey)}
        description={t(exitCopy.bodyKey)}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={c.confirmExitRoom}
        variant="default"
        analyticsId="exit_room_confirm"
      />
    </>
  );
}
