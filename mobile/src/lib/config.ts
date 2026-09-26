/** Public identifiers for the app. Anything secret belongs in .env. */

export const BRAND = {
  name: 'Rota',
  domain: 'therotaapp.com',
  site: 'https://therotaapp.com',
  /** Shown in the app and given to Apple as the support contact. */
  supportEmail: 'rota_support@therotaapp.com',
  /** Address the account e-mails are sent from. */
  senderEmail: 'no-reply@therotaapp.com',
  city: 'Paris',
} as const;

export const LEGAL_URLS = {
  terms: `${BRAND.site}/conditions`,
  privacy: `${BRAND.site}/confidentialite`,
  guidelines: `${BRAND.site}/regles`,
  support: `${BRAND.site}/aide`,
} as const;
