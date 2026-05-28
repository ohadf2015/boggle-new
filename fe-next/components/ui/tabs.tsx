"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "../../lib/utils"

const Tabs = TabsPrimitive.Root

/**
 * TabsList variants:
 * - 'pill': Default pill-style background tabs
 * - 'underline': Border-bottom style with active indicator (SuperDesign style)
 */
interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  variant?: 'pill' | 'underline';
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant = 'pill', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      variant === 'pill' && [
        "inline-flex h-10 items-center justify-center rounded-md bg-neo-navy/50 p-1 text-neo-white",
      ],
      variant === 'underline' && [
        "flex border-b-4 border-neo-black",
      ],
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

/**
 * TabsTrigger variants:
 * - 'pill': Default pill-style with background on active
 * - 'underline': Text-only with bottom border indicator on active (SuperDesign style)
 */
interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  variant?: 'pill' | 'underline';
  /** Active color for underline variant */
  activeColor?: 'lime' | 'pink' | 'cyan' | 'purple';
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant = 'pill', activeColor = 'lime', ...props }, ref) => {
  // Active color classes for underline variant
  const activeColors = {
    lime: 'data-[state=active]:text-neo-lime data-[state=active]:border-neo-lime',
    pink: 'data-[state=active]:text-neo-pink data-[state=active]:border-neo-pink',
    cyan: 'data-[state=active]:text-neo-cyan data-[state=active]:border-neo-cyan',
    purple: 'data-[state=active]:text-neo-purple data-[state=active]:border-neo-purple',
  };

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        // Common styles
        "inline-flex items-center justify-center whitespace-nowrap transition-all",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-70",
        // Variant-specific styles
        variant === 'pill' && [
          "rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background",
          "data-[state=active]:bg-neo-navy data-[state=active]:text-neo-white data-[state=active]:shadow-xs",
        ],
        variant === 'underline' && [
          "px-4 py-2 text-sm font-black uppercase",
          "text-slate-400 hover:text-neo-white",
          "border-b-4 border-transparent -mb-1",
          activeColors[activeColor],
        ],
        className
      )}
      {...props}
    />
  );
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
