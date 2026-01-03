'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarRewardsModal } from './CalendarRewardsModal';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarButtonProps {
  className?: string;
  variant?: 'icon' | 'full';
}

export function CalendarButton({ className, variant = 'icon' }: CalendarButtonProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnclaimedReward, setHasUnclaimedReward] = useState(false);

  const checkUnclaimedReward = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/engagement/calendar');
      if (response.ok) {
        const data = await response.json();
        setHasUnclaimedReward(data.canClaimToday);
      }
    } catch (error) {
      console.error('[CalendarButton] Error checking reward:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    checkUnclaimedReward();
    // Check again when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUnclaimedReward();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id, checkUnclaimedReward]);

  const handleClose = () => {
    setIsOpen(false);
    // Recheck after modal closes (reward might have been claimed)
    setTimeout(checkUnclaimedReward, 500);
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size={variant === 'icon' ? 'icon' : 'default'}
        onClick={() => setIsOpen(true)}
        className={cn(
          "relative",
          variant === 'icon' && "w-10 h-10 p-0",
          className
        )}
        aria-label="Daily Rewards Calendar"
      >
        <Calendar className={cn("text-neo-cream", variant === 'icon' ? "w-5 h-5" : "w-4 h-4 mr-2")} />
        {variant === 'full' && <span>Rewards</span>}

        {/* Notification dot for unclaimed reward */}
        <AnimatePresence>
          {hasUnclaimedReward && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-neo-yellow rounded-full border-2 border-neo-black flex items-center justify-center"
            >
              <Gift className="w-2.5 h-2.5 text-neo-black" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse animation when reward available */}
        {hasUnclaimedReward && (
          <motion.div
            className="absolute inset-0 rounded-neo border-2 border-neo-yellow"
            animate={{
              opacity: [0, 0.5, 0],
              scale: [1, 1.1, 1.2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}
      </Button>

      <CalendarRewardsModal isOpen={isOpen} onClose={handleClose} />
    </>
  );
}

export default CalendarButton;
