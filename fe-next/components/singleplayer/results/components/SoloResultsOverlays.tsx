import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import WordFeedbackModal from '@/components/voting/WordFeedbackModal';
import TomorrowPreview from '@/components/results/TomorrowPreview';
import { longestWordOf } from '@/components/results/utils';
import type { SinglePlayerMode, SinglePlayerResultsData } from '../../SinglePlayerView';

const UnifiedShareModal = dynamic(() => import('@/components/modals/UnifiedShareModal'), { ssr: false });

const BOT_AVATAR = { emoji: '\u{1F916}', color: '#6366f1' };

interface Props {
  results: SinglePlayerResultsData;
  mode: SinglePlayerMode;
  isWinner: boolean;
  gameLanguage: string;
  showTomorrowPreview: boolean;
  onTomorrowDismiss: () => void;
  wordValidationQueue: string[];
  showWordValidation: boolean;
  setShowWordValidation: (show: boolean) => void;
  onWordVote: Parameters<typeof WordFeedbackModal>[0]['onVote'];
  showShareModal: boolean;
  onCloseShare: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** Modals that sit over the solo results: tomorrow banner, bot-word vote, post-win share. */
export function SoloResultsOverlays({
  results, mode, isWinner, gameLanguage, showTomorrowPreview, onTomorrowDismiss,
  wordValidationQueue, showWordValidation, setShowWordValidation, onWordVote,
  showShareModal, onCloseShare, t,
}: Props) {
  return (
    <>
      <AnimatePresence>
        {showTomorrowPreview && (
          <TomorrowPreview mode={mode === 'practice' ? 'singleplayer' : mode as 'singleplayer'} onDismiss={onTomorrowDismiss} />
        )}
      </AnimatePresence>

      {showWordValidation && wordValidationQueue.length > 0 && (
        <WordFeedbackModal isOpen={showWordValidation} word={wordValidationQueue[0] || ''} submittedBy="Bot"
          submitterAvatar={BOT_AVATAR}
          wordQueue={wordValidationQueue.map(w => ({ word: w, submittedBy: 'Bot', submitterAvatar: BOT_AVATAR }))}
          timeoutSeconds={15} onVote={onWordVote}
          onSkip={() => setShowWordValidation(false)} onTimeout={() => setShowWordValidation(false)} />
      )}

      <UnifiedShareModal
        isOpen={showShareModal}
        onClose={onCloseShare}
        gameCode={`sp_${results.gameSessionId || ''}`}
        context="post-game"
        gameResult={{
          score: results.playerScore,
          wordCount: results.playerWords?.length || 0,
          isWinner: isWinner || results.isNewHighScore,
          longestWord: longestWordOf(results.playerWords),
          maxCombo: results.maxCombo,
        }}
        language={gameLanguage}
        t={t}
      />
    </>
  );
}
