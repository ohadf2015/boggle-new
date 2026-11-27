'use client';

import React from 'react';
import { DoorOpen } from 'lucide-react';
import { Button } from './ui/button';
import { useClassroomBoard } from '@/components/education/live/classroomBoard';
import { HUD_EXIT_BUTTON_CLASSROOM } from '@/components/game/hud/GameHud';
import { cn } from '@/lib/utils';

/**
 * ExitRoomButton Props
 *
 * Reusable Exit Room Button component with consistent Neo-Brutalist styling
 * Used across all game views (WaitingScreen, PlayerInGameView, HostInGameView, etc.)
 */
interface ExitRoomButtonProps
  extends Omit<React.ComponentProps<typeof Button>, 'onClick' | 'aria-label'> {
  onClick: () => void;
  label: string;
  className?: string;
}

const ExitRoomButton: React.FC<ExitRoomButtonProps> = ({ onClick, label, className = '', ...rest }) => {
  const classroom = useClassroomBoard();
  if (classroom) {
    return (
      <button
        {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(HUD_EXIT_BUTTON_CLASSROOM, "relative before:absolute before:-inset-1 before:content-['']", className)}
      >
        <DoorOpen className="w-5 h-5" aria-hidden="true" />
      </button>
    );
  }
  return (
    <Button
      {...rest}
      type="button"
      onClick={onClick}
      variant="ghost"
      size="sm"
      className={`relative min-h-[36px] min-w-[36px] w-9 h-9 p-0 before:absolute before:-inset-1 before:content-[''] rounded-full bg-neo-white/10 border-2 border-neo-white/20 shadow-none
        hover:bg-neo-red/80 hover:border-neo-red hover:shadow-hard-sm
        active:translate-x-px active:translate-y-px active:shadow-none
        font-black transition-all ${className}`}
      aria-label={label}
    >
      <DoorOpen className="w-4 h-4 text-neo-white" aria-hidden="true" />
    </Button>
  );
};

export default ExitRoomButton;
