// No-op stub for @feedback/sdk. Webpack aliases to this file when the
// real SDK isn't installed (production / CI). To enable locally:
//   npm i /Users/ohadfisher/git/feedback-devtools/feedback-sdk-0.1.0.tgz --no-save
export const FeedbackToolbar: (props: { projectToken?: string }) => null = () => null;
export const withFeedbackSDK = <T,>(config: T): T => config;
