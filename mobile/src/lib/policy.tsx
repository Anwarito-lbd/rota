/**
 * Trust & Protection policy numbers.
 *
 * These are PROPOSED business defaults, not settled legal terms. Nothing here
 * is hard-coded into a screen: the values below are only the fallback used
 * before the `policy_config` table answers (migration 002), and the table is
 * what an admin edits. Counsel and the payment provider must review the
 * amounts, the liability caps and the consent wording before launch.
 *
 * Amounts are in EUR — the strategy document quoted dollars, which we treat as
 * configurable numbers rather than literal copy.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from './supabase';

export interface Policy {
  /** Stamped onto every rental so a later policy change cannot rewrite it. */
  policyVersion: string;
  consentVersion: string;

  renterServiceRate: number;
  ownerServiceRate: number;
  shippingFee: number;

  /** A first-time renter above this approved value triggers a hold. */
  firstRentalArvCap: number;
  /** Launch ceiling on an approved replacement value. */
  highValueCap: number;
  /** Approved value above which a hold is asked for, whoever the renter is. */
  highValueHoldThreshold: number;
  holdRate: number;
  holdMax: number;

  gracePeriodHours: number;
  lateFeePerDayRate: number;
  lateFeeMinPerDay: number;
  lateFeeCapRate: number;
  lateFeeCapMax: number;
  nonReturnReviewDays: number;
  ownerClaimWindowHours: number;
  trustedOwnerCleanRentals: number;

  /** P1 — kept off until real transaction and claim data exists. */
  flagIdStepUp: boolean;
  flagTrustTiers: boolean;
  flagRiskScoring: boolean;
}

/** Mirrors the seed rows in supabase/migrations/002_trust_protection.sql. */
export const DEFAULT_POLICY: Policy = {
  policyVersion: '2026-09-p0',
  consentVersion: '2026-09-p0',

  renterServiceRate: 0.1,
  ownerServiceRate: 0.1,
  shippingFee: 9,

  firstRentalArvCap: 150,
  highValueCap: 900,
  highValueHoldThreshold: 400,
  holdRate: 0.2,
  holdMax: 250,

  gracePeriodHours: 24,
  lateFeePerDayRate: 0.15,
  lateFeeMinPerDay: 5,
  lateFeeCapRate: 0.5,
  lateFeeCapMax: 150,
  nonReturnReviewDays: 7,
  ownerClaimWindowHours: 24,
  trustedOwnerCleanRentals: 5,

  flagIdStepUp: false,
  flagTrustTiers: false,
  flagRiskScoring: false,
};

/** policy_config.key → Policy field. Anything unknown is ignored. */
const KEYS: Record<string, keyof Policy> = {
  policy_version: 'policyVersion',
  consent_version: 'consentVersion',
  renter_service_rate: 'renterServiceRate',
  owner_service_rate: 'ownerServiceRate',
  shipping_fee: 'shippingFee',
  first_rental_arv_cap: 'firstRentalArvCap',
  high_value_cap: 'highValueCap',
  high_value_hold_threshold: 'highValueHoldThreshold',
  hold_rate: 'holdRate',
  hold_max: 'holdMax',
  grace_period_hours: 'gracePeriodHours',
  late_fee_per_day_rate: 'lateFeePerDayRate',
  late_fee_min_per_day: 'lateFeeMinPerDay',
  late_fee_cap_rate: 'lateFeeCapRate',
  late_fee_cap_max: 'lateFeeCapMax',
  non_return_review_days: 'nonReturnReviewDays',
  owner_claim_window_hours: 'ownerClaimWindowHours',
  trusted_owner_clean_rentals: 'trustedOwnerCleanRentals',
  flag_id_step_up: 'flagIdStepUp',
  flag_trust_tiers: 'flagTrustTiers',
  flag_risk_scoring: 'flagRiskScoring',
};

type ConfigRow = { key: string; value: unknown };

function merge(rows: ConfigRow[]): Policy {
  const next: Policy = { ...DEFAULT_POLICY };
  for (const row of rows) {
    const field = KEYS[row.key];
    if (!field) continue;
    const fallback = DEFAULT_POLICY[field];
    if (typeof fallback === 'number' && typeof row.value === 'number') {
      (next[field] as number) = row.value;
    } else if (typeof fallback === 'boolean' && typeof row.value === 'boolean') {
      (next[field] as boolean) = row.value;
    } else if (typeof fallback === 'string' && typeof row.value === 'string') {
      (next[field] as string) = row.value;
    }
  }
  return next;
}

const PolicyContext = createContext<Policy>(DEFAULT_POLICY);

/** Loads the live policy numbers once; falls back to the defaults offline. */
export function PolicyProvider({ children }: { children: ReactNode }) {
  const [policy, setPolicy] = useState<Policy>(DEFAULT_POLICY);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from('policy_config')
      .select('key, value')
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setPolicy(merge(data as ConfigRow[]));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => policy, [policy]);
  return <PolicyContext.Provider value={value}>{children}</PolicyContext.Provider>;
}

export function usePolicy(): Policy {
  return useContext(PolicyContext);
}
