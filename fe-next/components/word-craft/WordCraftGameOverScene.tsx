'use client';

interface Props {
  t: (k: string) => string;
  playerScore: number;
  botScore: number;
  /** Seat names — override the default You/WordBot (e.g. hot-seat Player 1/2). */
  playerName?: string;
  botName?: string;
}

export function WordCraftGameOverScene({ t, playerScore, botScore, playerName, botName }: Props) {
  const isTie = playerScore === botScore;
  const winnerName = playerScore > botScore
    ? (playerName ?? t('wordcraft.you'))
    : (botName ?? t('wordcraft.bot'));
  const label = isTie
    ? t('wordcraft.tied')
    : t('wordcraft.winnerLabel').replace('{{name}}', winnerName);

  return (
    <div
      role="status"
      className="absolute left-1/2 -translate-x-1/2 bottom-[140px] z-40 px-4 py-3 bg-neo-yellow border-neo-thick border-black text-neo-navy rounded-neo shadow-hard-lg font-neo-display font-black uppercase tracking-wider"
    >
      {label}
    </div>
  );
}
