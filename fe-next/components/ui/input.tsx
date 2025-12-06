import * as React from "react";

import { cn } from "../../lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

// Neo-Brutalist Input: Thick borders, hard inset shadow, chunky feel
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styling
          "flex h-11 w-full px-4 py-2 text-sm font-medium",
          // Neo-Brutalist: thick border, hard shadow
          "rounded-neo border-3 border-neo-black",
          "bg-neo-cream text-neo-black",
          // Inset shadow for depth
          "shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)]",
          // Placeholder styling
          "placeholder:text-neo-black/40 placeholder:font-normal",
          // Focus state with cyan ring
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy",
          // Focus: slight "press" effect
          "focus:shadow-[inset_3px_3px_0px_rgba(0,0,0,0.15)]",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neo-cream/50",
          // File input styling
          "file:border-0 file:bg-neo-yellow file:text-neo-black file:font-bold file:uppercase file:text-xs file:mr-3 file:px-3 file:py-1 file:rounded-neo",
          // Transition
          "transition-shadow duration-100",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
