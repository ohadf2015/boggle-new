'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck, FaTimes } from 'react-icons/fa';
import Image from 'next/image';
import { useTheme } from '../utils/ThemeContext';
import { AVATARS, getAvatarPath, mapEmojiToAvatar, type AvatarConfig } from '@/utils/avatarConfig';

/**
 * Avatar selection result
 */
interface AvatarSelection {
  avatarImage: string; // Avatar image ID
  emoji?: string; // Deprecated: kept for backward compatibility
  color?: string; // Deprecated: kept for backward compatibility
}

/**
 * EmojiAvatarPicker Props (renamed but kept for backward compatibility)
 */
interface EmojiAvatarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selection: AvatarSelection) => void;
  currentEmoji?: string; // Deprecated: will be mapped to avatar image
  currentColor?: string; // Deprecated: no longer used
  currentAvatarImage?: string; // New: current avatar image ID
}

/**
 * AvatarPicker - Modal for selecting avatar image
 * (Previously EmojiAvatarPicker - renamed but kept export name for compatibility)
 */
const EmojiAvatarPicker: React.FC<EmojiAvatarPickerProps> = ({
  isOpen,
  onClose,
  onSave,
  currentEmoji,
  currentAvatarImage
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Determine initial avatar selection
  const getInitialAvatar = (): AvatarConfig => {
    if (currentAvatarImage) {
      const found = AVATARS.find(a => a.id === currentAvatarImage || a.filename === currentAvatarImage);
      if (found) return found;
    }
    if (currentEmoji) {
      return mapEmojiToAvatar(currentEmoji);
    }
    return AVATARS[0];
  };

  const [selectedAvatar, setSelectedAvatar] = useState<AvatarConfig>(getInitialAvatar());

  const handleSave = () => {
    onSave({
      avatarImage: selectedAvatar.id,
      // Keep emoji/color for backward compatibility (though they'll be ignored)
      emoji: '🎮',
      color: '#4ECDC4'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`w-full max-w-md rounded-2xl p-6 shadow-xl ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preview */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg mb-3 relative">
              <Image
                src={getAvatarPath(selectedAvatar)}
                alt={selectedAvatar.name}
                fill
                className="object-cover"
              />
            </div>
            <p className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              {selectedAvatar.name}
            </p>
          </div>

          {/* Avatar Gallery Grid */}
          <div className="mb-6">
            <p className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Choose Your Avatar
            </p>
            <div className="grid grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-2">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                    selectedAvatar.id === avatar.id
                      ? 'ring-3 ring-cyan-500 scale-105'
                      : isDarkMode
                        ? 'hover:ring-2 hover:ring-slate-600'
                        : 'hover:ring-2 hover:ring-gray-300'
                  }`}
                >
                  <Image
                    src={getAvatarPath(avatar)}
                    alt={avatar.name}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                isDarkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <FaTimes size={14} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl font-medium bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <FaCheck size={14} />
              Save
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmojiAvatarPicker;
