import type { Listing } from '../data/listings';
import { FEES, quoteCheckout, type CheckoutQuote } from '../lib/fees';
import { useStore } from './store';

/** The demo calendar sits in September 2026. */
const isoDay = (day: number) => `2026-09-${String(day).padStart(2, '0')}`;

export interface Booking {
  /** Billed days, counted inclusively (18 → 21 is four days). */
  days: number;
  ship: boolean;
  quote: CheckoutQuote;
  /** Charged only when the lender cleans the piece herself. */
  cleaningFee: number;
  /** Held on the card, never charged upfront. Scales with the item's value. */
  deposit: number;
  total: number;
  breakdown: { label: string; value: string }[];
}

/** Money for one listing over the dates currently selected. */
export function useBooking(listing: Listing | null): Booking {
  const { state, m } = useStore();
  const [start, end] = state.dates;
  const ship = state.delivery === 'ship';

  const quote = quoteCheckout({
    pricePerDay: listing?.price ?? 0,
    startDate: isoDay(start),
    endDate: isoDay(end),
    delivery: state.delivery,
    cleaningByLender: listing?.cleaning.byLender,
    cleaningFee: listing?.cleaning.fee,
    retail: listing?.retail,
  });

  const breakdown = [
    { label: `${m(listing?.price ?? 0)} × ${quote.days} ${quote.days > 1 ? 'jours' : 'jour'}`, value: m(quote.loyer) },
    { label: 'Frais de service Rota', value: m(quote.serviceFeeBuyer) },
    {
      label: quote.showCleaning ? 'Nettoyage par la prêteuse' : 'Nettoyage',
      value: quote.showCleaning ? m(quote.cleaning) : 'À votre charge',
    },
    {
      label: ship ? 'Livraison aller-retour' : 'Remise en main propre',
      value: quote.shippingFree ? 'Offerte' : m(quote.shipping),
    },
  ];

  return {
    days: quote.days,
    ship,
    quote,
    cleaningFee: quote.cleaning,
    deposit: quote.depositHold,
    total: quote.totalDueNow,
    breakdown,
  };
}

export { FEES };
export const OFFER_TIERS = [0.9, 0.85, 0.75];
