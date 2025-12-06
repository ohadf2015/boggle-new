/**
 * useJoinViewState Hook
 *
 * Extracts and encapsulates all internal state management from JoinView component.
 * This reduces the complexity of JoinView and makes the state logic more testable.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useValidation } from '@/hooks/useValidation';
import { generateRoomCode as generateCode } from '@/utils/utils';
import { isFirstTimePlayer } from '@/components/NewPlayerWelcome';
import type { JoinMode } from '@/types/components';
import type { Language } from '@/shared/types/game';

interface UseJoinViewStateProps {
  prefilledRoom: string | null;
  roomsLoading: boolean;
  activeRooms: Array<{ gameCode: string; playerCount: number; hostName?: string }>;
  setGameCode: (code: string) => void;
}

interface ValidationErrors {
  usernameError: boolean;
  roomNameError: boolean;
  gameCodeError: boolean;
  usernameErrorKey: string | undefined;
  roomNameErrorKey: string | undefined;
  gameCodeErrorKey: string | undefined;
}

interface UseJoinViewStateReturn {
  // UI State
  mode: JoinMode;
  showQR: boolean;
  showHowToPlay: boolean;
  showNewPlayerWelcome: boolean;
  showFullForm: boolean;
  mobileRoomsExpanded: boolean;
  roomLanguage: Language;

  // Validation State
  validation: ValidationErrors;

  // Refs
  usernameInputRef: React.RefObject<HTMLInputElement>;

  // Handlers
  handleModeChange: (newMode: string) => void;
  generateRoomCode: () => void;
  setShowQR: (show: boolean) => void;
  setShowHowToPlay: (show: boolean) => void;
  setShowNewPlayerWelcome: (show: boolean) => void;
  setShowFullForm: (show: boolean) => void;
  setMobileRoomsExpanded: (expanded: boolean) => void;
  setRoomLanguage: (lang: Language) => void;

  // Validation Setters
  setUsernameError: (error: boolean) => void;
  setRoomNameError: (error: boolean) => void;
  setGameCodeError: (error: boolean) => void;
  setUsernameErrorKey: (key: string | undefined) => void;
  setRoomNameErrorKey: (key: string | undefined) => void;
  setGameCodeErrorKey: (key: string | undefined) => void;

  // Validation helpers
  notifyError: (message: string) => void;
}

export function useJoinViewState({
  prefilledRoom,
  roomsLoading,
  activeRooms,
  setGameCode,
}: UseJoinViewStateProps): UseJoinViewStateReturn {
  const { t, language } = useLanguage();
  const { notifyError } = useValidation(t);

  // UI State
  const [mode, setMode] = useState<JoinMode>('join');
  const [showQR, setShowQR] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showNewPlayerWelcome, setShowNewPlayerWelcome] = useState<boolean>(false);
  const [showFullForm, setShowFullForm] = useState<boolean>(!prefilledRoom);
  const [mobileRoomsExpanded, setMobileRoomsExpanded] = useState<boolean>(false);
  const [roomLanguage, setRoomLanguage] = useState<Language>(language as Language);

  // Validation State
  const [usernameError, setUsernameError] = useState<boolean>(false);
  const [roomNameError, setRoomNameError] = useState<boolean>(false);
  const [gameCodeError, setGameCodeError] = useState<boolean>(false);
  const [usernameErrorKey, setUsernameErrorKey] = useState<string | undefined>(undefined);
  const [roomNameErrorKey, setRoomNameErrorKey] = useState<string | undefined>(undefined);
  const [gameCodeErrorKey, setGameCodeErrorKey] = useState<string | undefined>(undefined);

  // Refs
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const prevPrefilledRoomRef = useRef<string | null>(prefilledRoom);
  const hasAutoSwitchedToHostRef = useRef<boolean>(false);
  const hasCheckedFirstTimePlayerRef = useRef<boolean>(false);

  // Mode change handler
  const handleModeChange = useCallback((newMode: string) => {
    if (newMode && (newMode === 'join' || newMode === 'host')) {
      setMode(newMode as JoinMode);
      // Auto-generate code when switching to host mode
      if (newMode === 'host') {
        setGameCode(generateCode());
      }
    }
  }, [setGameCode]);

  // Generate room code handler
  const generateRoomCode = useCallback(() => {
    setGameCode(generateCode());
  }, [setGameCode]);

  // Sync showFullForm when prefilledRoom prop changes
  useEffect(() => {
    if (prefilledRoom && !prevPrefilledRoomRef.current) {
      Promise.resolve().then(() => setShowFullForm(false));
    }
    prevPrefilledRoomRef.current = prefilledRoom;
  }, [prefilledRoom]);

  // Auto-switch to host mode when no rooms exist
  useEffect(() => {
    if (!roomsLoading && activeRooms.length === 0 && mode === 'join' && !hasAutoSwitchedToHostRef.current) {
      hasAutoSwitchedToHostRef.current = true;
      handleModeChange('host');
    }
    // Reset the flag when rooms become available again
    if (activeRooms.length > 0) {
      hasAutoSwitchedToHostRef.current = false;
    }
  }, [roomsLoading, activeRooms.length, mode, handleModeChange]);

  // Check for first-time player
  useEffect(() => {
    if (hasCheckedFirstTimePlayerRef.current) return;
    hasCheckedFirstTimePlayerRef.current = true;

    const timer = setTimeout(() => {
      if (isFirstTimePlayer()) {
        setShowNewPlayerWelcome(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return {
    // UI State
    mode,
    showQR,
    showHowToPlay,
    showNewPlayerWelcome,
    showFullForm,
    mobileRoomsExpanded,
    roomLanguage,

    // Validation State
    validation: {
      usernameError,
      roomNameError,
      gameCodeError,
      usernameErrorKey,
      roomNameErrorKey,
      gameCodeErrorKey,
    },

    // Refs
    usernameInputRef: usernameInputRef as React.RefObject<HTMLInputElement>,

    // Handlers
    handleModeChange,
    generateRoomCode,
    setShowQR,
    setShowHowToPlay,
    setShowNewPlayerWelcome,
    setShowFullForm,
    setMobileRoomsExpanded,
    setRoomLanguage,

    // Validation Setters
    setUsernameError,
    setRoomNameError,
    setGameCodeError,
    setUsernameErrorKey,
    setRoomNameErrorKey,
    setGameCodeErrorKey,

    // Validation helpers
    notifyError,
  };
}

export default useJoinViewState;
