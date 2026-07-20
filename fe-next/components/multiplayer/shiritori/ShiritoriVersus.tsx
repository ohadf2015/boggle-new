'use client';

/**
 * Shiritori — Versus mount. Wires the tested useShiritoriGame brain + pure
 * ShiritoriView to a real socket inside an MP room. The view mounts on
 * `startGame`; useShiritoriInit then polls `requestShiritoriState` and waits for
 * the `shiritoriInit` snapshot (roster, whose turn, required head, chain) before
 * seeding the game hook. Mirrors WordTowerVersus / WheelRushView mount glue.
 */
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import ExitRoomButton from '@/components/ExitRoomButton';
import ShiritoriView from './ShiritoriView';
import { useShiritoriGame, type ShiritoriSocketLike } from './useShiritoriGame';
import { useShiritoriInit, type ShiritoriInitPayload } from './useShiritoriInit';

interface ShiritoriVersusProps {
  socket: Socket | null;
  /** Authoritative per-player key (server keys turns by this username). */
  username: string;
  onQuit?: () => void;
}

/** Inner game — only mounts once the init snapshot exists, so the hook seeds correctly. */
function ShiritoriGame({
  socket,
  username,
  init,
  onQuit,
}: {
  socket: ShiritoriSocketLike | null;
  username: string;
  init: ShiritoriInitPayload;
  onQuit?: () => void;
}) {
  const { t, dir } = useLanguage();
  const game = useShiritoriGame(socket, init.players, init.currentPlayer, {
    chain: init.chain,
    requiredHead: init.requiredHead,
    eliminated: init.eliminated,
    finished: init.finished,
    winner: init.winner,
  });

  return (
    <div className="relative min-h-[100dvh] w-full bg-neo-navy" dir={dir}>
      {onQuit && (
        <div className="absolute left-3 top-3 z-10">
          <ExitRoomButton onClick={onQuit} label={t('common.backToHome')} />
        </div>
      )}
      <ShiritoriView
        chain={game.chain}
        requiredHead={game.requiredHead}
        players={game.players}
        currentPlayer={game.currentPlayer}
        me={username}
        finished={game.finished}
        winner={game.winner}
        lastError={game.lastError}
        onSubmit={game.submit}
        turnStartedAt={game.turnStartedAt}
        t={t}
        dir={dir}
      />
    </div>
  );
}

export function ShiritoriVersus({ socket, username, onQuit }: ShiritoriVersusProps) {
  const { t, dir } = useLanguage();
  const versusSocket = socket as unknown as ShiritoriSocketLike | null;
  const init = useShiritoriInit(versusSocket);

  if (!init) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neo-navy" dir={dir}>
        <p className="animate-pulse font-neo-display text-xl text-neo-cyan">{t('common.starting')}</p>
      </div>
    );
  }

  return <ShiritoriGame socket={versusSocket} username={username} init={init} onQuit={onQuit} />;
}

export default ShiritoriVersus;
