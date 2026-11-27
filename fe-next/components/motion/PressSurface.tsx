'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { neoChunkyPress, type ChunkyLip } from '@/components/ui/neoStyles';
import { usePress } from './usePress';

export interface PressSurfaceProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  lip?: ChunkyLip;
}

export const PressSurface = React.forwardRef<HTMLButtonElement, PressSurfaceProps>(
  ({ asChild = false, lip = 4, className, type, disabled, ...props }, ref) => {
    const press = usePress<HTMLButtonElement>(props, disabled);
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        type={asChild ? type : (type ?? 'button')}
        disabled={disabled}
        className={cn(neoChunkyPress(lip), className)}
        {...props}
        {...press}
      />
    );
  },
);
PressSurface.displayName = 'PressSurface';
