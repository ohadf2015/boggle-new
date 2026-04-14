// Ambient types for optional @feedback/sdk (dev-only toolbar).
// Keeps TypeScript happy in production builds where the package isn't installed —
// Turbopack resolveAlias redirects imports to lib/feedback-stub.tsx at bundle time.
declare module '@feedback/sdk' {
  export const FeedbackToolbar: (props: { projectToken?: string }) => null;
}

declare module '@feedback/sdk/next' {
  export function withFeedbackSDK<T>(config: T): T;
}
