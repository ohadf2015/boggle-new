'use client';

import React from 'react';
import { DoorOpen } from 'lucide-react';
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
      variant="destructive"
      size="sm"
      className={`border-4 border-neo-black shadow-hard
        hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg
        active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
        font-black transition-all ${className}`}
    >
      <DoorOpen className="me-2" />
      {label}
    </Button>
  );
};

export default ExitRoomButton;
