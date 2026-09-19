import { FEES, negotiation, pieces, type Piece } from '../data/catalog';
import { useStore } from './store';

export interface Booking {
  active: Piece;
  nights: number;
  ship: boolean;
  rentSubtotal: number;
  /** Charged only when the lender cleans the piece herself. */
  cleaningFee: number;
  total: number;
  breakdown: { label: string; value: string }[];
  nego: { nego: boolean; min: number };
}

/** Everything the booking, checkout and detail screens derive from state. */
export function useBooking(): Booking {
  const { state, m } = useStore();
  const active = pieces.find((p) => p.id === state.activeId) ?? pieces[2];
  const [start, end] = state.dates;
  const nights = Math.max(1, end - start);
  const ship = state.delivery === 'ship';
  const rentSubtotal = active.price * nights;
  const cleaningFee = active.cleaning.byLender ? active.cleaning.fee : 0;
  const total = rentSubtotal + cleaningFee + FEES.cover + (ship ? FEES.shipping : 0);

  const breakdown = [
    { label: `${m(active.price)} × ${nights} jours`, value: m(rentSubtotal) },
    {
      label: cleaningFee ? 'Nettoyage par la prêteuse' : 'Nettoyage',
      value: cleaningFee ? m(cleaningFee) : 'À votre charge',
    },
    { label: 'Protection dommages', value: m(FEES.cover) },
    {
      label: ship ? 'Livraison aller-retour' : 'Remise en main propre',
      value: ship ? m(FEES.shipping) : 'Offert',
    },
  ];

  return {
    active,
    nights,
    ship,
    rentSubtotal,
    cleaningFee,
    total,
    nego: negotiation[active.id] ?? negotiation.f3,
    breakdown,
  };
}

export const OFFER_TIERS = [0.9, 0.85, 0.75];
