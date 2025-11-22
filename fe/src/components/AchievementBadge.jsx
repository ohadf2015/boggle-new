import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export const AchievementBadge = ({ achievement, index = 0 }) => (
  <TooltipProvider delayDuration={0}>
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 1.1 }}
        >
          <Badge className="px-4 py-2 text-sm bg-gradient-to-r from-green-500 to-emerald-600
                          hover:from-green-600 hover:to-emerald-700
                          active:from-green-600 active:to-emerald-700
                          transition-all cursor-pointer shadow-lg touch-manipulation">
            {achievement.icon} {achievement.name}
          </Badge>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={5}
        className="z-50"
      >
        <div>
          <p className="font-bold">{achievement.name}</p>
          <p className="text-xs">{achievement.description}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
