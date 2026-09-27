import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

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
        // Neo-Brutalist card styling (dark-only)
        "rounded-neo-lg border-4 border-neo-cream/40 bg-neo-navy text-neo-white",
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

// CVA-based Card Variants (for flexible card system)
const cardVariants = cva(
  // Base styles - shared across all variants
  "border-neo-black rounded-neo @container/card cq-container h-full",
  {
    variants: {
      variant: {
        default: "bg-neo-gray text-neo-white shadow-hard-lg border-4",
        dark: "bg-neo-black text-neo-white shadow-hard-lg border-4",
        gradient: "border-3 shadow-hard", // For ModeCard-style gradients - background set via gradient prop
        outline: "bg-transparent border-3 shadow-hard-sm",
      },
      tilt: {
        none: "",
        left: "rotate-[-2deg]",
        right: "rotate-[2deg]",
      },
      hover: {
        none: "",
        lift: "transition-transform hover:-translate-y-1 hover:shadow-hard-xl",
        tilt3d: "transition-all hover:rotate-0", // For ModeCard 3D effect
      },
      padding: {
        none: "p-0",
        tight: "*:cq-p-tight",
        normal: "*:cq-p-responsive",
        large: "*:cq-p-responsive-lg",
        generous: "*:cq-p-generous",
      },
    },
    defaultVariants: {
      variant: "default",
      tilt: "none",
      hover: "none",
      padding: "normal",
    },
  }
);

// New CardVariant component with full CVA support
export interface CardVariantProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  gradient?: string; // For custom gradient backgrounds (e.g., "bg-linear-to-br from-neo-cyan to-cyan-400")
}

const CardVariant = React.forwardRef<HTMLDivElement, CardVariantProps>(
  ({ className, variant, tilt, hover, padding, gradient, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, tilt, hover, padding }), gradient, className)}
      style={style}
      {...props}
    />
  )
);
CardVariant.displayName = "CardVariant";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 lg:space-y-2 cq-p-responsive", className)}
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
      "text-2xl lg:text-3xl xl:text-4xl font-black uppercase leading-none tracking-tight",
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
    className={cn("text-sm lg:text-base xl:text-lg text-neo-white", className)}
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

export {
  Card,
  CardDark,
  CardVariant,
  cardVariants,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
