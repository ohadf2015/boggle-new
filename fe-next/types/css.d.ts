/**
 * Type declarations for CSS module imports
 * Allows TypeScript to recognize CSS file imports without errors
 */
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
