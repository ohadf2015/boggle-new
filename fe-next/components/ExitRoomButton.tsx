'use client';

import React from 'react';
import { DoorOpen } from 'lucide-react';
import { Button } from './ui/button';

/**
 * ExitRoomButton Props
 *
 * Reusable Exit Room Button component with consistent Neo-Brutalist styling
 * Used across all game views (WaitingScreen, PlayerInGameView, HostInGameView, etc.)
 */
interface ExitRoomButtonProps {
  onClick: () => void;
  label: string;
  className?: string;
}

const ExitRoomButton: React.FC<ExitRoomButtonProps> = ({ onClick, label, className = '' }) => {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      size="sm"
      className={`min-h-[36px] min-w-[36px] w-9 h-9 p-0 rounded-full bg-neo-white/10 border-2 border-neo-white/20 shadow-none
        hover:bg-neo-red/80 hover:border-neo-red hover:shadow-hard-sm
        active:scale-95 active:shadow-none
        font-black transition-all ${className}`}
      aria-label={label}
    >
      <DoorOpen className="w-4 h-4 text-neo-white" aria-hidden="true" />
    </Button>
  );
};

export default ExitRoomButton;
