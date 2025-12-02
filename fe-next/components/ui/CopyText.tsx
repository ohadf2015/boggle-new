"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "../../lib/utils";

interface CopyTextProps {
  text: string;
  className?: string;
}

const CopyText: React.FC<CopyTextProps> = ({ text, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="border-3 border-neo-black rounded-neo bg-neo-cream p-4 shadow-hard">
        <pre className="whitespace-pre-wrap text-neo-black text-sm font-medium leading-relaxed">
          {text}
        </pre>
      </div>
      <button
        onClick={handleCopy}
        className={cn(
          "mt-3 w-full inline-flex items-center justify-center gap-2",
          "h-11 px-5 py-2 text-sm font-bold uppercase tracking-wide",
          "border-3 border-neo-black rounded-neo",
          "shadow-hard transition-all duration-100",
          "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg",
          "active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed",
          copied
            ? "bg-neo-lime text-neo-black"
            : "bg-neo-cyan text-neo-black hover:brightness-110"
        )}
      >
        {copied ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy to Clipboard
          </>
        )}
      </button>
    </div>
  );
};

export { CopyText };

// Game Description for LexiClash
export const LEXICLASH_DESCRIPTION = `LexiClash is a fast-paced multiplayer word-finding game where players compete in real-time to discover hidden words within randomized letter grids.

Race against the clock and your opponents to form words by connecting adjacent letters horizontally, vertically, or diagonally. Each round presents a fresh grid filled with letters waiting to be transformed into words. Create game rooms and invite up to 50 friends, family members, or classmates to join the word-hunting frenzy.

Simply click or tap on letters to build your word, then submit it for instant validation. The intuitive drag-and-swipe interface makes word creation smooth and satisfying on both desktop and mobile devices.

Longer words earn more points, but the real secret to domination lies in the combo system. Submit words consecutively without mistakes to build your combo multiplier, reaching up to 1.75x your base score. Accuracy matters—invalid submissions break your streak and reset your multiplier to zero.

Start with shorter words to build momentum and secure your combo multiplier before hunting for longer, high-value discoveries. Scan the grid edges where competitors often overlook hidden gems. Balance speed with precision—a broken combo costs more than a few extra seconds of careful selection.

Choose from five difficulty levels ranging from beginner-friendly 4x4 grids to the mind-bending 11x11 master challenge. Unlock over 15 unique achievements like Combo King for maintaining epic streaks or Word Architect for discovering lengthy vocabulary treasures. Track your progress through the leveling system, earn experience points, and watch your rank climb from newcomer to Eternal Champion.

Whether you are hosting a party, energizing a classroom, or enjoying family game night, LexiClash transforms vocabulary building into thrilling competition. Available in English, Hebrew, Swedish, and Japanese.`;
