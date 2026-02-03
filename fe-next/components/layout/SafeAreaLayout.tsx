'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SafeAreaLayoutProps {
  children: React.ReactNode;
  className?: string;
  /** Apply top spacing for sticky header (mobile/tablet only) */
  headerSpacing?: boolean;
  /** Apply bottom spacing for footer/bottom nav */
  footerSpacing?: boolean;
  /** Use full viewport height minus header/footer */
  fullHeight?: boolean;
  /** Minimum height option */
  minHeight?: boolean;
  /** Additional top padding */
  topPadding?: boolean;
  /** Additional bottom padding */
  bottomPadding?: boolean;
}

/**
 * SafeAreaLayout - Ensures content is not hidden by header or footer
 * 
 * Best practices applied:
 * - Header is sticky on mobile/tablet (<lg), static on desktop (lg+)
 * - Bottom nav is fixed on mobile only (<sm)
 * - Footer is visible on desktop only (sm+)
 * - Uses CSS custom properties for dynamic heights
 * - Handles iOS safe area insets
 * 
 * @example
 * <SafeAreaLayout headerSpacing footerSpacing>
 *   <YourContent />
 * </SafeAreaLayout>
 */
export function SafeAreaLayout({
  children,
  className,
  headerSpacing = false,
  footerSpacing = true,
  fullHeight = false,
  minHeight = true,
  topPadding = false,
  bottomPadding = false,
}: SafeAreaLayoutProps) {
  return (
    <div
      className={cn(
        // Base layout
        'relative w-full',
        
        // Height handling
        fullHeight && 'h-full',
        minHeight && !fullHeight && 'min-h-full',
        
        // Header spacing - only needed when header is sticky (mobile/tablet)
        // On desktop (lg+), header is static so no extra spacing needed
        headerSpacing && [
          'pt-[calc(var(--header-height-mobile)+8px)]',
          'sm:pt-[calc(var(--header-height-tablet)+12px)]',
          'lg:pt-0', // Header is static on desktop
        ],
        
        // Footer/bottom nav spacing
        footerSpacing && [
          // Mobile: account for fixed bottom nav (64px) + safe area
          'pb-[var(--mobile-bottom-safe)]',
          // Desktop: account for footer
          'sm:pb-[calc(var(--footer-height)+env(safe-area-inset-bottom,0px))]',
        ],
        
        // Additional padding options
        topPadding && 'pt-4 sm:pt-6 lg:pt-8',
        bottomPadding && 'pb-4 sm:pb-6 lg:pb-8',
        
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * ContentContainer - Centers content with max-width and proper padding
 */
interface ContentContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-full',
};

const paddingClasses = {
  none: '',
  sm: 'px-2 py-4',
  md: 'px-4 py-6',
  lg: 'px-6 py-8',
};

export function ContentContainer({
  children,
  className,
  maxWidth = '4xl',
  padding = 'md',
}: ContentContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * ScrollableContent - Makes content scrollable with proper overscroll behavior
 */
interface ScrollableContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollableContent({ children, className }: ScrollableContentProps) {
  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto overscroll-contain',
        '-webkit-overflow-scrolling-touch',
        className
      )}
    >
      {children}
    </div>
  );
}

export default SafeAreaLayout;
