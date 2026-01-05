import * as React from "react";

import { cn } from "../../lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tilt?: "left" | "right";
}

// Neo-Brutalist Card: Paper texture, thick borders, hard shadows
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tilt, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // Neo-Brutalist card styling
        "rounded-neo-lg border-4 border-neo-black bg-neo-cream text-neo-black",
        // Dark mode - use dark background with 3:1+ contrast border
        "dark:bg-slate-800 dark:text-neo-white dark:border-slate-400",
        "shadow-hard-lg h-full",
        // Container query setup for responsive children
        "cq-container",
        // Optional tilt for playfulness
        tilt === "left" && "rotate-[-2deg]",
        tilt === "right" && "rotate-[2deg]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

// Dark variant for cards that need dark backgrounds
const CardDark = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tilt, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-neo-lg border-4 border-neo-black bg-neo-gray text-neo-white",
        "shadow-hard-lg h-full",
        // Container query setup for responsive children
        "cq-container",
        tilt === "left" && "rotate-[-2deg]",
        tilt === "right" && "rotate-[2deg]",
        className
      )}
      {...props}
    />
  )
);
CardDark.displayName = "CardDark";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 cq-p-responsive", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// Neo-Brutalist Card Title: Bold, uppercase, with text shadow
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-black uppercase leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-neo-black/90 dark:text-neo-white/90", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("cq-p-responsive pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center cq-p-responsive pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardDark, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
