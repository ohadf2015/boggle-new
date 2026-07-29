import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "../../lib/utils";
import { acquireModalOpen, releaseModalOpen } from "../../lib/native/modalOpenSignal";

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
    data-dialog-overlay=""
    className={cn(
      "fixed inset-0 z-90 bg-neo-black/85",
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
  /**
   * Accessible label for the close button. Defaults to "Close".
   * Pass a translated string for i18n support.
   */
  closeButtonLabel?: string;
  /**
   * Use thicker 6px border for modal emphasis (matches SuperDesign modal architecture)
   */
  thickBorder?: boolean;
  /**
   * Close button style variant
   * - 'default': Red background with X (current style)
   * - 'minimal': Black square with white X (SuperDesign style)
   */
  closeButtonVariant?: 'default' | 'minimal';
}

/**
 * Flags the screen as modal-owned (html.modal-open) for as long as it is mounted.
 * It is rendered INSIDE DialogPrimitive.Content, which Radix only commits to the
 * DOM while the dialog is actually open — so this mounts iff open, even though the
 * parent DialogContent component stays in the React tree across open/close toggles
 * (the common `<Dialog open={isOpen}><DialogContent>` pattern). The native AdMob
 * banner is a SurfaceView composited ABOVE the WebView and can't be covered by the
 * dialog's z-90 overlay, so the banner coordinator reads this flag to hide the
 * banner while a modal is up. Ref-counted so stacked dialogs don't clear it early
 * (see modalOpenSignal).
 */
const ModalOpenFlag = () => {
  React.useEffect(() => {
    acquireModalOpen();
    return () => releaseModalOpen();
  }, []);
  return null;
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({
  className,
  children,
  hideCloseButton,
  noDescription,
  closeButtonLabel = "Close",
  thickBorder = false,
  closeButtonVariant = 'default',
  ...props
}, ref) => (
  <DialogPortal>
    <DialogOverlay />
    {/* Flex-centering wrapper — immune to transform-based animation conflicts */}
    <div className="fixed inset-0 z-90 flex items-center justify-center pointer-events-none">
    <DialogPrimitive.Content
      ref={ref}
      // Suppress accessibility warning when dialog intentionally has no description
      aria-describedby={noDescription ? undefined : props['aria-describedby']}
      className={cn(
        // Sizing — centered by parent flex container
        "relative grid w-[calc(100%-2rem)] max-w-[95vw] pointer-events-auto",
        "sm:max-w-lg lg:max-w-xl xl:max-w-2xl",
        // Height constraints - prevent overflow
        "max-h-[90vh] sm:max-h-[85vh]",
        // Neo-Brutalist styling
        "bg-neo-cream dark:bg-neo-navy text-neo-black dark:text-neo-white",
        // Border - supports thick variant for modal emphasis
        thickBorder
          ? "border-[6px] border-neo-black dark:border-slate-600"
          : "border-3 sm:border-4 border-neo-black dark:border-slate-600",
        "rounded-neo sm:rounded-neo-lg",
        "shadow-hard sm:shadow-hard-xl",
        // Spacing
        "p-0 gap-0",
        // Overflow for scrolling
        "overflow-y-auto overflow-x-hidden",
        // Animations — fade + zoom only (no slide, which conflicts with centering)
        "duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      style={{
        backgroundImage: 'var(--halftone-pattern)',
      }}
      {...props}
    >
      {/* Mounts iff the dialog is actually open → flags html.modal-open so the
          native banner is suppressed while a modal covers the screen. */}
      <ModalOpenFlag />
      {children}
      {/* Neo-Brutalist Close Button - supports two variants */}
      {!hideCloseButton && (
        <DialogPrimitive.Close
          className={cn(
            "absolute top-2 sm:top-3",
            "right-2 sm:right-3",
            "rtl:right-auto rtl:left-2 sm:rtl:left-3",
            "flex items-center justify-center",
            "transition-all duration-100",
            "focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2",
            "z-10",
            // Variant-specific styles
            closeButtonVariant === 'minimal' ? [
              // SuperDesign minimal style: black square with white X
              "w-8 h-8",
              "min-w-[32px] min-h-[32px]",
              "bg-neo-black text-neo-white",
              "border-0",
              "rounded-none",
              "hover:bg-neo-black/80",
              "active:bg-neo-black",
            ] : [
              // Default style: red background
              "w-11 h-11 sm:w-12 sm:h-12",
              "min-w-[44px] min-h-[44px]",
              "bg-neo-red text-neo-black",
              "border-2 sm:border-3 border-neo-black",
              "rounded-neo",
              "shadow-hard-sm",
              "hover:-translate-x-px hover:-translate-y-px hover:shadow-hard",
              "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
            ]
          )}
        >
          <X
            className={cn(
              "stroke-3",
              closeButtonVariant === 'minimal'
                ? "h-4 w-4"
                : "h-5 w-5 sm:h-6 sm:w-6"
            )}
            aria-hidden="true"
          />
          <span className="sr-only">{closeButtonLabel}</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
    </div>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Neo-Brutalist Header: Customizable background with variants
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'yellow' | 'pink' | 'cyan' | 'gradient';
  customBg?: string; // For custom gradients like PrestigeModal
}

const DialogHeader = ({
  className,
  variant = 'yellow',
  customBg,
  ...props
}: DialogHeaderProps) => {
  const bgClass = customBg || {
    yellow: 'bg-neo-yellow',
    pink: 'bg-neo-pink',
    cyan: 'bg-neo-cyan',
    gradient: '', // Use customBg for gradients
  }[variant];

  return (
    <div
      className={cn(
        // Reduced padding: mobile 12px, sm 16px, lg 20px (was 16/24/32)
        "flex flex-col space-y-1 p-3 sm:p-4 lg:p-5",
        bgClass,
        "border-b-3 border-neo-black",
        "text-neo-black",
        "text-center",
        className
      )}
      {...props}
    />
  );
};
DialogHeader.displayName = "DialogHeader";

// Neo-Brutalist Footer
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end gap-2 lg:gap-3",
      // Reduced padding: mobile 12px, sm 16px, lg 20px (was 16/24/32)
      "p-3 sm:p-4 lg:p-5 pt-0 sm:pt-0 lg:pt-0",
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
      "text-sm font-medium text-current/80",
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
      // Reduced padding: mobile 12px, sm 16px, lg 20px (was 16/24/32)
      "p-3 sm:p-4 lg:p-5",
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
