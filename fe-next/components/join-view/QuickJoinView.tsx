'use client';

import React, { useCallback, useRef, FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { FaGamepad, FaSync } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { sanitizeInput } from '../../utils/validation';

const MenuAnimation = dynamic(() => import('../MenuAnimation'), { ssr: false });

interface QuickJoinViewProps {
  gameCode: string;
  username: string;
  setUsername: (value: string) => void;
  error: string | null;
  isJoining: boolean;
  isAuthenticated: boolean;
  displayName: string | null;
  usernameError: boolean;
  usernameErrorKey: string | undefined;
  onUsernameErrorClear: () => void;
  onJoin: (isHost: boolean) => void;
  onQuickJoinSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onShowFullForm: () => void;
}

/**
 * QuickJoinView - Simplified join interface when room is prefilled via invitation
 */
const QuickJoinView: React.FC<QuickJoinViewProps> = React.memo(({
  gameCode,
  username,
  setUsername,
  error,
  isJoining,
  isAuthenticated,
  displayName,
  usernameError,
  usernameErrorKey,
  onUsernameErrorClear,
  onJoin,
  onQuickJoinSubmit,
  onShowFullForm
}) => {
  const { t } = useLanguage();
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const handleJoinGuest = useCallback(() => {
    onJoin(false);
  }, [onJoin]);

  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(sanitizeInput(e.target.value, 20));
    if (usernameError) onUsernameErrorClear();
  }, [setUsername, usernameError, onUsernameErrorClear]);

  return (
    <div className="min-h-screen bg-neo-black pt-4 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6">
      <motion.div
        initial={{ scale: 0, rotate: -3 }}
        animate={{ scale: 1, rotate: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full max-w-md"
      >
        <Card className="bg-neo-navy border-4 border-neo-cream rounded-neo shadow-hard">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-neo-cyan rounded-neo border-3 border-neo-black shadow-hard-sm rotate-3">
                <FaGamepad size={48} className="text-neo-black" />
              </div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black uppercase text-neo-cream tracking-tight">
              {t('joinView.inviteTitle')}
            </CardTitle>
            <div className="flex justify-center">
              <div className="text-2xl px-8 py-4 bg-neo-pink text-neo-white font-black uppercase rounded-neo border-3 border-neo-black shadow-hard -rotate-1">
                {t('joinView.room')} {gameCode}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-6">
            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-4 bg-neo-pink/20 border-3 border-neo-pink rounded-neo">
                  <p className="text-neo-pink font-bold uppercase text-sm">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Authenticated user - simplified view */}
            {isAuthenticated && displayName ? (
              <AuthenticatedQuickJoin
                username={username}
                displayName={displayName}
                setUsername={setUsername}
                isJoining={isJoining}
                onJoin={handleJoinGuest}
                onShowFullForm={onShowFullForm}
                t={t}
              />
            ) : (
              <GuestQuickJoin
                username={username}
                usernameError={usernameError}
                usernameErrorKey={usernameErrorKey}
                usernameInputRef={usernameInputRef}
                isJoining={isJoining}
                onUsernameChange={handleUsernameChange}
                onSubmit={onQuickJoinSubmit}
                onShowFullForm={onShowFullForm}
                t={t}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
      <MenuAnimation />
    </div>
  );
});

// Sub-components
interface AuthenticatedQuickJoinProps {
  username: string;
  displayName: string;
  setUsername: (value: string) => void;
  isJoining: boolean;
  onJoin: () => void;
  onShowFullForm: () => void;
  t: (key: string) => string;
}

const AuthenticatedQuickJoin: React.FC<AuthenticatedQuickJoinProps> = React.memo(({
  username,
  displayName,
  setUsername,
  isJoining,
  onJoin,
  onShowFullForm,
  t
}) => (
  <div className="space-y-4 sm:space-y-6">
    <div className="space-y-3">
      <Label htmlFor="auth-display-name" className="text-base font-black uppercase text-neo-cream">
        {t('joinView.joiningAs') || 'Joining as'}
      </Label>
      <Input
        id="auth-display-name"
        value={username || displayName}
        onChange={(e) => setUsername(sanitizeInput(e.target.value, 20))}
        className="w-full h-16 sm:h-14 text-xl sm:text-lg text-center font-black text-neo-cyan uppercase tracking-tight bg-neo-navy border-3 border-neo-cyan/50 rounded-neo shadow-hard-sm placeholder:text-neo-cyan/50 focus:border-neo-cyan focus:ring-0"
        placeholder={displayName}
        maxLength={20}
      />
      <p className="text-neo-cream/50 text-xs font-bold uppercase text-center">
        {t('joinView.tapToChangeDisplayName') || 'Tap to change display name'}
      </p>
    </div>

    <motion.div whileHover={!isJoining ? { x: -2, y: -2 } : {}} whileTap={!isJoining ? { x: 2, y: 2 } : {}}>
      <Button
        onClick={onJoin}
        disabled={isJoining}
        className="w-full h-16 sm:h-14 text-xl font-black uppercase bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:bg-neo-lime/90 transition-all disabled:opacity-70"
      >
        {isJoining ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="mr-3 inline-block"
            >
              <FaSync size={24} />
            </motion.span>
            {t('joinView.joining')}
          </>
        ) : (
          <>
            <FaGamepad className="mr-3" size={24} />
            {t('joinView.joinGame')}
          </>
        )}
      </Button>
    </motion.div>

    <div className="text-center pt-2">
      <button
        type="button"
        onClick={onShowFullForm}
        className="text-sm text-neo-cyan font-bold uppercase underline underline-offset-4 hover:text-neo-cyan/80 transition-colors"
      >
        {t('joinView.wantToHostOrJoinOther')}
      </button>
    </div>
  </div>
));
AuthenticatedQuickJoin.displayName = 'AuthenticatedQuickJoin';

interface GuestQuickJoinProps {
  username: string;
  usernameError: boolean;
  usernameErrorKey: string | undefined;
  usernameInputRef: React.RefObject<HTMLInputElement | null>;
  isJoining: boolean;
  onUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onShowFullForm: () => void;
  t: (key: string) => string;
}

const GuestQuickJoin: React.FC<GuestQuickJoinProps> = React.memo(({
  username,
  usernameError,
  usernameErrorKey,
  usernameInputRef,
  isJoining,
  onUsernameChange,
  onSubmit,
  onShowFullForm,
  t
}) => (
  <form onSubmit={onSubmit} className="space-y-3 sm:space-y-6">
    <motion.div
      animate={usernameError ? { x: [-10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="space-y-2"
    >
      <Label htmlFor="username" className="text-base font-black uppercase text-neo-cream">
        {t('joinView.enterNameToPlay')}
      </Label>
      <Input
        ref={usernameInputRef}
        id="username"
        value={username}
        onChange={onUsernameChange}
        required
        autoFocus
        className={cn(
          "h-14 text-lg bg-neo-cream text-neo-black font-bold border-3 border-neo-black rounded-neo shadow-hard-sm placeholder:text-neo-black/50 focus:border-neo-cyan focus:ring-0",
          usernameError && "border-neo-pink bg-neo-pink/20 text-neo-pink"
        )}
        placeholder={t('joinView.playerNamePlaceholder')}
        maxLength={20}
      />
      {usernameError && (
        <p className="text-sm text-neo-pink font-bold uppercase">
          {t(usernameErrorKey || 'validation.usernameRequired')}
        </p>
      )}
    </motion.div>

    <motion.div whileHover={!isJoining ? { x: -2, y: -2 } : {}} whileTap={!isJoining ? { x: 2, y: 2 } : {}}>
      <Button
        type="submit"
        disabled={!username || isJoining}
        className="w-full h-14 text-xl font-black uppercase bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:bg-neo-lime/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isJoining ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="mr-3 inline-block"
            >
              <FaSync size={24} />
            </motion.span>
            {t('joinView.joining')}
          </>
        ) : (
          <>
            <FaGamepad className="mr-3" size={24} />
            {t('joinView.joinGame')}
          </>
        )}
      </Button>
    </motion.div>

    <div className="text-center pt-2">
      <button
        type="button"
        onClick={onShowFullForm}
        className="text-sm text-neo-cyan font-bold uppercase underline underline-offset-4 hover:text-neo-cyan/80 transition-colors"
      >
        {t('joinView.wantToHostOrJoinOther')}
      </button>
    </div>
  </form>
));
GuestQuickJoin.displayName = 'GuestQuickJoin';

QuickJoinView.displayName = 'QuickJoinView';

export default QuickJoinView;
