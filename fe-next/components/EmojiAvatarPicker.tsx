'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck, FaTimes } from 'react-icons/fa';
import Image from 'next/image';
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
        role="dialog"
        aria-modal="true"
        aria-label="Choose your avatar"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md p-6 bg-neo-cream border-4 border-neo-black shadow-hard"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preview */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-neo-black shadow-hard mb-3 relative">
              <Image
                src={getAvatarPath(selectedAvatar)}
                alt={selectedAvatar.name}
                fill
                sizes="96px"
                className="object-cover"
                priority
              />
            </div>
            <p className="text-lg font-black text-neo-black uppercase tracking-wide">
              {selectedAvatar.name}
            </p>
          </div>

          {/* Avatar Gallery Grid */}
          <div className="mb-6">
            <p className="text-sm font-bold mb-3 text-neo-black uppercase tracking-wide">
              Choose Your Avatar
            </p>
            <div className="grid grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-2">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar)}
                  aria-label={`Select ${avatar.name} avatar`}
                  aria-pressed={selectedAvatar.id === avatar.id}
                  className={`relative aspect-square overflow-hidden transition-all duration-100 border-3 border-neo-black ${
                    selectedAvatar.id === avatar.id
                      ? 'ring-4 ring-neo-cyan scale-105 shadow-hard'
                      : 'hover:scale-105 hover:shadow-hard-sm'
                  }`}
                >
                  <Image
                    src={getAvatarPath(avatar)}
                    alt={avatar.name}
                    fill
                    sizes="(max-width: 640px) 64px, 80px"
                    className="object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 font-bold uppercase tracking-wide transition-all duration-100 flex items-center justify-center gap-2 bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              <FaTimes size={14} />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 font-bold uppercase tracking-wide transition-all duration-100 flex items-center justify-center gap-2 bg-neo-cyan text-neo-black border-3 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
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
