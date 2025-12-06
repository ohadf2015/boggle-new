import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

// Neo-Brutalist Toggle: Thick borders, hard shadow, physical press effect
const toggleVariants = cva(
  [
    // Base layout
    "inline-flex items-center justify-center",
    // Typography
    "text-sm font-bold uppercase tracking-wide",
    // Neo-Brutalist styling
    "bg-neo-cream text-neo-black",
    "border-3 border-neo-black",
    "rounded-neo",
    "shadow-hard-sm",
    // Focus state
    "ring-offset-background",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2",
    // Disabled state
    "disabled:pointer-events-none disabled:opacity-50",
    // Transition
    "transition-all duration-100",
    // Active (selected) state - yellow with shadow
    "data-[state=on]:bg-neo-yellow data-[state=on]:shadow-hard",
    // Hover effect (non-selected)
    "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "",
        outline: "bg-transparent border-2 text-neo-cream",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ToggleGroupContextValue = VariantProps<typeof toggleVariants>;

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: "default",
  variant: "default",
});

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center justify-center gap-1", className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
));

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
