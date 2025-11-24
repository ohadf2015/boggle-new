import React from 'react';
import { motion } from 'framer-motion';

const CircularTimer = ({ remainingTime, totalTime = 180 }) => {
  // Calculate the progress percentage
  const progress = totalTime > 0 ? (remainingTime / totalTime) * 100 : 0;

  // Calculate the stroke dash offset for the circular progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const paddedSecs = secs < 10 ? `0${secs}` : secs;
    return `${mins}:${paddedSecs}`;
  };

  // Determine color based on remaining time
  const isLowTime = remainingTime < 30;
  const gradientId = isLowTime ? 'timer-gradient-red' : 'timer-gradient-blue';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
      className="flex items-center justify-center"
    >
      <div className="relative">
        <svg width="120" height="120" className="transform -rotate-90">
          <defs>
            {/* Blue to Purple gradient for normal time */}
            <linearGradient id="timer-gradient-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            {/* Red to Orange gradient for low time */}
            <linearGradient id="timer-gradient-red" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="rgba(148, 163, 184, 0.2)"
            strokeWidth="8"
            fill="none"
          />

          {/* Progress circle */}
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5 }}
            style={{
              filter: isLowTime
                ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))'
                : 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))'
            }}
          />
        </svg>

        {/* Timer text in the center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={isLowTime ? {
              scale: [1, 1.1, 1],
            } : {}}
            transition={{ duration: 0.5, repeat: isLowTime ? Infinity : 0 }}
            className={`text-3xl font-bold ${
              isLowTime
                ? 'text-red-500 dark:text-red-400'
                : 'text-slate-800 dark:text-white'
            }`}
          >
            {formatTime(remainingTime)}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default CircularTimer;
