import type { TranslationKey } from '../i18n';

/**
 * Database and payment errors, in words a member understands. The server
 * raises short English sentences on purpose; this is the only place they
 * are matched.
 */
const KNOWN: [RegExp, TranslationKey][] = [
  [/rentals_no_double_booking|conflicting key value/i, 'error.datesTaken'],
  [/Dates in the past/i, 'error.datesPast'],
  [/Invalid dates/i, 'error.datesInvalid'],
  [/Rental too long/i, 'error.tooLong'],
  [/Too far ahead/i, 'error.tooFar'],
  [/Listing unavailable/i, 'error.listingUnavailable'],
  [/cannot rent your own/i, 'error.ownPiece'],
  [/Rental not paid/i, 'error.notPaid'],
  [/Wrong code/i, 'error.wrongCode'],
  [/Condition photos are required/i, 'error.photosFirst'],
  [/Posting suspended/i, 'error.postingSuspended'],
  [/Authenticity proof required/i, 'list.needProof'],
  [/Too many listings today/i, 'error.tooManyListings'],
  [/payments_not_configured|server_not_configured/i, 'error.paymentsUnavailable'],
  [/expired/i, 'error.bookingExpired'],
  [/Not allowed/i, 'error.notAllowed'],
];

export function friendlyError(e: unknown, t: (k: TranslationKey) => string): string {
  const message = e instanceof Error ? e.message : String(e ?? '');
  for (const [pattern, key] of KNOWN) if (pattern.test(message)) return t(key);
  return t('error.generic');
}
