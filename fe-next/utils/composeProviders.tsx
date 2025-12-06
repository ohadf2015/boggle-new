'use client';

import React, { ReactNode, ComponentType, ReactElement } from 'react';

/**
 * Provider configuration - a tuple of [Provider, props]
 * The Provider is a component that takes children and optional props
 */
type ProviderConfig = [ComponentType<{ children: ReactNode } & Record<string, unknown>>, Record<string, unknown>?];

/**
 * Composes multiple providers into a single component
 * This reduces nesting depth and makes provider composition more maintainable
 *
 * @example
 * const ComposedProviders = composeProviders([
 *   [ThemeProvider, {}],
 *   [LanguageProvider, { initialLanguage: 'en' }],
 *   [AuthProvider, {}],
 * ]);
 *
 * // Use it like:
 * <ComposedProviders>{children}</ComposedProviders>
 */
export function composeProviders(providers: ProviderConfig[]) {
  return function ComposedProviders({ children }: { children: ReactNode }): ReactElement {
    return providers.reduceRight(
      (acc: ReactNode, [Provider, props = {}]) => (
        <Provider {...props}>{acc}</Provider>
      ),
      children
    ) as ReactElement;
  };
}

/**
 * Alternative: Create a composed provider component directly
 * Useful for grouping related providers together
 */
export function createProviderGroup(
  name: string,
  providers: ProviderConfig[]
): ComponentType<{ children: ReactNode }> {
  const ProviderGroup = ({ children }: { children: ReactNode }) => {
    return providers.reduceRight(
      (acc: ReactNode, [Provider, props = {}]) => (
        <Provider {...props}>{acc}</Provider>
      ),
      children
    ) as ReactElement;
  };

  ProviderGroup.displayName = name;
  return ProviderGroup;
}
