import { negotiation, pieces, type Piece } from '../data/catalog';
import { FEES, quoteCheckout, type CheckoutQuote } from '../lib/fees';
import { useStore } from './store';

/** The demo calendar sits in September 2026. */
const isoDay = (day: number) => `2026-09-${String(day).padStart(2, '0')}`;

export interface Booking {
  active: Piece;
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
  nego: { nego: boolean; min: number };
}

/** Everything the booking, checkout and detail screens derive from state. */
export function useBooking(): Booking {
  const { state, m } = useStore();
  const active = pieces.find((p) => p.id === state.activeId) ?? pieces[2];
  const [start, end] = state.dates;
  const ship = state.delivery === 'ship';

  const quote = quoteCheckout({
    pricePerDay: active.price,
    startDate: isoDay(start),
    endDate: isoDay(end),
    delivery: state.delivery,
    badge: active.badge,
    cleaningByLender: active.cleaning.byLender,
    cleaningFee: active.cleaning.fee,
    retail: active.retail,
  });

  const breakdown = [
    { label: `${m(active.price)} × ${quote.days} jours`, value: m(quote.loyer) },
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
    active,
    days: quote.days,
    ship,
    quote,
    cleaningFee: quote.cleaning,
    deposit: quote.depositHold,
    total: quote.totalDueNow,
    nego: negotiation[active.id] ?? negotiation.f3,
    breakdown,
  };
}

export { FEES };
export const OFFER_TIERS = [0.9, 0.85, 0.75];
