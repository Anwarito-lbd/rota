/**
 * The money engine. Product-locked for the beta, not final legal terms.
 *
 * Trust & Protection (P0): rentals are DEPOSIT-FREE by default. A hold only
 * appears when a risk rule asks for one (a high approved value, or a first-time
 * renter above the first-rental cap) — never as a blanket charge on everyone.
 * Every ceiling comes from `Policy` (lib/policy), which the server owns.
 */

import { DEFAULT_POLICY, type Policy } from './policy';
import type { Delivery } from '../state/types';

/**
 * Compatibility shim for the copy screens that only need the headline rates.
 * Anything policy-driven should read `usePolicy()` instead.
 */
export const FEES = {
  /** Renter surcharge as a fraction of the rent. */
  renterServiceRate: DEFAULT_POLICY.renterServiceRate,
  /** Deducted from the owner payout. */
  lenderServiceRate: DEFAULT_POLICY.ownerServiceRate,
  shipping: DEFAULT_POLICY.shippingFee,
} as const;

export type HoldReason =
  | 'deposit_free_default'
  | 'high_value_item'
  | 'first_rental_above_cap';

export interface HoldDecision {
  /** False for a normal rental — this is the whole point of the strategy. */
  required: boolean;
  /** 0 unless a rule asked for a hold. Never charged upfront. */
  amount: number;
  reason: HoldReason;
}

export type CheckoutQuoteInput = {
  pricePerDay: number;
  startDate: string;
  endDate: string;
  delivery: Delivery;
  /** Listing badge — free ship if it contains "livraison offerte". */
  badge?: string | null;
  cleaningByLender?: boolean;
  cleaningFee?: number;
  /** Rota's approved replacement value for the piece (not the owner's price). */
  approvedValue?: number | null;
  /** Renter has never completed a rental — the first-rental cap applies. */
  firstRental?: boolean;
  policy?: Policy;
};

export interface CheckoutQuote {
  days: number;
  /** Gross rental fee (pricePerDay × days). */
  loyer: number;
  /** Renter surcharge. */
  serviceFeeBuyer: number;
  /** Owner deduction. */
  serviceFeeLender: number;
  shipping: number;
  shippingFree: boolean;
  cleaning: number;
  showCleaning: boolean;
  /** Approved replacement value used for this quote, capped by policy. */
  approvedValue: number;
  /** The renter can never owe more than this for the item itself. */
  maxLiability: number;
  hold: HoldDecision;
  lateFeePerDay: number;
  lateFeeCap: number;
  /** Charged now: rent + renter fee + shipping + cleaning. */
  totalDueNow: number;
  /** Net payout to the owner, released only after a confirmed return. */
  ownerPayout: number;
}

export function rentalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
}

/** True when handover is in person or the owner offers free shipping. */
export function isShippingFree(delivery: Delivery, badge?: string | null): boolean {
  if (delivery === 'meet') return true;
  return String(badge || '')
    .toLowerCase()
    .includes('livraison offerte');
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The approved value as it may be used today, clamped by the launch cap. */
export function cappedApprovedValue(
  approvedValue: number | null | undefined,
  policy: Policy = DEFAULT_POLICY,
): number {
  const v = Number(approvedValue);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(Math.round(v), policy.highValueCap);
}

/**
 * Maximum item liability for a rental. The renter's exposure for the piece can
 * never exceed the approved value shown at booking — this number is snapshotted
 * onto the rental and every later charge is measured against that copy.
 */
export function maxLiabilityFor(
  approvedValue: number | null | undefined,
  policy: Policy = DEFAULT_POLICY,
): number {
  return cappedApprovedValue(approvedValue, policy);
}

/**
 * Risk-triggered hold. Returns `required: false` for the ordinary rental, which
 * is the default path: no deposit, nothing blocked on the card.
 */
export function holdDecision(
  approvedValue: number | null | undefined,
  options: { firstRental?: boolean; policy?: Policy } = {},
): HoldDecision {
  const policy = options.policy ?? DEFAULT_POLICY;
  const value = cappedApprovedValue(approvedValue, policy);

  const high = value > policy.highValueHoldThreshold;
  const firstAbove = !!options.firstRental && value > policy.firstRentalArvCap;
  if (!high && !firstAbove) {
    return { required: false, amount: 0, reason: 'deposit_free_default' };
  }

  return {
    required: true,
    amount: roundMoney(Math.min(value * policy.holdRate, policy.holdMax)),
    reason: high ? 'high_value_item' : 'first_rental_above_cap',
  };
}

/** Daily late fee and the ceiling it stops at. Both are snapshotted. */
export function lateFeeSchedule(
  pricePerDay: number,
  approvedValue: number | null | undefined,
  policy: Policy = DEFAULT_POLICY,
): { perDay: number; cap: number } {
  const value = cappedApprovedValue(approvedValue, policy);
  return {
    perDay: roundMoney(
      Math.max(pricePerDay * policy.lateFeePerDayRate, policy.lateFeeMinPerDay),
    ),
    cap: roundMoney(Math.min(value * policy.lateFeeCapRate, policy.lateFeeCapMax)),
  };
}

export type ReturnState = 'on_time' | 'due' | 'grace' | 'late' | 'non_return_review';

/**
 * Where a rental sits on the return timeline, and what it has accrued.
 * Mirrors `public.rental_lifecycle_tick()` in migration 002 — the server owns
 * the real accrual; this is what the screens read so both agree.
 */
export function returnStatus(args: {
  returnDueAt: string | null;
  returnedAt?: string | null;
  now?: Date;
  perDay: number;
  cap: number;
  gracePeriodHours?: number;
  nonReturnReviewDays?: number;
  policy?: Policy;
}): { state: ReturnState; hoursLeft: number; daysLate: number; lateFee: number } {
  const policy = args.policy ?? DEFAULT_POLICY;
  const grace = args.gracePeriodHours ?? policy.gracePeriodHours;
  const reviewAfter = args.nonReturnReviewDays ?? policy.nonReturnReviewDays;

  if (!args.returnDueAt || args.returnedAt) {
    return { state: 'on_time', hoursLeft: 0, daysLate: 0, lateFee: 0 };
  }
  const now = (args.now ?? new Date()).getTime();
  const due = new Date(args.returnDueAt).getTime();
  const hours = (now - due) / 3600000;

  if (hours <= 0) {
    return { state: hours > -24 ? 'due' : 'on_time', hoursLeft: -hours, daysLate: 0, lateFee: 0 };
  }
  if (hours <= grace) {
    return { state: 'grace', hoursLeft: grace - hours, daysLate: 0, lateFee: 0 };
  }
  const daysLate = Math.floor(hours / 24);
  return {
    state: daysLate >= reviewAfter ? 'non_return_review' : 'late',
    hoursLeft: 0,
    daysLate,
    lateFee: roundMoney(Math.min(daysLate * args.perDay, args.cap)),
  };
}

/**
 * What a replacement claim may still ask for. Late fees already charged count
 * toward the same exposure, so a renter never pays more than the approved value
 * for one piece.
 */
export function replacementExposure(args: {
  maxLiability: number;
  lateFeesCharged?: number;
  requested?: number;
}): { remaining: number; capped: number } {
  const remaining = Math.max(roundMoney(args.maxLiability - (args.lateFeesCharged ?? 0)), 0);
  const requested = Math.max(args.requested ?? 0, 0);
  return { remaining, capped: roundMoney(Math.min(requested, remaining)) };
}

export function quoteCheckout(input: CheckoutQuoteInput): CheckoutQuote {
  const policy = input.policy ?? DEFAULT_POLICY;
  const days = rentalDays(input.startDate, input.endDate);
  const loyer = input.pricePerDay * days;
  const serviceFeeBuyer = roundMoney(loyer * policy.renterServiceRate);
  const serviceFeeLender = roundMoney(loyer * policy.ownerServiceRate);
  const ownerPayout = roundMoney(loyer - serviceFeeLender);
  const free = isShippingFree(input.delivery, input.badge);
  const shipping = free ? 0 : policy.shippingFee;
  const showCleaning = !!input.cleaningByLender && (input.cleaningFee || 0) > 0;
  const cleaning = showCleaning ? Number(input.cleaningFee) || 0 : 0;

  const approvedValue = cappedApprovedValue(input.approvedValue, policy);
  const late = lateFeeSchedule(input.pricePerDay, approvedValue, policy);

  return {
    days,
    loyer,
    serviceFeeBuyer,
    serviceFeeLender,
    shipping,
    shippingFree: shipping === 0,
    cleaning,
    showCleaning,
    approvedValue,
    maxLiability: maxLiabilityFor(approvedValue, policy),
    hold: holdDecision(approvedValue, { firstRental: input.firstRental, policy }),
    lateFeePerDay: late.perDay,
    lateFeeCap: late.cap,
    totalDueNow: roundMoney(loyer + serviceFeeBuyer + shipping + cleaning),
    ownerPayout,
  };
}
