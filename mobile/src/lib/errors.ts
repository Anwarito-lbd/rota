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
  [/Media must be uploaded by the listing owner/i, 'error.mediaOwner'],
  [/listings_rules_limits/, 'list.rulesMax'],
  [/payments_not_configured|server_not_configured/i, 'error.paymentsUnavailable'],
  [/expired/i, 'error.bookingExpired'],
  [/Not allowed/i, 'error.notAllowed'],
  [/owner_on_vacation/i, 'detail.onVacation'],
  [/siret_invalid/i, 'shop.siretInvalid'],
  [/siret_taken/i, 'shop.notFound'],
  [/offer_out_of_range/i, 'offer.outOfRange'],
  [/offer_invalid|offer_closed/i, 'offer.invalid'],
  [/messages_closed/, 'error.messagesClosed'],
  [/comments_closed/, 'error.commentsClosed'],
  [/followers_only/, 'error.followersOnly'],
  [/story_not_yours/, 'error.storyNotYours'],
  [/too_many_words/, 'error.tooManyWords'],
  [/not_restored/, 'error.notRestored'],
  // Storage limits (listing-media 100 MB, private-docs 10 MB, allowed file types).
  [/exceeded the maximum allowed size|payload too large/i, 'error.fileTooLarge'],
  [/mime type .* is not supported|invalid_mime_type/i, 'error.fileType'],
  // Plain words: only the bare code, so a longer message can't match by accident.
  [/^blocked$/, 'msg.blocked'],
  [/^partial$/, 'error.partial'],
  [/^photo_unreadable$/, 'error.photoUnreadable'],
];

export function friendlyError(e: unknown, t: (k: TranslationKey) => string): string {
  const message = e instanceof Error ? e.message : String(e ?? '');
  for (const [pattern, key] of KNOWN) if (pattern.test(message)) return t(key);
  return t('error.generic');
}
