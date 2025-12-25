'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import nextDynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { Socket } from 'socket.io-client';
import AutoHideHeader from '@/components/AutoHideHeader';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import { ConnectionDot } from '@/components/ConnectionStatusIndicator';
import { SocketContext, getSharedSocket, releaseSharedSocket, getSharedSocketIfExists, getSocketURL } from '@/utils/SocketContext';
import { saveSession, getSession, clearSession, clearSessionPreservingUsername } from '@/utils/session';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMusic } from '@/contexts/MusicContext';
import { getGuestSessionId, hashToken } from '@/utils/guestManager';
import { getSession as getSupabaseSession } from '@/lib/supabase';
import logger from '@/utils/logger';
import { getRandomDefaultNameWithAvatar, getAvatarForName } from '@/utils/defaultNames';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import type { Language, ActiveRoom } from '@/shared/types/game';

interface ResultsData {
  scores: Array<{
    username: string;
    score: number;
    words: string[];
  }>;
  letterGrid: string[][];
  /** Whether duplicate word rule is disabled (for rooms with >7 players) */
  duplicateRuleDisabled?: boolean;
  /** Number of players in the game */
  playerCount?: number;
}

interface GameStartData {
  letterGrid: string[][];
  timerSeconds: number;
  language: Language;
}

// Dynamic imports for code splitting - only load when needed
const HostView = nextDynamic(() => import('@/host/HostView'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: false,
});

const PlayerView = nextDynamic(() => import('@/player/PlayerView'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: false,
});

const MultiplayerLobby = nextDynamic(() => import('@/components/multiplayer/MultiplayerLobby'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: false,
});

const ResultsPage = nextDynamic(() => import('@/components/views/ResultsPage'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: false,
});

const QuickJoinView = nextDynamic(() => import('@/components/join-view/QuickJoinView'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: false,
});

// Loading skeleton component
function ViewLoadingSkeleton() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-3">
          <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
        </div>
        <p className="text-gray-600 text-sm">Loading game...</p>
      </div>
    </div>
  );
}

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

const SOCKET_CONFIG = {
  RECONNECTION_ATTEMPTS: 10,
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 30000,
  HOST_KEEP_ALIVE_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 15000, // Reduced from 20s for faster feedback on slow connections
  ROOMS_LOADING_TIMEOUT: 3000, // Reduced timeout for active rooms - show UI faster
};

// Note: Socket singleton is now managed by SocketContext.tsx
// Use getSharedSocket(), releaseSharedSocket(), and getSharedSocketIfExists()

export default function MultiplayerPage(): React.JSX.Element {
  const [gameCode, setGameCode] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [guestAvatar, setGuestAvatar] = useState<{ emoji: string; color: string } | null>(null);
  const [roomName, setRoomName] = useState<string>('');
  const [hostUsername, setHostUsername] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [attemptingReconnect, setAttemptingReconnect] = useState<boolean>(false);
  const [roomLanguage, setRoomLanguage] = useState<Language | null>(null);
  const [playersInRoom, setPlayersInRoom] = useState<Array<{ username: string; score?: number }>>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [roomsLoading, setRoomsLoading] = useState<boolean>(true); // Track rooms loading state
  const [pendingGameStart, setPendingGameStart] = useState<GameStartData | null>(null); // Store game start data for players returning from results
  const [isJoining, setIsJoining] = useState<boolean>(false); // Track join/create loading state
  const [authLoadingStartTime, setAuthLoadingStartTime] = useState<number | null>(null); // Track when auth loading started

  // Late joiner & spectator state
  const [isSpectator, setIsSpectator] = useState<boolean>(false);
  const [isLateJoiner, setIsLateJoiner] = useState<boolean>(false);
  const [showLateJoinerWelcome, setShowLateJoinerWelcome] = useState<boolean>(false);
  const [spectators, setSpectators] = useState<Array<{ username: string; socketId: string; avatar: any }>>([]);

  const socketRef = useRef<Socket | null>(null);
  const attemptingReconnectRef = useRef<boolean>(attemptingReconnect);
  const hostKeepAliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasConnectedRef = useRef<boolean>(false);
  const showResultsRef = useRef<boolean>(showResults);

  const { t, language } = useLanguage();
  const { user, isAuthenticated, isSupabaseEnabled, profile, loading, refreshProfile } = useAuth();
  const isLandscape = useMobileLandscape();
  const { playTrack, fadeToTrack, TRACKS } = useMusic();

  // Track auth loading start time for timeout
  useEffect(() => {
    if (loading && !authLoadingStartTime) {
      setAuthLoadingStartTime(Date.now());
    } else if (!loading) {
      setAuthLoadingStartTime(null);
    }
  }, [loading, authLoadingStartTime]);

  // Track if we should auto-join (prefilled room + existing username)
  const [shouldAutoJoin, setShouldAutoJoin] = useState(false);
  const [prefilledRoomCode, setPrefilledRoomCode] = useState('');
  // State for QuickJoinView
  const [usernameError, setUsernameError] = useState(false);
  const [usernameErrorKey, setUsernameErrorKey] = useState<string | undefined>();
  const [roomNameError, setRoomNameError] = useState(false);
  const [roomNameErrorKey, setRoomNameErrorKey] = useState<string | undefined>();
  const [hostUsernameError, setHostUsernameError] = useState(false);
  const [hostUsernameErrorKey, setHostUsernameErrorKey] = useState<string | undefined>();
  const [gameCodeError, setGameCodeError] = useState(false);
  const [gameCodeErrorKey, setGameCodeErrorKey] = useState<string | undefined>();
  const [showFullForm, setShowFullForm] = useState(false); // Track if user wants to see full form instead of quick join

  // Music transitions based on game state
  // Note: We always call playTrack/fadeToTrack even if audio isn't unlocked yet
  // The MusicContext will queue the request and play when user interacts
  useEffect(() => {
    if (showResults) {
      // Results screen - bossa music is already playing from validation phase
      // Don't change the music, let it continue
      return;
    } else if (!isActive) {
      // Lobby - play lobby music
      playTrack(TRACKS.LOBBY);
    } else if (isActive) {
      // In room waiting - play before game music
      // (in_game music is triggered by HostView/PlayerView when game actually starts)
      playTrack(TRACKS.BEFORE_GAME);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, showResults]);

  // Initialize state from URL and session
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const roomFromUrl = urlParams.get('room');
      logger.log('[Init] URL search:', window.location.search, '| roomFromUrl:', roomFromUrl);
      const savedUsername = typeof window !== 'undefined'
        ? localStorage.getItem('boggle_username') || ''
        : '';
      const savedSession = getSession();

      let joiningNewRoomViaInvitation = false;
      const hasSession = savedSession && savedSession.gameCode;

      if (roomFromUrl) {
        logger.log('[Init] Setting prefilledRoomCode to:', roomFromUrl);
        setGameCode(roomFromUrl);
        setPrefilledRoomCode(roomFromUrl);
        if (savedSession?.gameCode && savedSession.gameCode !== roomFromUrl) {
          clearSession();
          joiningNewRoomViaInvitation = true;
        }
        if (savedUsername && savedUsername.trim()) {
          setUsername(savedUsername);
          setShouldAutoJoin(true);
        }
      } else if (hasSession) {
        // Only auto-reconnect if this is a page refresh, not intentional navigation
        // Check if user arrived via refresh (reload) vs navigation
        const isPageRefresh = (() => {
          try {
            const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
            const firstEntry = navEntries[0];
            if (firstEntry) {
              return firstEntry.type === 'reload';
            }
            // Fallback for older browsers
            return performance.navigation?.type === 1;
          } catch {
            return false;
          }
        })();

        if (isPageRefresh) {
          setGameCode(savedSession.gameCode);
          setAttemptingReconnect(true);
        } else {
          // User intentionally navigated to main page - clear session and let them start fresh
          logger.log('[Init] User navigated to main page, clearing session');
          clearSession();
        }
      }

      if (roomFromUrl && savedUsername) {
        // Already set above, derive avatar from name
        setGuestAvatar(getAvatarForName(savedUsername));
      } else if (joiningNewRoomViaInvitation) {
        if (savedUsername) {
          setUsername(savedUsername);
          setGuestAvatar(getAvatarForName(savedUsername));
        } else {
          // Set a fun random default name for guests with matching avatar
          const { name, avatar } = getRandomDefaultNameWithAvatar(language);
          setUsername(name);
          setGuestAvatar(avatar);
        }
      } else if (savedSession?.username) {
        setUsername(savedSession.username);
        setGuestAvatar(getAvatarForName(savedSession.username));
      } else if (savedUsername) {
        setUsername(savedUsername);
        setGuestAvatar(getAvatarForName(savedUsername));
      }
      // Note: We don't set random guest names here anymore
      // For guests without saved names, the auth effect or handleJoin will handle it
      // This prevents authenticated users from briefly seeing random guest names

      // Also set roomName for hosting if not already set
      if (!joiningNewRoomViaInvitation && savedSession?.roomName) {
        setRoomName(savedSession.roomName);
      }
      // Note: We don't set random room names here anymore for the same reason
    };

    Promise.resolve().then(initializeState);
  }, [language]);

  // Set username and roomName from profile display_name for authenticated users
  // Uses fallback chain from OAuth metadata if profile hasn't loaded yet
  // For guests without saved names, generate random names only after auth is confirmed
  const hasSetRandomNameRef = useRef<boolean>(false);
  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    if (user) {
      // Authenticated user - use display name from profile/OAuth
      const displayName =
        profile?.display_name ||                    // Best: profile display name
        user?.user_metadata?.full_name ||           // Good: OAuth full name
        user?.user_metadata?.name ||                // Okay: OAuth name
        user?.email?.split('@')[0] ||               // Fallback: email prefix
        '';

      if (displayName) {
        setUsername(displayName);
      }
    } else if (!hasSetRandomNameRef.current) {
      // Guest user - check if we need to generate a random name
      // Use ref to prevent setting random names multiple times
      const savedUsername = typeof window !== 'undefined'
        ? localStorage.getItem('boggle_username') || ''
        : '';

      // IMPORTANT: Check current username state first - user may have typed a name in the form
      // Only generate random name if BOTH saved and current username are empty
      if (!savedUsername.trim() && !username.trim()) {
        // No saved username AND no current username - generate a fun random name
        const { name, avatar } = getRandomDefaultNameWithAvatar(language);
        logger.log('[AUTH] Generated random name for guest:', name, 'avatar:', avatar.emoji);
        setUsername(name);
        setGuestAvatar(avatar);
        hasSetRandomNameRef.current = true;
      } else if (savedUsername.trim() && !username.trim()) {
        // Have saved username but current state is empty - restore from localStorage
        logger.log('[AUTH] Using saved username:', savedUsername);
        setUsername(savedUsername);
        setGuestAvatar(getAvatarForName(savedUsername));
      } else if (username.trim()) {
        // User has already entered a name - don't override it, just set avatar
        logger.log('[AUTH] Preserving user-entered username:', username);
        setGuestAvatar(getAvatarForName(username));
      }
    }
  }, [user, profile?.display_name, loading, language]);

  // Refresh profile on mount for authenticated users to get latest display_name
  useEffect(() => {
    if (isAuthenticated && user?.id && refreshProfile) {
      refreshProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  useEffect(() => {
    attemptingReconnectRef.current = attemptingReconnect;
  }, [attemptingReconnect]);

  useEffect(() => {
    showResultsRef.current = showResults;
  }, [showResults]);

  // Initialize Socket.IO connection using shared singleton
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Use shared socket singleton (may already exist from SocketProvider or previous mount)
    const existingSocket = getSharedSocketIfExists();
    if (existingSocket && existingSocket.connected) {
      socketRef.current = existingSocket;
      // Defer state updates to avoid calling setState directly within effect
      Promise.resolve().then(() => {
        setSocket(existingSocket);
        setIsConnected(true);
        // Request active rooms since we're reusing an existing connection
        existingSocket.emit('getActiveRooms');
      });

      // Set up activeRooms listener for existing socket
      const handleActiveRooms = (data: { rooms?: ActiveRoom[] }) => {
        setActiveRooms(data.rooms || []);
        setRoomsLoading(false);
      };
      existingSocket.on('activeRooms', handleActiveRooms);

      // Fallback timeout for rooms loading - show UI faster on slow connections
      const roomsLoadingTimeout = setTimeout(() => {
        setRoomsLoading(false);
      }, SOCKET_CONFIG.ROOMS_LOADING_TIMEOUT);

      return () => {
        clearTimeout(roomsLoadingTimeout);
        existingSocket.off('activeRooms', handleActiveRooms);
      };
    }

    // Get or create shared socket instance
    const socketUrl = getSocketURL();
    logger.log('[SOCKET.IO] MultiplayerPage using shared socket:', socketUrl);

    const newSocket = getSharedSocket();
    socketRef.current = newSocket;

    // Connection events
    newSocket.on('connect', () => {
      logger.log('[SOCKET.IO] Connected:', newSocket.id);
      setIsConnected(true);
      setSocket(newSocket);

      // Request active rooms on connect
      newSocket.emit('getActiveRooms');

      // Handle reconnection to game
      if (wasConnectedRef.current) {
        const savedSession = getSession();
        if (savedSession?.gameCode) {
          logger.log('[SOCKET.IO] Reconnecting to game:', savedSession.gameCode);
          toast.success(t('common.reconnecting') || 'Reconnecting to game...', {
            duration: 2000,
            icon: '🔄',
          });

          // Build auth context inline for reconnection
          const buildAuthContext = async () => {
            try {
              // First check if user is authenticated via Supabase session
              // (user state may not be set yet during reconnect, so check session directly)
              const { data: { session } } = await getSupabaseSession();
              if (session?.user?.id) {
                return { authUserId: session.user.id, guestTokenHash: null };
              }

              // Fall back to guest token
              const guestSessionId = getGuestSessionId();
              if (guestSessionId) {
                const hash = await hashToken(guestSessionId);
                return { authUserId: null, guestTokenHash: hash };
              }
              return { authUserId: null, guestTokenHash: null };
            } catch (error) {
              logger.error('[AUTH] Failed to build auth context during reconnection:', error);
              return { authUserId: null, guestTokenHash: null };
            }
          };

          buildAuthContext().then((authContext) => {
            // Check if socket is still connected after async operation
            if (!newSocket.connected) {
              logger.warn('[SOCKET.IO] Socket disconnected during auth context build, skipping reconnection emit');
              return;
            }
            if (savedSession.isHost) {
              newSocket.emit('createGame', {
                gameCode: savedSession.gameCode,
                roomName: savedSession.roomName,
                language: savedSession.language || language,
                hostUsername: savedSession.hostUsername || savedSession.username,
                ...authContext,
                avatar: profile ? {
                  emoji: profile.avatar_emoji,
                  color: profile.avatar_color,
                } : getAvatarForName(savedSession.hostUsername || savedSession.username || ''),
              });
            } else {
              newSocket.emit('join', {
                gameCode: savedSession.gameCode,
                username: savedSession.username,
                ...authContext,
                avatar: profile ? {
                  emoji: profile.avatar_emoji,
                  color: profile.avatar_color,
                } : getAvatarForName(savedSession.username || ''),
              });
            }
          });
        }
      }
      wasConnectedRef.current = true;
    });

    newSocket.on('disconnect', (reason) => {
      logger.log('[SOCKET.IO] Disconnected:', reason);
      setIsConnected(false);
      setIsJoining(false); // Clear joining state on disconnect to prevent stuck button

      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      logger.error('[SOCKET.IO] Connection error:', error.message);
      setError(t('errors.unstableConnection') || 'Connection error');
      setIsJoining(false); // Clear joining state on connection error
    });

    newSocket.on('reconnect', (attemptNumber) => {
      logger.log('[SOCKET.IO] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      toast.success(t('common.reconnected') || 'Reconnected!', {
        duration: 2000,
        icon: '✓',
      });
    });

    newSocket.on('reconnect_failed', () => {
      logger.error('[SOCKET.IO] Reconnection failed');
      setError(t('errors.connectionLost') || 'Connection lost');
      setIsJoining(false); // Clear joining state on reconnection failure
    });

    // Game events
    newSocket.on('joined', (data) => {
      logger.log('[SOCKET.IO] ✅ Joined successfully:', data);
      setIsHost(data.isHost);
      setIsActive(true);
      setError('');
      setAttemptingReconnect(false);
      setShouldAutoJoin(false);
      setIsJoining(false); // Clear loading state
      setPrefilledRoomCode(''); // Clear prefilled room code on successful join

      if (data.language) {
        setRoomLanguage(data.language);
      }

      const joinedUsername = data.username || username;
      if (data.isHost) {
        setUsername(joinedUsername);
        localStorage.setItem('boggle_username', joinedUsername);
      } else if (username) {
        localStorage.setItem('boggle_username', username);
      }

      saveSession({
        gameCode: data.gameCode || gameCode,
        username: joinedUsername,
        isHost: data.isHost,
        roomName: data.isHost ? roomName : '',
        hostUsername: data.isHost ? joinedUsername : undefined,
        language: data.language || roomLanguage,
      });
    });

    newSocket.on('updateUsers', (data) => {
      if (data.users) {
        setPlayersInRoom(data.users);
      }
    });

    newSocket.on('activeRooms', (data) => {
      setActiveRooms(data.rooms || []);
      setRoomsLoading(false);
    });

    // Spectator & Late Joiner events
    newSocket.on('joinedAsSpectator', (data) => {
      logger.log('[SPECTATOR] Joined as spectator:', data);
      setIsSpectator(true);
      setGameCode(data.gameCode);
      setRoomName(data.roomName);
      setRoomLanguage(data.language);
      setIsJoining(false);

      saveSession({
        gameCode: data.gameCode,
        username: data.username || username,
        isHost: false,
        roomName: data.roomName,
        language: data.language,
      });

      toast(t('spectator.youAreSpectating') || 'Watching as spectator', {
        duration: 4000,
        icon: '👀',
      });
    });

    newSocket.on('spectatorList', (data) => {
      logger.log('[SPECTATOR] Spectator list updated:', data.spectators?.length || 0);
      setSpectators(data.spectators || []);
    });

    newSocket.on('spectatorUpgraded', (data) => {
      if (data.success && data.username === username) {
        logger.log('[SPECTATOR] Upgraded to player, late join:', data.lateJoin);
        setIsSpectator(false);
        setIsActive(true);
        setPlayersInRoom(data.users || []);

        if (data.lateJoin) {
          setIsLateJoiner(true);
          setShowLateJoinerWelcome(true);
        }

        toast.success(t('spectator.upgraded') || 'You can now play!', {
          duration: 3000,
          icon: '🎮',
        });
      }
    });

    // Fallback: if rooms don't load quickly, stop showing loading state for better UX on slow connections
    const roomsLoadingTimeout = setTimeout(() => {
      setRoomsLoading(false);
    }, SOCKET_CONFIG.ROOMS_LOADING_TIMEOUT);

    // Debug handler to check server-side game state
    newSocket.on('debugGameStateResponse', (data) => {
      logger.log('[DEBUG] Server game state:', data);
    });

    newSocket.on('error', (data) => {
      setIsJoining(false); // Clear loading state on any error

      // Handle empty error objects (Socket.IO internal errors) - log as debug, not error
      // Also handle Error instances that may appear as {} when logged
      const isEmptyError = !data ||
        (typeof data === 'object' && Object.keys(data).length === 0) ||
        (data instanceof Error && !data.message);

      if (isEmptyError) {
        logger.debug('[SOCKET.IO] Received empty error object (internal Socket.IO event)', {
          connected: newSocket.connected,
          id: newSocket.id
        });
        return; // Don't process empty errors further
      }

      // Log meaningful errors
      logger.error('[SOCKET.IO] ❌ Error received:', data);

      // If error is about game not in progress, query server for actual state
      if (data?.code === 'GAME_NOT_IN_PROGRESS' || data?.message?.includes('not in progress')) {
        logger.error('[SOCKET.IO] Game state mismatch - querying server for actual state');
        newSocket.emit('debugGameState');
      }

      // Handle specific error cases
      if (data.message?.includes('not found') || data.message?.includes('Game not found')) {
        if (attemptingReconnectRef.current) {
          setError(t('errors.sessionExpired'));
          toast.error(t('errors.sessionExpired'), { duration: 4000, icon: '⚠️' });
        } else {
          setError(t('errors.gameCodeNotExist'));
          toast.error(t('errors.gameCodeNotExist'), { duration: 4000, icon: '❌' });
        }
        setGameCode('');
        setPrefilledRoomCode(''); // Clear prefilled room so user sees main join page
        setIsActive(false);
        setAttemptingReconnect(false);
        setShouldAutoJoin(false);
        clearSession();

        // Remove room parameter from URL without page reload
        if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('room');
          window.history.replaceState({}, '', url.pathname + (url.search || ''));
        }
      } else if (data.message?.includes('already in use') || data.message?.includes('Game code already')) {
        setError(t('errors.gameCodeExists'));
        setIsActive(false);
        setIsHost(false);
        setAttemptingReconnect(false);
      } else if (data.message?.includes('username') || data.message?.includes('Username')) {
        setError(t('errors.usernameTaken'));
        setIsActive(false);
        setAttemptingReconnect(false);
        setShouldAutoJoin(false);
        clearSession();
      } else {
        setError(data.message || 'An error occurred');
      }
    });

    // Handle game start at page level to avoid race conditions
    // Store game start data so PlayerView can consume it when it mounts or updates
    // This ensures the event is captured even if PlayerView is still loading (dynamic import)
    // Note: The actual "Game Started" toast is shown by PlayerView/HostView components
    newSocket.on('startGame', (data) => {
      logger.log('[SOCKET.IO] startGame received:', data);

      // Always store pending game start data for PlayerView to consume
      setPendingGameStart(data);

      // If viewing results, transition back to game
      if (showResultsRef.current) {
        logger.log('[SOCKET.IO] Closing results to start new game');
        setShowResults(false);
        setResultsData(null);
      }
      // Toast notification is handled by PlayerView/HostView to avoid duplicates
    });

    // Handle game reset - keep players in the room for new game
    // Note: Toast notification is handled by PlayerView/HostView to avoid duplicates
    newSocket.on('resetGame', () => {
      logger.log('[SOCKET.IO] Game reset - staying in room for new game');
      // Update ref SYNCHRONOUSLY before state change to prevent race condition
      // where startGame arrives before the ref useEffect updates
      showResultsRef.current = false;
      setShowResults(false);
      setResultsData(null);
      // Toast notification is handled by PlayerView/HostView to avoid duplicates
    });

    newSocket.on('hostLeftRoomClosing', (data) => {
      toast.error(data.message || t('playerView.roomClosed'), {
        icon: '🚪',
        duration: 5000,
      });
      // Preserve username in localStorage for smooth fallback to lobby
      clearSessionPreservingUsername(username);
      setIsActive(false);
      setIsHost(false);
      setGameCode('');
      setTimeout(() => window.location.reload(), 2000);
    });

    // Handle session migration (another tab took over)
    newSocket.on('sessionMigrated', (data) => {
      logger.log('[SOCKET.IO] Session migrated:', data);
      toast(data.message || 'Your session was moved to another tab', {
        icon: '🔄',
        duration: 5000,
      });
      // Clear local state - session is now in another tab
      clearSessionPreservingUsername(username);
      setIsActive(false);
      setIsHost(false);
      setGameCode('');
    });

    // Handle joining as spectator (room is full)
    newSocket.on('joinedAsSpectator', (data) => {
      logger.log('[SOCKET.IO] Joined as spectator:', data);
      setIsJoining(false); // Clear loading state
      setPrefilledRoomCode(''); // Clear prefilled room code
      setAttemptingReconnect(false);
      setShouldAutoJoin(false);

      toast(t('common.roomFull') || 'Room is full. You joined as a spectator.', {
        icon: '👀',
        duration: 5000,
      });

      // Set spectator state - user can watch but not participate
      if (data.language) {
        setRoomLanguage(data.language);
      }
      // Note: We don't set isActive=true since spectators can't participate
      // They're in the socket room but not in the game
    });

    // Handle server warnings (e.g., Redis failures)
    newSocket.on('warning', (data) => {
      logger.warn('[SOCKET.IO] Warning:', data);
      if (data.type === 'persistence') {
        toast.error(data.message || 'Game state could not be saved. Progress may be lost on server restart.', {
          icon: '⚠️',
          duration: 6000,
        });
      } else {
        toast.error(data.message || 'A warning occurred', {
          icon: '⚠️',
          duration: 4000,
        });
      }
    });

    // Handle rate limiting - user is sending too many requests
    newSocket.on('rateLimited', () => {
      logger.warn('[SOCKET.IO] Rate limited by server');
      setIsJoining(false); // Clear loading state
      toast.error(t('errors.rateLimited') || 'Too many requests. Please wait a moment and try again.', {
        icon: '⏳',
        duration: 4000,
      });
    });

    newSocket.on('hostTransferred', (data) => {
      if (data.newHost === username) {
        setIsHost(true);
        saveSession({
          gameCode,
          username,
          isHost: true,
          roomName: roomName || username,
          language: roomLanguage || 'en',
        });
        toast.success(t('hostView.youAreNowHost'), { duration: 5000, icon: '👑' });
      } else {
        toast(`${data.newHost} ${t('hostView.newHostAssigned')}`, { duration: 3000, icon: '🔄' });
      }
    });

    newSocket.on('pong', () => {
      // Heartbeat response - connection is alive
    });

    // Defer state update to avoid calling setState directly within effect
    Promise.resolve().then(() => {
      setSocket(newSocket);
    });

    return () => {
      logger.log('[SOCKET.IO] MultiplayerPage cleaning up');
      clearTimeout(roomsLoadingTimeout);
      // Remove this component's listeners but keep socket alive for other components
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('reconnect');
      newSocket.off('reconnect_failed');
      newSocket.off('joined');
      newSocket.off('updateUsers');
      newSocket.off('activeRooms');
      newSocket.off('joinedAsSpectator');
      newSocket.off('spectatorList');
      newSocket.off('spectatorUpgraded');
      newSocket.off('debugGameStateResponse');
      newSocket.off('error');
      newSocket.off('startGame');
      newSocket.off('resetGame');
      newSocket.off('hostLeftRoomClosing');
      newSocket.off('sessionMigrated');
      newSocket.off('warning');
      newSocket.off('rateLimited');
      newSocket.off('hostTransferred');
      newSocket.off('pong');
      // Release reference to shared socket (socket disconnects when all refs released)
      releaseSharedSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gameCode, username, roomName, roomLanguage are used in handlers but shouldn't trigger socket recreation
  }, [t, language]);

  // Host keep-alive
  useEffect(() => {
    if (!isActive || !isHost || !socket || !isConnected) {
      if (hostKeepAliveIntervalRef.current) {
        clearInterval(hostKeepAliveIntervalRef.current);
        hostKeepAliveIntervalRef.current = null;
      }
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket && isConnected) {
        socket.emit('hostReactivate', { gameCode });
      }
    };

    hostKeepAliveIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && socket && isConnected) {
        socket.emit('hostKeepAlive', { gameCode });
      }
    }, SOCKET_CONFIG.HOST_KEEP_ALIVE_INTERVAL);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Send initial reactivation
    socket.emit('hostReactivate', { gameCode });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (hostKeepAliveIntervalRef.current) {
        clearInterval(hostKeepAliveIntervalRef.current);
        hostKeepAliveIntervalRef.current = null;
      }
    };
  }, [isActive, isHost, socket, isConnected, gameCode]);

  // Helper to get auth context for socket events
  const getAuthContext = useCallback(async () => {
    if (!isSupabaseEnabled) return { authUserId: null, guestTokenHash: null };

    // Use user.id directly - don't require profile for stats recording
    if (user?.id) {
      return { authUserId: user.id, guestTokenHash: null };
    }

    const guestSessionId = getGuestSessionId();
    if (guestSessionId) {
      const hash = await hashToken(guestSessionId);
      return { authUserId: null, guestTokenHash: hash };
    }

    return { authUserId: null, guestTokenHash: null };
  }, [isSupabaseEnabled, user]);

  // Auto-join effect
  useEffect(() => {
    if (!shouldAutoJoin || !socket || !isConnected || isActive || attemptingReconnect) {
      return;
    }

    if (prefilledRoomCode && username && username.trim()) {
      // Capture current values to avoid stale closure issues
      const currentUsername = username;
      const currentProfile = profile;
      const currentPrefilledRoomCode = prefilledRoomCode;

      const autoJoinTimeout = setTimeout(async () => {
        if (socket && socket.connected && !isActive) {
          const authContext = await getAuthContext();
          // Check socket is still connected after async operation
          if (!socket.connected) {
            logger.warn('[AUTO-JOIN] Socket disconnected during auth context build, skipping auto-join');
            return;
          }
          socket.emit('join', {
            gameCode: currentPrefilledRoomCode,
            username: currentUsername,
            ...authContext,
            avatar: currentProfile ? {
              emoji: currentProfile.avatar_emoji,
              color: currentProfile.avatar_color,
            } : getAvatarForName(currentUsername),
            profilePictureUrl: currentProfile?.profile_picture_url,
          });
          setShouldAutoJoin(false);
        }
      }, 200);
      return () => clearTimeout(autoJoinTimeout);
    }
    return undefined;
  }, [shouldAutoJoin, prefilledRoomCode, username, isActive, attemptingReconnect, socket, isConnected, getAuthContext, profile]);

  // Session reconnection
  useEffect(() => {
    if (!attemptingReconnect || !socket || !isConnected || isActive) {
      return;
    }

    const savedSession = getSession();
    if (!savedSession?.gameCode) {
      Promise.resolve().then(() => setAttemptingReconnect(false));
      return;
    }

    // Check if session is too old (more than 5 minutes of inactivity)
    const sessionAge = Date.now() - savedSession.timestamp;
    const maxInactivity = 5 * 60 * 1000; // 5 minutes

    if (sessionAge > maxInactivity) {
      // Session is too old, don't auto-reconnect - user needs to manually rejoin
      logger.log('[SESSION] Session too old for auto-reconnect, clearing session');
      clearSession();
      Promise.resolve().then(() => setAttemptingReconnect(false));
      return;
    }

    const reconnectTimeout = setTimeout(async () => {
      const authContext = await getAuthContext();

      if (savedSession.isHost) {
        if (!savedSession.roomName || !savedSession.hostUsername) {
          clearSession();
          setAttemptingReconnect(false);
          return;
        }
        socket.emit('createGame', {
          gameCode: savedSession.gameCode,
          roomName: savedSession.roomName,
          hostUsername: savedSession.hostUsername,
          language: savedSession.language || language,
          ...authContext,
          avatar: profile ? {
            emoji: profile.avatar_emoji,
            color: profile.avatar_color,
          } : getAvatarForName(savedSession.hostUsername),
          profilePictureUrl: profile?.profile_picture_url,
        });
      } else {
        if (!savedSession.username) {
          clearSession();
          setAttemptingReconnect(false);
          return;
        }
        socket.emit('join', {
          gameCode: savedSession.gameCode,
          username: savedSession.username,
          ...authContext,
          avatar: profile ? {
            emoji: profile.avatar_emoji,
            color: profile.avatar_color,
          } : getAvatarForName(savedSession.username),
          profilePictureUrl: profile?.profile_picture_url,
        });
      }
    }, 500);

    return () => clearTimeout(reconnectTimeout);
  }, [attemptingReconnect, isActive, socket, isConnected, language, getAuthContext, profile]);

  const handleJoin = useCallback(async (isHostMode: boolean, roomLang?: Language | null, overrideGameCode?: string) => {
    console.log(`🎮 [JOIN] handleJoin called - mode: ${isHostMode ? 'HOST' : 'PLAYER'}, socket connected: ${socket?.connected}`);

    if (!socket || !isConnected) {
      console.error('❌ [JOIN] Cannot join - socket not connected', { socket: !!socket, isConnected });
      setError(t('errors.notConnected') || 'Not connected to server');
      toast.error(t('common.notConnected') || 'Not connected to server', {
        duration: 3000,
        icon: '⚠️',
      });
      return;
    }

    // Wait for auth to finish loading before creating/joining game
    // But allow joining after 5 seconds even if auth is still loading (to prevent permanent block)
    const AUTH_LOADING_TIMEOUT = 5000;
    const authLoadingTooLong = authLoadingStartTime && (Date.now() - authLoadingStartTime > AUTH_LOADING_TIMEOUT);

    if (loading && !authLoadingTooLong) {
      logger.log('[AUTH] Auth still loading, waiting...');
      toast.error(t('common.loadingProfile') || 'Loading profile, please wait...', {
        duration: 2000,
        icon: '⏳',
      });
      return;
    }

    if (authLoadingTooLong) {
      logger.warn('[AUTH] Auth loading timed out, proceeding without profile');
    }

    // Compute the correct username at join time to avoid stale state issues
    // When authenticated, always prefer the profile/OAuth display name over any generated guest name
    let effectiveUsername = user
      ? (profile?.display_name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        username)
      : username;

    // For guests without a username, generate a fun random name on the spot
    // This handles cases where handleJoin is called before the auth effect runs
    let generatedAvatar: { emoji: string; color: string } | null = null;
    if (!effectiveUsername?.trim() && !user) {
      const { name, avatar } = getRandomDefaultNameWithAvatar(language);
      effectiveUsername = name;
      generatedAvatar = avatar;
      setGuestAvatar(avatar);
      logger.log('[JOIN] Generated random name for guest:', name);
    }

    // Also update state to keep it in sync for future use
    if (effectiveUsername !== username) {
      setUsername(effectiveUsername);
    }

    // Get selected avatar image from localStorage
    const avatarImageId = typeof window !== 'undefined' ? localStorage.getItem('boggle_avatar_id') : null;

    // Determine avatar to use: profile > guest state > just-generated > derive from name
    const effectiveAvatar = profile
      ? { emoji: profile.avatar_emoji, color: profile.avatar_color, avatarImage: profile.avatar_image }
      : {
        ...(generatedAvatar || guestAvatar || getAvatarForName(effectiveUsername)),
        avatarImage: avatarImageId || undefined
      };

    setError('');
    setIsJoining(true); // Show loading state

    // Safety timeout: clear isJoining after 10 seconds if no response
    const safetyTimeout = setTimeout(() => {
      setIsJoining(false);
      console.warn('⏱️ [JOIN] Safety timeout triggered - no response received within 10 seconds');
      logger.warn('[JOIN] Safety timeout triggered - no response received within 10 seconds');
      toast.error(t('errors.connectionTimeout') || 'Connection timeout. Please try again.', {
        duration: 4000,
        icon: '⚠️',
      });
    }, 10000);

    // Clear safety timeout when response is received (via joined/error/rateLimited events)
    const clearSafetyTimeout = () => clearTimeout(safetyTimeout);
    socket.once('joined', clearSafetyTimeout);
    socket.once('error', clearSafetyTimeout);
    socket.once('joinedAsSpectator', clearSafetyTimeout);
    socket.once('rateLimited', clearSafetyTimeout);

    // Use overrideGameCode if provided, otherwise use state gameCode
    const codeToUse = overrideGameCode || gameCode;

    // Build auth context for game result tracking
    let authUserId = null;
    let guestTokenHash = null;

    if (isSupabaseEnabled) {
      // For stats recording, we only need the user.id from Supabase auth
      // Don't require profile to exist - user may have logged in but not completed profile setup
      if (user?.id) {
        // Authenticated user (has Supabase auth, regardless of profile status)
        authUserId = user.id;
        logger.log('[AUTH] Joining as authenticated user:', { authUserId, username: effectiveUsername, hasProfile: !!profile });
      } else {
        // Guest user - get or create guest session
        const guestSessionId = getGuestSessionId();
        if (guestSessionId) {
          guestTokenHash = await hashToken(guestSessionId);
        }
        logger.log('[AUTH] Joining as guest:', { hasUser: !!user, guestTokenHash: !!guestTokenHash });
      }
    }

    if (isHostMode) {
      // For hosts, determine username and room name separately
      // Authenticated users: use their display name as username, custom room name for room
      // Guest users: use both hostUsername and roomName from state
      const finalHostUsername = user ? effectiveUsername : (hostUsername || effectiveUsername);
      // Use dash instead of apostrophe to avoid validation issues with special characters
      const finalRoomName = roomName || `${finalHostUsername} Room`;

      // For guest hosts, use the finalHostUsername for avatar generation
      const hostAvatar = profile
        ? { emoji: profile.avatar_emoji, color: profile.avatar_color, avatarImage: profile.avatar_image }
        : {
          ...(generatedAvatar || guestAvatar || getAvatarForName(finalHostUsername)),
          avatarImage: avatarImageId || undefined
        };

      const createGamePayload = {
        gameCode: codeToUse,
        roomName: finalRoomName,
        hostUsername: finalHostUsername,
        language: roomLang || language,
        authUserId,
        guestTokenHash,
        avatar: hostAvatar,
        profilePictureUrl: profile?.profile_picture_url,
      };

      // Production-safe logging (always visible)
      console.log('[JOIN] Emitting createGame event:', {
        gameCode: codeToUse,
        roomName: finalRoomName,
        hostUsername: finalHostUsername,
        language: roomLang || language,
        hasAuth: !!authUserId,
        hasGuestToken: !!guestTokenHash,
        hasAvatar: !!hostAvatar,
        socketConnected: socket.connected,
        socketId: socket.id
      });

      socket.emit('createGame', createGamePayload);

      console.log('[JOIN] createGame event emitted, waiting for response...');
    } else {
      const joinPayload = {
        gameCode: codeToUse,
        username: effectiveUsername,
        authUserId,
        guestTokenHash,
        avatar: effectiveAvatar,
        profilePictureUrl: profile?.profile_picture_url,
      };

      logger.log('[JOIN] Emitting join event:', {
        gameCode: codeToUse,
        username: effectiveUsername,
        hasAuth: !!authUserId,
        hasGuestToken: !!guestTokenHash,
        socketConnected: socket.connected,
        socketId: socket.id
      });

      socket.emit('join', joinPayload);

      logger.log('[JOIN] join event emitted, waiting for response...');
    }
  }, [socket, isConnected, gameCode, username, roomName, language, t, isSupabaseEnabled, user, profile, loading, authLoadingStartTime, guestAvatar]);

  const refreshRooms = useCallback(() => {
    if (socket && isConnected) {
      setRoomsLoading(true);
      socket.emit('getActiveRooms');
    }
  }, [socket, isConnected]);

  const handleUpgradeToPlayer = useCallback(() => {
    if (!socket || !gameCode) {
      logger.warn('[SPECTATOR] Cannot upgrade: no socket or gameCode');
      return;
    }

    logger.info('[SPECTATOR] Requesting upgrade to player in game:', gameCode);
    socket.emit('upgradeToPlayer', { gameCode });
  }, [socket, gameCode]);

  const handleReturnToRoom = useCallback(() => {
    setShowResults(false);
    setResultsData(null);
    setPendingGameStart(null);
  }, []);

  const handleShowResults = useCallback((data: unknown) => {
    setResultsData(data as ResultsData);
    setShowResults(true);
  }, []);

  // QuickJoinView handlers
  const handleQuickJoinSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validate username
    if (!username || username.trim().length < 2) {
      setUsernameError(true);
      setUsernameErrorKey('validation.usernameTooShort');
      return;
    }
    // Join the prefilled room
    handleJoin(false, null, prefilledRoomCode);
  }, [username, prefilledRoomCode, handleJoin]);

  const handleShowFullForm = useCallback(() => {
    setShowFullForm(true);
  }, []);

  const handleUsernameErrorClear = useCallback(() => {
    setUsernameError(false);
    setUsernameErrorKey(undefined);
  }, []);

  // Create context value
  const socketContextValue = {
    socket,
    isConnected,
    connectionError: error,
    isReconnecting: attemptingReconnect,
  };

  const renderView = () => {
    if (showResults) {
      return (
        <FeatureErrorBoundary featureName="Results">
          <ResultsPage
            finalScores={resultsData?.scores ?? null}
            letterGrid={resultsData?.letterGrid ?? null}
            gameCode={gameCode}
            onReturnToRoom={handleReturnToRoom}
            username={username}
            socket={socket}
            duplicateRuleDisabled={resultsData?.duplicateRuleDisabled}
            playerCount={resultsData?.playerCount}
          />
        </FeatureErrorBoundary>
      );
    }

    if (!isActive) {
      // Show QuickJoinView when there's a prefilled room code and user hasn't clicked to show full form
      if (prefilledRoomCode && !showFullForm && !error) {
        return (
          <FeatureErrorBoundary featureName="Quick Join">
            <QuickJoinView
              gameCode={prefilledRoomCode}
              username={username}
              setUsername={setUsername}
              error={error}
              isJoining={isJoining}
              isAuthenticated={isAuthenticated}
              displayName={profile?.display_name ?? null}
              usernameError={usernameError}
              usernameErrorKey={usernameErrorKey}
              onUsernameErrorClear={handleUsernameErrorClear}
              onJoin={handleJoin}
              onQuickJoinSubmit={handleQuickJoinSubmit}
              onShowFullForm={handleShowFullForm}
            />
          </FeatureErrorBoundary>
        );
      }
      return (
        <FeatureErrorBoundary featureName="Lobby">
          <MultiplayerLobby
            handleJoin={handleJoin}
            gameCode={gameCode}
            username={username}
            roomName={roomName}
            hostUsername={hostUsername}
            setGameCode={setGameCode}
            setUsername={setUsername}
            setRoomName={setRoomName}
            setHostUsername={setHostUsername}
            error={error}
            activeRooms={activeRooms}
            refreshRooms={refreshRooms}
            prefilledRoom={prefilledRoomCode}
            isAutoJoining={shouldAutoJoin}
            roomsLoading={roomsLoading}
            isAuthenticated={isAuthenticated}
            displayName={profile?.display_name ?? ''}
            isProfileLoading={loading}
            isJoining={isJoining}
          />
        </FeatureErrorBoundary>
      );
    }

    if (isHost) {
      return (
        <FeatureErrorBoundary featureName="Host Game">
          <HostView gameCode={gameCode} roomLanguage={roomLanguage ?? undefined} initialPlayers={playersInRoom} username={username} onShowResults={handleShowResults} />
        </FeatureErrorBoundary>
      );
    }

    return (
      <FeatureErrorBoundary featureName="Player Game">
        <PlayerView
          gameCode={gameCode}
          username={username}
          onShowResults={handleShowResults}
          initialPlayers={playersInRoom}
          pendingGameStart={pendingGameStart}
          onGameStartConsumed={() => setPendingGameStart(null)}
        />
      </FeatureErrorBoundary>
    );
  };

  // Hide header completely in landscape mode during active gameplay (not just auto-hide)
  const showHeader = !(isActive && !showResults && isLandscape);

  return (
    <SocketContext.Provider value={socketContextValue}>
      {/* Connection status indicator */}
      <ConnectionDot />

      {showHeader && <AutoHideHeader />}
      <ErrorBoundary>
        <div id="main-content" tabIndex={-1}>
          {renderView()}
        </div>
      </ErrorBoundary>
    </SocketContext.Provider>
  );
}
