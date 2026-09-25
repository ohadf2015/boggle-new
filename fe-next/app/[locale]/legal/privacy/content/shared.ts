/**
 * Shared types + the verbatim Google API Services User Data Policy disclosure
 * (kept in English in every locale — see app/[locale]/legal/privacy/content/*.ts).
 */

export type PrivacySection = {
  title: string;
  content: string;
  items?: string[];
  subsections?: Array<{ title: string; items?: string[]; content?: string }>;
};

export type PrivacyContent = {
  title: string;
  intro: string;
  sections: PrivacySection[];
};

export const GOOGLE_LIMITED_USE_CLAUSE =
  `LexiClash's use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.`;
export const GOOGLE_LIMITED_USE_URL = `https://developers.google.com/terms/api-services-user-data-policy`;
