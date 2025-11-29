export const locales = ['he', 'en', 'sv', 'ja'];
export const defaultLocale = 'he';

export const localeNames = {
  he: 'עברית',
  en: 'English',
  sv: 'Svenska',
  ja: '日本語',
};

export const localeDirections = {
  he: 'rtl',
  en: 'ltr',
  sv: 'ltr',
  ja: 'ltr',
};

// Map country codes to supported locales
export const countryToLocale = {
  // Hebrew-speaking regions
  IL: 'he', // Israel

  // English-speaking regions
  US: 'en', // United States
  GB: 'en', // United Kingdom
  CA: 'en', // Canada
  AU: 'en', // Australia
  NZ: 'en', // New Zealand
  IE: 'en', // Ireland
  ZA: 'en', // South Africa
  IN: 'en', // India
  PH: 'en', // Philippines
  SG: 'en', // Singapore

  // Swedish-speaking regions
  SE: 'sv', // Sweden
  FI: 'sv', // Finland (has Swedish-speaking population)

  // Japanese-speaking regions
  JP: 'ja', // Japan
};
