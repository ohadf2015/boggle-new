import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

/**
 * Neo-Brutalist Achievement Badge
 * Features: Thick borders, hard shadows, bold uppercase text, vibrant colors
 */
export const AchievementBadge = ({ achievement, index = 0 }) => {
  const [open, setOpen] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild onClick={handleClick}>
          <motion.button
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
            whileHover={{ scale: 1.05, rotate: 2, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            <Badge className="px-3 py-2 text-sm font-black uppercase tracking-wide
                            text-neo-black bg-neo-cyan
                            border-3 border-neo-black rounded-md
                            shadow-hard-sm
                            hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard
                            active:translate-x-[1px] active:translate-y-[1px] active:shadow-none
                            transition-all duration-100 cursor-pointer touch-manipulation">
              <span className="mr-1">{achievement.icon}</span>
              {achievement.name}
            </Badge>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="z-50 bg-neo-purple border-3 border-neo-black shadow-hard rounded-md p-3"
          onPointerDownOutside={() => setOpen(false)}
        >
          <div>
            <p className="font-black uppercase text-neo-white tracking-wide">{achievement.name}</p>
            <p className="text-xs font-bold text-neo-cyan mt-1">{achievement.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
