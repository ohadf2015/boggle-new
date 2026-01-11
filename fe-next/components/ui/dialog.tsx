import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "../../lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

// Neo-Brutalist Overlay: Dark with halftone pattern
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-neo-black/85",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    style={{
      backgroundImage: 'var(--halftone-pattern-lg)',
    }}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Neo-Brutalist Dialog Content: Paper texture, thick borders, hard shadow, slight tilt
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideCloseButton?: boolean;
  /**
   * Set to true to hide accessibility warnings when no DialogDescription is used.
   * This adds aria-describedby={undefined} to explicitly mark the dialog as not needing description.
   */
  noDescription?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, hideCloseButton, noDescription, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      // Suppress accessibility warning when dialog intentionally has no description
      aria-describedby={noDescription ? undefined : props['aria-describedby']}
      className={cn(
        // Mobile-first positioning - constrained on mobile, centered modal on desktop
        "fixed z-50 grid w-[calc(100%-2rem)] max-w-[95vw]",
        // Positioning
        "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
        "sm:max-w-lg lg:max-w-xl xl:max-w-2xl",
        // Height constraints - prevent overflow
        "max-h-[90vh] sm:max-h-[85vh]",
        // Neo-Brutalist styling
        "bg-neo-cream text-neo-black",
        "border-3 sm:border-4 border-neo-black",
        "rounded-neo sm:rounded-neo-lg",
        "shadow-hard sm:shadow-hard-xl",
        // Spacing
        "p-0 gap-0",
        // Overflow for scrolling
        "overflow-y-auto overflow-x-hidden",
        // Animations
        "duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      style={{
        backgroundImage: 'var(--halftone-pattern)',
      }}
      {...props}
    >
      {children}
      {/* Neo-Brutalist Close Button - adjusted for mobile and RTL */}
      {!hideCloseButton && (
        <DialogPrimitive.Close
          className="
            absolute top-2 sm:top-3
            right-2 sm:right-3
            rtl:right-auto rtl:left-2 rtl:sm:left-3
            w-11 h-11 sm:w-12 sm:h-12
            min-w-[44px] min-h-[44px]
            flex items-center justify-center
            bg-neo-red text-neo-white
            border-2 sm:border-3 border-neo-black
            rounded-neo
            shadow-hard-sm
            transition-all duration-100
            hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
            active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
            focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2
            z-10
          "
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6 stroke-[3]" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Neo-Brutalist Header: Yellow background strip
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 p-4 sm:p-6 lg:p-8",
      "bg-neo-yellow border-b-3 border-neo-black",
      "text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

// Neo-Brutalist Footer
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end gap-2 lg:gap-3",
      "p-4 sm:p-6 lg:p-8 pt-0 sm:pt-0 lg:pt-0",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

// Neo-Brutalist Title: Bold uppercase
// dir="auto" ensures proper punctuation placement in mixed RTL/LTR contexts
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    dir="auto"
    className={cn(
      "text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-tight",
      "text-neo-black",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// Neo-Brutalist Description
// dir="auto" ensures proper punctuation placement in mixed RTL/LTR contexts
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    dir="auto"
    className={cn(
      "text-sm font-medium text-neo-black/70",
      className
    )}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

// Body wrapper for content padding
const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "p-4 sm:p-6 lg:p-8",
      className
    )}
    {...props}
  />
);
DialogBody.displayName = "DialogBody";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogBody,
};
