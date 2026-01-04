'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Check, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getGuestDailyPlayer,
  updateGuestDailyPlayer,
  type GuestDailyPlayer,
} from '@/utils/dailyChallenge';

interface GuestNameEditorProps {
  onNameChange?: (name: string) => void;
  t: (key: string) => string;
  compact?: boolean;
}

/**
 * GuestNameEditor - Allows guests to view and edit their display name
 * Shows current avatar and name with an edit button
 */
const GuestNameEditor: React.FC<GuestNameEditorProps> = ({
  onNameChange,
  t,
  compact = false,
}) => {
  const [guestPlayer, setGuestPlayer] = useState<GuestDailyPlayer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [loading, setLoading] = useState(true);

  // Load guest player info on mount
  useEffect(() => {
    const loadGuestPlayer = async () => {
      setLoading(true);
      const player = await getGuestDailyPlayer();
      setGuestPlayer(player);
      setEditedName(player.displayName);
      setLoading(false);
    };
    loadGuestPlayer();
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    const trimmedName = editedName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 20) {
      return;
    }

    const updated = updateGuestDailyPlayer({ displayName: trimmedName });
    if (updated) {
      setGuestPlayer(updated);
      onNameChange?.(updated.displayName);
    }
    setIsEditing(false);
  }, [editedName, onNameChange]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setEditedName(guestPlayer?.displayName || '');
    setIsEditing(false);
  }, [guestPlayer]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  if (loading || !guestPlayer) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="w-4 h-4 border-2 border-neo-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-2"
      >
        {isEditing ? (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg border-2 border-neo-black"
              style={{ backgroundColor: guestPlayer.avatarColor }}
            >
              {guestPlayer.avatarEmoji}
            </div>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleKeyPress}
              maxLength={20}
              autoFocus
              className="px-2 py-1 text-sm font-bold border-2 border-neo-black rounded-neo bg-white dark:bg-slate-700 text-neo-black dark:text-white w-32"
              placeholder={t('daily.enterName') || 'Enter name'}
            />
            <Button
              size="sm"
              onClick={handleSave}
              className="p-1.5 min-w-0 bg-neo-lime text-neo-black border-2 border-neo-black rounded-neo"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="p-1.5 min-w-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-neo-cream dark:bg-slate-700 rounded-neo border-2 border-neo-black dark:border-slate-500 hover:bg-neo-yellow/20 transition-colors group"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-sm border-2 border-neo-black"
              style={{ backgroundColor: guestPlayer.avatarColor }}
            >
              {guestPlayer.avatarEmoji}
            </div>
            <span className="font-bold text-sm text-neo-black dark:text-white">
              {guestPlayer.displayName}
            </span>
            <Edit2 className="w-3 h-3 text-gray-500 group-hover:text-neo-pink transition-colors" />
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/90 dark:bg-slate-700/90 rounded-neo border-3 border-neo-black dark:border-slate-500 p-4 shadow-hard-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-neo-pink" />
        <span className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase">
          {t('daily.playingAs') || 'Playing as'}
        </span>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-neo flex items-center justify-center text-2xl border-3 border-neo-black"
              style={{ backgroundColor: guestPlayer.avatarColor }}
            >
              {guestPlayer.avatarEmoji}
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyPress}
                maxLength={20}
                autoFocus
                className="w-full px-3 py-2 text-lg font-bold border-3 border-neo-black rounded-neo bg-white dark:bg-slate-600 text-neo-black dark:text-white focus:ring-2 focus:ring-neo-cyan"
                placeholder={t('daily.enterName') || 'Enter your name'}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {editedName.length}/20 {t('daily.characters') || 'characters'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={editedName.trim().length < 1 || editedName.trim().length > 20}
              className="flex-1 py-2 bg-neo-lime text-neo-black font-bold border-3 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 transition-all"
            >
              <Check className="w-4 h-4 mr-2" />
              {t('common.save') || 'Save'}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="px-4 py-2 border-3 border-neo-black rounded-neo"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-neo flex items-center justify-center text-2xl border-3 border-neo-black"
              style={{ backgroundColor: guestPlayer.avatarColor }}
            >
              {guestPlayer.avatarEmoji}
            </div>
            <div>
              <div className="text-lg font-black text-neo-black dark:text-white">
                {guestPlayer.displayName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('daily.guestPlayer') || 'Guest Player'}
              </div>
            </div>
          </div>
          <Button
            onClick={() => setIsEditing(true)}
            size="sm"
            className="px-3 py-2 bg-neo-pink text-white font-bold border-2 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 transition-all"
          >
            <Edit2 className="w-4 h-4 mr-1" />
            {t('common.edit') || 'Edit'}
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default GuestNameEditor;
