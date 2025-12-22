import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

interface LateJoinerBadgeProps {
  autoHideAfterMs?: number;
  onFirstWord?: () => void;
}

/**
 * LateJoinerBadge - Visual indicator shown next to late joiner's username
 * Auto-hides after specified time or when first word is submitted
 */
const LateJoinerBadge: React.FC<LateJoinerBadgeProps> = ({
  autoHideAfterMs = 30000, // 30 seconds default
  onFirstWord,
}) => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide timer
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, autoHideAfterMs);

    return () => clearTimeout(timer);
  }, [autoHideAfterMs]);

  const handleFirstWord = () => {
    setIsVisible(false);
    onFirstWord?.();
  };

  // Expose method to parent to hide on first word
  useEffect(() => {
    if (onFirstWord) {
      // Store reference for parent to call
      (window as any).__hideLateJoinerBadge = handleFirstWord;
    }
    return () => {
      delete (window as any).__hideLateJoinerBadge;
    };
  }, [onFirstWord]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-neo-pink/20 border-2 border-neo-black rounded-neo shadow-hard-sm"
        >
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            className="text-xs"
          >
            🚀
          </motion.span>
          <span className="text-[10px] sm:text-xs font-bold text-neo-black whitespace-nowrap">
            {t('lateJoiner.badge')}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LateJoinerBadge;
