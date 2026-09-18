/** Product-locked fee helpers (Founding Closet / beta). Not final legal terms. */

import type { Delivery } from './types';

export type DepositTier = 'A' | 'B' | 'C' | 'D';

/**
 * Prototype fee schedule — Founding Closet beta.
 * - Service fee: 10% of loyer, renter-side only (no host commission in MVP UI).
 * - Shipping: €9 if ship and not free-ship / meet.
 * - Deposit: tiers A–D; mid default €150 when retail unknown.
 */
export const FEES = {
  /** Renter-side service fee as fraction of loyer (Founding Closet beta). */
  renterServiceRate: 0.1,
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
  loyer: number;
  serviceFee: number;
  shipping: number;
  shippingLabel: '€9' | 'Offerte';
  shippingFree: boolean;
  cleaning: number;
  showCleaning: boolean;
  deposit: number;
  depositTier: DepositTier;
  /** Amount charged now (loyer + service + ship + cleaning). Deposit is hold only. */
  totalDueNow: number;
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

export function quoteCheckout(input: CheckoutQuoteInput): CheckoutQuote {
  const days = rentalDays(input.startDate, input.endDate);
  const loyer = input.pricePerDay * days;
  const serviceFee = Math.round(loyer * FEES.renterServiceRate * 100) / 100;
  const free = isShippingFree(input.delivery, input.badge);
  const shipping = free || input.delivery === 'meet' ? 0 : FEES.shipping;
  const showCleaning = !!input.cleaningByLender && (input.cleaningFee || 0) > 0;
  const cleaning = showCleaning ? Number(input.cleaningFee) || 0 : 0;
  const { deposit, tier } = depositForRetail(input.retail, loyer);
  const totalDueNow =
    Math.round((loyer + serviceFee + shipping + cleaning) * 100) / 100;

  return {
    days,
    loyer,
    serviceFee,
    shipping,
    shippingLabel: shipping > 0 ? '€9' : 'Offerte',
    shippingFree: shipping === 0,
    cleaning,
    showCleaning,
    deposit,
    depositTier: tier,
    totalDueNow,
  };
}
