/**
 * Shared auth modal components
 * Re-export all shared components from a single entry point
 */

// Types
export type { OAuthProvider, AuthBenefit, AuthModalBaseProps, AuthMode } from './types';

// Icons
export { GoogleIcon, DiscordIcon } from './icons/BrandIcons';

// Components
export { AuthTermsFooter } from './AuthTermsFooter';
export { AuthErrorMessage } from './AuthErrorMessage';
export { AuthSuccessMessage } from './AuthSuccessMessage';
export { OAuthButtonGroup } from './OAuthButtonGroup';
export { BenefitsList } from './BenefitsList';
export { AuthModalCloseButton } from './AuthModalCloseButton';
