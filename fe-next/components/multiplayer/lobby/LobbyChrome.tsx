'use client';

/**
 * Lobby chrome shared by host and joiner: the header controls and the three
 * sheets (invite, how-to-play, chat). Everything that used to stack in the
 * lobby body — squad art, the how-to-play accordion, the chat panel, the chat
 * FAB — lives behind one of these now, so the body is seats + mode only.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, LogOut, MessageCircle } from 'lucide-react';
import { MpSheet } from '@/components/multiplayer/shell/MpSheet';
import RoomChat from '@/components/RoomChat';
import { LobbyTutorialPanel } from '@/components/lobby/LobbyTutorialPanel';
import { GameInstructions } from '@/host/components/pre-game/GameInstructions';
import { InviteCard, type InviteCardProps } from '@/host/components/pre-game/desktop/InviteCard';
import type { GameModeOption } from '@/components/GameModeSelector';
import type { Language } from '@/shared/types/game';
import { cn } from '@/lib/utils';

type T = (path: string, params?: Record<string, string | number>) => string;

/** Sheets open on a tap, so reading the viewport then is safe (no first-paint density hook). */
function useSheetSide(open: boolean): 'bottom' | 'end' {
  const [side, setSide] = useState<'bottom' | 'end'>('bottom');
  useEffect(() => {
    if (!open || typeof window === 'undefined' || !window.matchMedia) return;
    setSide(window.matchMedia('(min-width: 720px)').matches ? 'end' : 'bottom');
  }, [open]);
  return side;
}

const ICON_BUTTON =
  'relative inline-flex items-center justify-center shrink-0 w-10 h-10 tv:w-16 tv:h-16 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white shadow-hard-sm transition-transform active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-neo-cyan';

/**
 * Leave the room. Labelled "Exit" (common.exit) — the joiner's guard tests and
 * screen readers know this control by that name. `onPress` is the view's exit
 * handler, which confirms and routes through the MP exit path.
 */
export function LobbyExitButton({ onPress, t, className }: { onPress: () => void; t: T; className?: string }) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={t('common.exit')}
      data-testid="lobby-exit"
      className={cn(ICON_BUTTON, 'bg-neo-red text-neo-black', className)}
    >
      <LogOut aria-hidden="true" className="w-5 h-5 rtl:-scale-x-100" />
    </button>
  );
}

/** Header chat icon with an unread badge (phone; desktop uses the rail's LobbyChatLauncher). */
export function LobbyChatButton({ onPress, unread, t, className }: { onPress: () => void; unread: number; t: T; className?: string }) {
  return (
    <button type="button" onClick={onPress} aria-label={t('mpUi.lobby.chat')} data-testid="lobby-chat-button" className={cn(ICON_BUTTON, className)}>
      <MessageCircle aria-hidden="true" className="w-5 h-5" />
      {unread > 0 && (
        <span
          key={unread}
          data-testid="lobby-chat-unread"
          className="absolute -top-2 -end-2 min-w-5 h-5 px-1 rounded-full border-2 border-neo-black bg-neo-pink text-neo-black text-[11px] font-bold leading-4 text-center animate-mp-bump"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

/**
 * Desktop rail chat entry: one row, not a panel. The chat (and the guest age
 * gate) opens in the sheet, so an idle room never spends the rail on an empty
 * "Tell us your age" box.
 */
export function LobbyChatLauncher({ onPress, unread, t, className }: { onPress: () => void; unread: number; t: T; className?: string }) {
  return (
    <button
      type="button"
      onClick={onPress}
      data-testid="lobby-chat-launcher"
      className={cn(
        'group w-full flex items-center gap-3 rounded-neo-lg border-3 border-neo-black bg-neo-navy-light/70 px-4 py-3 text-start shadow-hard',
        'transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-neo-cyan',
        className,
      )}
    >
      <span className="relative shrink-0 inline-flex items-center justify-center w-[calc(40px*var(--mp-u,1))] h-[calc(40px*var(--mp-u,1))] rounded-neo border-2 border-neo-black bg-neo-pink text-neo-black shadow-hard-sm transition-transform group-hover:-rotate-6">
        <MessageCircle aria-hidden="true" className="w-5 h-5" />
        {unread > 0 && (
          <span key={unread} className="absolute -top-2 -end-2 min-w-5 h-5 px-1 rounded-full border-2 border-neo-black bg-neo-lime text-neo-black text-[11px] font-bold leading-4 text-center animate-mp-bump">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 flex flex-col">
        <span className="font-neo-display text-[length:calc(15px*var(--mp-u,1))] font-bold uppercase tracking-wider text-neo-white">{t('mpUi.lobby.chat')}</span>
        <span className="truncate text-[length:calc(13px*var(--mp-u,1))] font-bold text-neo-white/70">
          {unread > 0 ? t('mpUi.lobby.chatUnread', { count: unread }) : t('mpUi.lobby.chatHint')}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="shrink-0 w-5 h-5 text-neo-white/60 rtl:-scale-x-100 group-hover:text-neo-cyan" />
    </button>
  );
}

/** Players n/8 pill for the header. */
export function LobbyCountPill({ count, max, className }: { count: number; max: number; className?: string }) {
  return (
    <span
      data-testid="lobby-count"
      dir="ltr"
      className={cn('inline-flex items-center h-10 px-3 rounded-neo border-2 border-neo-black bg-neo-navy-light font-neo-display font-bold text-neo-white tabular-nums shadow-hard-sm', className)}
    >
      {count}/{max}
    </span>
  );
}

export function InviteSheet({ open, onClose, gameCode, t }: { open: boolean; onClose: () => void; gameCode: string; t: T }) {
  const side = useSheetSide(open);
  return (
    <MpSheet open={open} onClose={onClose} title={t('mpUi.lobby.inviteTitle')} side={side} testId="lobby-invite-sheet">
      <InviteCard gameCode={gameCode} t={t as InviteCardProps['t']} variant="sheet" />
    </MpSheet>
  );
}

export function HowToPlaySheet({ open, onClose, mode, lang, t }: { open: boolean; onClose: () => void; mode: GameModeOption; lang: Language; t: T }) {
  const side = useSheetSide(open);
  return (
    <MpSheet open={open} onClose={onClose} title={t('mpUi.lobby.howToPlay')} side={side} testId="lobby-howto-sheet">
      <GameInstructions selectedGameMode={mode} t={t} lang={lang} />
    </MpSheet>
  );
}

/**
 * Room chat. The age gate RoomChat enforces for guests renders inside this
 * sheet only — it no longer claims the lobby body. CrazyGames disables chat,
 * so the sheet teaches the game instead.
 */
export function LobbyChatPanel({ username, isHost, gameCode, t, crazyGames }: { username: string; isHost: boolean; gameCode: string; t: T; crazyGames: boolean }) {
  return crazyGames ? (
    <LobbyTutorialPanel t={t} />
  ) : (
    <RoomChat username={username} isHost={isHost} gameCode={gameCode} className="h-full" onNewMessage={() => {}} variant="embedded" />
  );
}

export function ChatSheet({ open, onClose, t, children }: { open: boolean; onClose: () => void; t: T; children: ReactNode }) {
  const side = useSheetSide(open);
  return (
    <MpSheet open={open} onClose={onClose} title={t('mpUi.lobby.chat')} side={side} testId="lobby-chat-sheet">
      <div className="h-[min(60dvh,520px)] min-h-0 flex flex-col">{children}</div>
    </MpSheet>
  );
}
