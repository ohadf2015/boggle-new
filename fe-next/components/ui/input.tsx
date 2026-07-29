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
          "flex h-11 w-full px-4 py-2 text-base font-medium",
          // Neo-Brutalist: thick border, hard shadow
          "rounded-neo border-3 border-neo-black",
          "bg-neo-navy text-neo-white",
          // Inset shadow for depth
          "shadow-hard-pressed",
          // Placeholder styling
          "placeholder:text-muted-foreground placeholder:font-normal",
          // Focus state with cyan ring
          "focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy",
          // Focus: slight "press" effect
          "focus:shadow-hard-pressed",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-70 disabled:bg-neo-navy/70",
          // File input styling
          "file:border-0 file:bg-neo-lime file:text-neo-black file:font-bold file:uppercase file:text-xs file:me-3 file:px-3 file:py-1 file:rounded-neo",
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
