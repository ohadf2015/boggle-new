import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

// Neo-Brutalist Label: Bold, uppercase styling
const labelVariants = cva(
  [
    "text-sm font-bold uppercase tracking-wide leading-none",
    "text-neo-cream",
    "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
  ].join(" ")
);

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
