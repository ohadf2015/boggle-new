'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button, type ButtonProps } from './button';
import { cn } from '../../lib/utils';

/**
 * Unified back/return navigation button.
 * Wraps the design-system Button with consistent ArrowLeft icon + RTL flip.
 */

interface BackButtonProps {
  onClick: () => void;
  label: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  isDarkMode?: boolean;
}

const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label,
  variant = 'outline',
  size = 'default',
  className,
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={cn(className)}
    >
      <ArrowLeft className="me-2 rtl:rotate-180" aria-hidden="true" />
      {label}
    </Button>
  );
};

export { BackButton };
export type { BackButtonProps };
