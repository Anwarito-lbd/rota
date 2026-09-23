/** Product-locked fee helpers (Founding Closet / beta). Not final legal terms. */

import type { Delivery } from '../state/types';

export type DepositTier = 'A' | 'B' | 'C' | 'D';

/**
 * Prototype fee schedule — Founding Closet beta.
 * - Two-sided 10%: buyer pays loyer + 10%; lender receives loyer − 10%.
 * - Platform keeps ~20% of loyer (buyer fee + lender fee) before delivery.
 * - Shipping: €9 if ship and not free-ship / meet.
 * - Deposit: tiers A–D; mid default €150 when retail unknown.
 */
export const FEES = {
  /** Buyer (locataire) service fee as fraction of loyer (surcharge). */
  renterServiceRate: 0.1,
  /** Lender (prêteur) service fee as fraction of loyer (deducted from payout). */
  lenderServiceRate: 0.1,
  shipping: 9,
  /** Mid default when retail unknown / fallback. */
  deposit: 150,
  latePerDay: 20,
} as const;

export type CheckoutQuoteInput = {
  pricePerDay: number;
  startDate: string;
  endDate: string;
  delivery: Delivery;
  /** Listing badge — free ship if contains "livraison offerte" (case-insensitive). */
  badge?: string | null;
  cleaningByLender?: boolean;
  cleaningFee?: number;
  /** Estimated retail value V for deposit tiers. */
  retail?: number | null;
};

export type CheckoutQuote = {
  days: number;
  /** Gross rental fee (pricePerDay × days). */
  loyer: number;
  /** Buyer surcharge: 10% of loyer. */
  serviceFeeBuyer: number;
  /** Lender deduction: 10% of loyer. */
  serviceFeeLender: number;
  /**
   * @deprecated Prefer serviceFeeBuyer — kept for older call sites.
   * Same as serviceFeeBuyer.
   */
  serviceFee: number;
  shipping: number;
  shippingLabel: '€9' | 'Offerte';
  shippingFree: boolean;
  cleaning: number;
  showCleaning: boolean;
  /** Caution hold amount (not charged now). */
  depositHold: number;
  /** @deprecated Prefer depositHold — same value. */
  deposit: number;
  depositTier: DepositTier;
  /** Amount charged now to buyer (loyer + buyer fee + ship + cleaning). Deposit is hold only. */
  totalDueNow: number;
  /** Net payout to lender (loyer − lender fee). Cleaning paid separately if applicable. */
  ownerPayout: number;
};

export function rentalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
}

/** True when ship is free (meet) or owner offers free shipping. */
export function isShippingFree(delivery: Delivery, badge?: string | null): boolean {
  if (delivery === 'meet') return true;
  return String(badge || '')
    .toLowerCase()
    .includes('livraison offerte');
}

/**
 * Deposit tiers A–D (docs/legal/04):
 * A: V < 150 → max(R, 25)
 * B: 150 ≤ V ≤ 500 → max(1.5×R, 0.4×V)
 * C: 500 < V ≤ 2000 → min(0.6×V, V)
 * D: V > 2000 → 0.9×V (mid of 80–100%), manual review later
 * Fallback: FEES.deposit (€150) when retail missing/0.
 */
export function depositForRetail(retail: number | null | undefined, loyer: number): {
  deposit: number;
  tier: DepositTier;
} {
  const R = Math.max(0, loyer);
  const V = Number(retail);
  if (!Number.isFinite(V) || V <= 0) {
    return { deposit: FEES.deposit, tier: 'B' };
  }
  if (V < 150) {
    return { deposit: Math.round(Math.max(R, 25)), tier: 'A' };
  }
  if (V <= 500) {
    return { deposit: Math.round(Math.max(1.5 * R, 0.4 * V)), tier: 'B' };
  }
  if (V <= 2000) {
    return { deposit: Math.round(Math.min(0.6 * V, V)), tier: 'C' };
  }
  return { deposit: Math.round(0.9 * V), tier: 'D' };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function quoteCheckout(input: CheckoutQuoteInput): CheckoutQuote {
  const days = rentalDays(input.startDate, input.endDate);
  const loyer = input.pricePerDay * days;
  const serviceFeeBuyer = roundMoney(loyer * FEES.renterServiceRate);
  const serviceFeeLender = roundMoney(loyer * FEES.lenderServiceRate);
  const ownerPayout = roundMoney(loyer - serviceFeeLender);
  const free = isShippingFree(input.delivery, input.badge);
  const shipping = free || input.delivery === 'meet' ? 0 : FEES.shipping;
  const showCleaning = !!input.cleaningByLender && (input.cleaningFee || 0) > 0;
  const cleaning = showCleaning ? Number(input.cleaningFee) || 0 : 0;
  const { deposit, tier } = depositForRetail(input.retail, loyer);
  const totalDueNow = roundMoney(loyer + serviceFeeBuyer + shipping + cleaning);

  return {
    days,
    loyer,
    serviceFeeBuyer,
    serviceFeeLender,
    serviceFee: serviceFeeBuyer,
    shipping,
    shippingLabel: shipping > 0 ? '€9' : 'Offerte',
    shippingFree: shipping === 0,
    cleaning,
    showCleaning,
    depositHold: deposit,
    deposit,
    depositTier: tier,
    totalDueNow,
    ownerPayout,
  };
}
