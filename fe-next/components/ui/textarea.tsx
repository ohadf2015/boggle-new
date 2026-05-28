import * as React from "react";

import { cn } from "../../lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

// Neo-Brutalist Textarea: Thick borders, hard inset shadow, chunky feel
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styling
          "flex min-h-[100px] w-full px-4 py-3 text-sm font-medium resize-y",
          // Neo-Brutalist: thick border, hard shadow
          "rounded-neo border-3 border-neo-black dark:border-slate-500",
          "bg-neo-cream dark:bg-neo-navy-elevated text-slate-900 dark:text-white",
          // Inset shadow for depth
          "shadow-hard-pressed",
          // Placeholder styling
          "placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal",
          // Focus state with cyan ring
          "focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy",
          // Focus: slight "press" effect
          "focus:shadow-hard-pressed",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-70 disabled:bg-neo-cream/70 dark:disabled:bg-slate-600/70",
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
Textarea.displayName = "Textarea";

export { Textarea };
