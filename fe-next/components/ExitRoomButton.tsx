'use client';

import React from 'react';
import { FaDoorOpen } from 'react-icons/fa';
import { Button } from './ui/button';

/**
 * ExitRoomButton Props
 *
 * Reusable Exit Room Button component with consistent Neo-Brutalist styling
 * Used across all game views (WaitingScreen, PlayerInGameView, PlayerWaitingResultsView, HostWaitingResultsView)
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
      size="sm"
      className={`bg-neo-red text-neo-cream border-4 border-neo-black shadow-hard
        hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg
        active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
        font-black transition-all ${className}`}
    >
      <FaDoorOpen className="mr-2" />
      {label}
    </Button>
  );
};

export default ExitRoomButton;
