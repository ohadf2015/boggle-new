'use client';

import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, RefreshCw, HelpCircle, Sword, Bomb, Search, CircleDot, ChevronRight, Eye, Users } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import type { ActiveRoom } from '@/shared/types/game';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const HowToPlay = dynamic(() => import('@/components/HowToPlay'), { ssr: false });
import { Loader } from '@/components/ui/Loader';
import AvatarStack from '@/components/multiplayer/AvatarStack';
import CrazyGamesFriendsStrip from '@/components/multiplayer/CrazyGamesFriendsStrip';
import ArenaEmptyState from '@/components/multiplayer/ArenaEmptyState';
import ArenaCTAStrip from '@/components/multiplayer/ArenaCTAStrip';
import { trackMpRoomJoinClicked, trackMpRoomJoinBlocked } from '@/utils/posthogEngagement';

// ==================== Animation Variants ====================

const roomListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.2 },
  },
};

const roomCardVariants = {
  hidden: { opacity: 0, x: -12, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 350, damping: 24 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    x: -20,
    transition: { duration: 0.2 },
  },
};

// ==================== Mode Config ====================

const MODE_CONFIG: Record<string, {
  icon: typeof Sword;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  labelKey: string;
  descKey: string;
}> = {
  classic: {
    icon: Sword,
    borderColor: 'border-s-neo-cyan',
    iconBg: 'bg-neo-cyan',
    iconColor: 'text-neo-black',
    textColor: 'text-neo-cyan',
    labelKey: 'multiplayerFlow.roomList.gameModes.classic',
    descKey: 'gameModes.classic.description',
  },
  blast: {
    icon: Bomb,
    borderColor: 'border-s-neo-pink',
    iconBg: 'bg-neo-pink',
    iconColor: 'text-neo-black',
    textColor: 'text-neo-pink',
    labelKey: 'multiplayerFlow.roomList.gameModes.blast',
    descKey: 'gameModes.blast.description',
  },
  'word-hunt': {
    icon: Search,
    borderColor: 'border-s-neo-purple',
    iconBg: 'bg-neo-purple',
    iconColor: 'text-neo-black',
    textColor: 'text-neo-purple',
    labelKey: 'multiplayerFlow.roomList.gameModes.wordHunt',
    descKey: 'gameModes.wordHunt.description',
  },
  'wheel-rush': {
    icon: CircleDot,
    borderColor: 'border-s-neo-lime',
    iconBg: 'bg-neo-lime',
    iconColor: 'text-neo-black',
    textColor: 'text-neo-lime',
    labelKey: 'multiplayerFlow.roomList.gameModes.wheelRush',
    descKey: 'gameModes.wheelRush.description',
  },
};

/** An unknown mode falls back to how classic looks — same entry, not a copy of it. */
const DEFAULT_MODE_CONFIG = MODE_CONFIG.classic;

// ==================== Types ====================

interface RoomListViewProps {
  activeRooms: ActiveRoom[];
  roomsLoading: boolean;
  onRefreshRooms: () => void;
  onRoomClick: (room: ActiveRoom) => void;
  onCreateRoom: () => void;
  onQuickPlay?: () => void;
  isQuickPlayLoading?: boolean;
  joiningRoomCode?: string | null;
}

// ==================== Component ====================

const RoomListView: React.FC<RoomListViewProps> = ({
  activeRooms,
  roomsLoading,
  onRefreshRooms,
  onRoomClick,
  onCreateRoom,
  onQuickPlay,
  isQuickPlayLoading = false,
  joiningRoomCode = null,
}) => {
  const { t, dir, language } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: async () => {
      onRefreshRooms();
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success(t('multiplayerFlow.roomList.refreshed'), {
        duration: 2000,
      });
    },
    threshold: 60,
  });

  const { totalPlayers, liveMatchCount } = React.useMemo(() => ({
    totalPlayers: activeRooms.reduce((sum, room) => sum + (room.playerCount || 0), 0),
    liveMatchCount: activeRooms.filter((r) => r.gameState === 'in-progress').length,
  }), [activeRooms]);
  const hasRooms = activeRooms.length > 0;

  return (
    <>

      <div
        dir={dir}
        className="flex-1 min-h-0 bg-neo-navy relative flex flex-col w-full max-w-2xl mx-auto"
        {...pullToRefreshHandlers}
      >
        <PullToRefreshIndicator
          pullDistance={pullState.pullDistance}
          isRefreshing={pullState.isRefreshing}
          threshold={60}
        />

        {/* Hero banner — kawaii mascots facing off across the neon arena ring.
            The visible "ARENA HUB" wordmark is baked into the art; an sr-only
            h1 carries the localized title for a11y/SEO. The help (and CG back)
            buttons overlay the hero corners — this removes a full header row of
            vertical space, the main lever for eliminating scroll (esp. on the
            short/medium-short laptop breakpoints). */}
        {/* Hero appears statically — NO opacity:0 entrance. This block wraps the
            LCP <Image>; an opacity:0 initial would exclude it from LCP until React
            hydrates and faded it in (~1.1s render-delay on a priority image that
            already decoded ~561ms). Static appear paints it the instant it loads.
            See memory perf-render-delay-root-cause-2026-06-27. */}
        <m.div
          initial={false}
          className="px-5 lg:px-6 pt-3 lg:pt-4 short:pt-1.5 medium-short:pt-2 shrink-0"
        >
          <h1 className="sr-only">{t('multiplayerFlow.roomList.arenaHub')}</h1>
          <div className="relative w-full mx-auto">
            <div className="relative w-full max-w-[560px] lg:max-w-[720px] desktop-medium-short:lg:max-w-[520px] desktop-short:lg:max-w-[380px] mx-auto bg-neo-navy max-sm:h-[140px] phone-short:h-[70px] sm:aspect-[16/9] overflow-hidden rounded-2xl border-3 border-neo-black shadow-hard">
              <Image
                src="/images/arena-hub-hero.jpg"
                alt={t('multiplayerFlow.roomList.heroAlt')}
                fill
                priority
                sizes="(min-width: 1024px) 720px, (min-width: 640px) 560px, 100vw"
                className="object-cover object-center"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-neo-navy via-neo-navy/40 to-transparent pointer-events-none"
              />

              {/* CG-only back button — overlays top-start. Off-platform the
                  global Header owns "back", so we don't render it here. */}
              {isOnCrazyGamesPlatform && (
                <Link
                  href={`/${language}`}
                  aria-label={t('common.back')}
                  className="absolute top-2 inset-s-2 z-10 flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg border-2 border-neo-black bg-neo-navy/80 backdrop-blur-xs shadow-hard-sm hover:bg-neo-navy active:shadow-hard-pressed active:translate-y-0.5 transition-all focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
                >
                  <DirectionalIcon icon={ArrowLeft} className="w-5 h-5 text-neo-white" />
                </Link>
              )}

              {/* Help / How-to-play — overlays top-end (replaces the old header
                  help icon; this is the only on-demand path to the tutorial). */}
              <button
                type="button"
                onClick={() => setShowHowToPlay(true)}
                className="absolute top-2 inset-e-2 z-10 flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg border-2 border-neo-black bg-neo-navy/80 backdrop-blur-xs shadow-hard-sm hover:bg-neo-navy active:shadow-hard-pressed active:translate-y-0.5 transition-all focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
                aria-label={t('landing.tutorial')}
              >
                <HelpCircle className="w-5 h-5 text-neo-white" />
              </button>
            </div>
          </div>
        </m.div>

        {/* Scrollable content — one centered max-w-2xl column at every width.
            A prior min-[720px] 2-col split (left CTA rail / right arenas pane)
            looked broken on wide + medium-short laptops: a 1024px shell with
            ~205px dead gutters, the CTAs orphaned in a narrow 360px rail above
            a tall void, and the empty-state floating alone in the right pane.
            The two wrapper divs below simply stack via the parent gap-5. */}
        <div className="flex-1 flex flex-col px-5 lg:px-6 gap-5 short:gap-2 medium-short:gap-3 overflow-y-auto pb-10 short:pb-4 medium-short:pb-6 safe-area-bottom pt-5 short:pt-2 medium-short:pt-3">

          {/* Actions group — CTA strip + CG-friends */}
          <div className="flex flex-col gap-5">

          {/* Action Buttons — Quick Start + Create Room side by side */}
          {onQuickPlay && (
            <ArenaCTAStrip
              onQuickPlay={onQuickPlay}
              onCreateRoom={onCreateRoom}
              isQuickPlayLoading={isQuickPlayLoading}
              skipEnterAnimation={hasMountedRef.current}
            />
          )}

          {/* CrazyGames Friends — only shown on platform */}
          <CrazyGamesFriendsStrip />

          </div>
          {/* Arenas group — live-match status + open-arenas list */}
          <div className="flex flex-col gap-5">

          {/* Live Match Status Bar */}
          {liveMatchCount > 0 && (
            <m.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neo-pink/10 border-2 border-neo-pink rounded-xl p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neo-pink animate-pulse" />
                <span className="text-[10px] font-black text-neo-pink uppercase">
                  {liveMatchCount} {t('multiplayerFlow.roomList.liveMatches')}
                </span>
              </div>
              <Eye className="w-4 h-4 text-neo-pink" />
            </m.div>
          )}

          {/* Open Arenas Section — static appear (no opacity:0 + 0.25s delay).
              This is the lobby's primary above-fold content; an opacity:0 entrance
              kept the whole room list invisible until hydration ran the fade,
              compounding the hero LCP render-delay. Individual room cards keep their
              own entrance (AnimatePresence below). See perf-render-delay-root-cause. */}
          <m.section
            initial={false}
            className="flex flex-col gap-3"
            aria-busy={roomsLoading}
          >
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black text-white uppercase tracking-[0.15em]">
                {t('multiplayerFlow.roomList.openArenas')}
                {totalPlayers > 0 && (
                  <span className="text-neo-cyan ms-2 text-[11px]">
                    {totalPlayers} {t('multiplayerFlow.roomList.online')}
                  </span>
                )}
              </h2>
              <m.button
                onClick={onRefreshRooms}
                disabled={roomsLoading}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9, rotate: 180 }}
                transition={{ type: 'spring' as const, stiffness: 300, damping: 15 }}
                className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border-2 border-neo-black/50 bg-neo-navy/50 hover:bg-neo-cyan/20 active:translate-y-0.5 transition-all disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
                aria-label={t('common.refresh')}
              >
                {roomsLoading ? (
                  <Loader size="sm" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-neo-white" />
                )}
              </m.button>
            </div>

            {roomsLoading && activeRooms.length === 0 ? (
              // Skeleton room cards while activeRooms socket payload arrives.
              // Showing card-shaped placeholders (instead of a centered spinner)
              // tells the player "rooms are coming" and keeps Quick Play above
              // visible — directly addresses CG mobile bounce on empty lobby.
              <div
                data-testid="room-list-skeleton"
                className="flex flex-col gap-3"
                aria-hidden="true"
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 border-neo-black border-s-4 border-s-neo-cyan/40 bg-neo-navy-light/30 animate-pulse"
                  >
                    <div className="w-10 h-10 bg-neo-navy-light border-2 border-neo-black rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="h-3 w-2/3 bg-neo-navy-light rounded" />
                      <div className="h-2.5 w-1/3 bg-neo-navy-light/70 rounded" />
                    </div>
                    <div className="w-12 h-6 bg-neo-navy-light/70 rounded-md shrink-0" />
                  </div>
                ))}
              </div>
            ) : hasRooms ? (
              <m.div
                className="flex flex-col gap-3"
                role="list"
                aria-label={t('multiplayerFlow.roomList.roomsListLabel')}
                variants={roomListVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {activeRooms.map((room) => {
                    const mode = MODE_CONFIG[room.gameMode || ''] || DEFAULT_MODE_CONFIG;
                    const ModeIcon = mode.icon;
                    const isJoiningThisRoom = joiningRoomCode === room.gameCode;
                    const isJoinInFlight = joiningRoomCode != null;

                    return (
                      <m.button
                        key={room.gameCode}
                        role="listitem"
                        aria-label={t('multiplayerFlow.roomList.joinRoomAction', { roomName: room.roomName || room.gameCode })}
                        aria-busy={isJoiningThisRoom}
                        disabled={isJoinInFlight}
                        variants={roomCardVariants}
                        exit="exit"
                        layout
                        onClick={() => {
                          if (isJoinInFlight) {
                            trackMpRoomJoinBlocked({ gameMode: room.gameMode || 'classic' });
                            return;
                          }
                          trackMpRoomJoinClicked({ gameMode: room.gameMode || 'classic' });
                          onRoomClick(room);
                        }}
                        onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
                          if (isJoinInFlight) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            trackMpRoomJoinClicked({ gameMode: room.gameMode || 'classic' });
                            onRoomClick(room);
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            (e.currentTarget.nextElementSibling as HTMLElement)?.focus();
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            (e.currentTarget.previousElementSibling as HTMLElement)?.focus();
                          }
                        }}
                        whileHover={{
                          scale: 1.01,
                          y: -2,
                          transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
                        }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 border-neo-black border-s-4 ${mode.borderColor} bg-neo-navy-light/40 hover:bg-neo-navy-light transition-colors text-start group relative overflow-hidden focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime ${isJoinInFlight ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {/* Left: Mode icon + info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 ${mode.iconBg} border-2 border-neo-black rounded-lg flex items-center justify-center shrink-0 shadow-hard-sm`}>
                            {isJoiningThisRoom ? <Loader size="sm" /> : <ModeIcon className={`w-5 h-5 ${mode.iconColor}`} />}
                          </div>

                          {/* Room info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-neo-display font-black text-neo-white text-sm uppercase truncate leading-none">
                                {room.roomName || room.gameCode}
                              </h4>
                              {room.gameState === 'in-progress' && (
                                <div className="w-2 h-2 rounded-full bg-neo-lime animate-pulse shrink-0" />
                              )}
                            </div>

                            {/* Mode badge + language + player count row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                title={t(mode.descKey)}
                                className={cn(
                                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border',
                                `${mode.iconBg}/20 ${mode.textColor} border-current/20`,
                              )}>
                                <ModeIcon className="w-2.5 h-2.5" />
                                {t(mode.labelKey)}
                              </span>
                              <span className="text-[10px] font-bold text-white">
                                {LANGUAGE_FLAGS[room.language] || '🎮'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-2.5 h-2.5 text-white" />
                                <span className={cn(
                                  'text-[10px] font-black',
                                  room.maxPlayers && room.playerCount >= room.maxPlayers
                                    ? 'text-neo-red/70'
                                    : 'text-white'
                                )}>
                                  {room.playerCount || 0}{room.maxPlayers ? `/${room.maxPlayers}` : ''}
                                </span>
                              </span>
                              {room.gameState === 'in-progress' && (
                                <span className={`text-[10px] font-black ${mode.textColor} uppercase italic`}>
                                  {t('multiplayerFlow.roomList.inProgress')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Avatar stack + chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          {room.playerAvatars && room.playerAvatars.length > 0 && (
                            <AvatarStack
                              avatars={room.playerAvatars}
                              totalCount={room.playerCount || 0}
                              maxVisible={3}
                              size="sm"
                            />
                          )}
                          <DirectionalIcon icon={ChevronRight} className="w-4 h-4 text-white shrink-0 group-hover:text-white transition-colors" />
                        </div>
                      </m.button>
                    );
                  })}
                </AnimatePresence>
              </m.div>
            ) : (
              <ArenaEmptyState onQuickPlay={onQuickPlay} isQuickPlayLoading={isQuickPlayLoading} />
            )}
          </m.section>
          </div>
        </div>

        {/* How to Play Dialog */}
        <Dialog open={showHowToPlay} onOpenChange={setShowHowToPlay}>
          <DialogContent
            noDescription
            hideCloseButton
            className="max-w-md sm:max-w-lg max-h-[85dvh] overflow-hidden p-0 bg-neo-navy border-neo-black/50"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{t('landing.tutorial')}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[80dvh]">
              <HowToPlay onClose={() => setShowHowToPlay(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default RoomListView;

