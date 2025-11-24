import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

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
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 1.1 }}
            className="inline-block"
          >
            <Badge className="px-4 py-2 text-sm text-white bg-gradient-to-r from-cyan-400 to-purple-500
                            hover:from-cyan-500 hover:to-purple-600
                            active:from-cyan-500 active:to-purple-600
                            transition-all cursor-pointer shadow-lg touch-manipulation">
              {achievement.icon} {achievement.name}
            </Badge>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={5}
          className="z-50"
          onPointerDownOutside={() => setOpen(false)}
        >
          <div>
            <p className="font-bold">{achievement.name}</p>
            <p className="text-xs">{achievement.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
