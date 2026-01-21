'use client';

import React from 'react';

interface PlayerAvatarProps {
  emoji?: string | null;
  color?: string | null;
}

export function PlayerAvatar({ emoji, color }: PlayerAvatarProps) {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
      style={{ backgroundColor: color || '#374151' }}
    >
      {emoji || '👤'}
    </div>
  );
}
