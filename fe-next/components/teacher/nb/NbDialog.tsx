'use client';

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { NbColor } from './nbStyles';
import {
  NB_DIALOG_BODY,
  NB_DIALOG_CLOSE,
  NB_DIALOG_DESCRIPTION,
  NB_DIALOG_FOOTER,
  NB_DIALOG_TITLE,
  nbDialogContentClass,
  nbDialogHeaderClass,
  type NbDialogPhone,
  type NbDialogSize,
} from './nbDialogStyles';

type ContentProps = Omit<ComponentPropsWithoutRef<typeof DialogContent>, 'hideCloseButton' | 'closeButtonVariant' | 'thickBorder'> & {
  size?: NbDialogSize;
  phone?: NbDialogPhone;
};

/** The teacher dialog surface. The close button lives in NbDialogHeader, never the primitive's red one. */
export const NbDialogContent = forwardRef<ElementRef<typeof DialogContent>, ContentProps>(
  ({ size = 'md', phone = 'sheet', className, style, ...props }, ref) => (
    <DialogContent
      ref={ref}
      hideCloseButton
      className={cn(nbDialogContentClass(size, phone), className)}
      style={{ ...style, backgroundImage: 'none' }}
      {...props}
    />
  ),
);
NbDialogContent.displayName = 'NbDialogContent';

interface HeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Description read by screen readers only. */
  srDescription?: ReactNode;
  color?: NbColor;
  icon?: ReactNode;
  /** Translated label; omit to draw no close button. */
  closeLabel?: string;
  className?: string;
  titleClassName?: string;
  children?: ReactNode;
}

export function NbDialogHeader({ title, description, srDescription, color = 'navy', icon, closeLabel, className, titleClassName, children }: HeaderProps) {
  return (
    <header data-nb-dialog-header="" className={cn(nbDialogHeaderClass(color), className)}>
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <DialogTitle dir="auto" className={cn(NB_DIALOG_TITLE, titleClassName)}>{title}</DialogTitle>
        {description ? <DialogDescription className={NB_DIALOG_DESCRIPTION}>{description}</DialogDescription> : null}
        {srDescription ? <DialogDescription className="sr-only">{srDescription}</DialogDescription> : null}
        {children}
      </div>
      {closeLabel ? (
        <DialogClose aria-label={closeLabel} title={closeLabel} className={NB_DIALOG_CLOSE}>
          <X className="size-5" strokeWidth={3} aria-hidden="true" />
        </DialogClose>
      ) : null}
    </header>
  );
}

export function NbDialogBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(NB_DIALOG_BODY, className)} {...props} />;
}

export function NbDialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <footer className={cn(NB_DIALOG_FOOTER, className)} {...props} />;
}
