import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

// Neo-Brutalist Alert: Thick borders, hard shadows, bold colors
const alertVariants = cva(
  // Base styles
  [
    "relative w-full",
    "rounded-neo-lg border-3 border-neo-black",
    "p-4",
    "shadow-hard",
    "[&>svg~*]:pl-8 [&>svg+div]:translate-y-[-3px]",
    "[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[2.5]",
  ].join(" "),
  {
    variants: {
      variant: {
        // Default: Cream with black text
        default: "bg-neo-cream text-neo-black [&>svg]:text-neo-black",
        // Info: Cyan highlight
        info: "bg-neo-cyan text-neo-black [&>svg]:text-neo-black",
        // Success: Lime green
        success: "bg-neo-lime text-neo-black [&>svg]:text-neo-black",
        // Warning: Orange
        warning: "bg-neo-orange text-neo-black [&>svg]:text-neo-black",
        // Destructive: Red
        destructive: "bg-neo-red text-neo-white [&>svg]:text-neo-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

// Neo-Brutalist Alert Title: Bold uppercase
const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mb-1 font-black uppercase tracking-tight leading-none",
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

// Neo-Brutalist Alert Description
const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-sm font-medium [&_p]:leading-relaxed",
      className
    )}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
