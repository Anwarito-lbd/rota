/**
 * Rentals — the protected side of the marketplace.
 *
 * Nothing in here writes money, liability or a decision: the app calls
 * `book_rental` / `confirm_possession` (security-definer functions in migration
 * 002) and Postgres computes and freezes the snapshot. Approved values, claim
 * amounts and payout state are service-role only by design.
 *
 * No payment provider is wired yet. `bookRental` records the consent and the
 * snapshot; the actual off-session charge is the seam marked in Checkout.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadMedia } from '../lib/upload';
import type { MediaItem } from '../state/types';

export type RentalStatus =
  | 'booked'
  | 'in_progress'
  | 'due'
  | 'late'
  | 'non_return_review'
  | 'returned'
  | 'closed'
  | 'cancelled';

export type ConditionPhase = 'pre_handover' | 'post_return';
export type PossessionKind = 'handover' | 'return';
export type ClaimCategory = 'damage' | 'cleaning' | 'late' | 'non_return' | 'other';

export interface Rental {
  id: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  status: RentalStatus;
  startDate: string;
  endDate: string;
  days: number;
  delivery: 'ship' | 'meet';

  rentAmount: number;
  renterServiceFee: number;
  ownerServiceFee: number;
  shippingFee: number;
  cleaningFee: number;
  totalCharged: number;
  ownerPayout: number;

  /** Frozen at checkout — a later listing edit never moves these. */
  approvedValue: number;
  maxLiability: number;
  depositRequired: boolean;
  depositAmount: number;

  lateFeePerDay: number;
  lateFeeCap: number;
  lateFeesCharged: number;
  gracePeriodHours: number;
  claimWindowHours: number;
  nonReturnReviewDays: number;

  policyVersion: string;
  consentVersion: string;
  consentText: string;

  handoverConfirmedAt: string | null;
  returnDueAt: string | null;
  returnConfirmedAt: string | null;
  claimWindowEndsAt: string | null;
  createdAt: string;

  listingTitle: string;
  listingPhoto: string | null;
}

interface RentalRow {
  id: string;
  listing_id: string;
  renter_id: string;
  owner_id: string;
  status: RentalStatus;
  start_date: string;
  end_date: string;
  days: number;
  delivery: 'ship' | 'meet';
  rent_amount: number | string;
  renter_service_fee: number | string;
  owner_service_fee: number | string;
  shipping_fee: number | string;
  cleaning_fee: number | string;
  total_charged: number | string;
  owner_payout_amount: number | string;
  approved_value: number | string;
  max_liability: number | string;
  deposit_required: boolean;
  deposit_amount: number | string;
  late_fee_per_day: number | string;
  late_fee_cap: number | string;
  late_fees_charged: number | string;
  grace_period_hours: number;
  claim_window_hours: number;
  non_return_review_days: number;
  policy_version: string;
  consent_version: string;
  consent_text: string;
  handover_confirmed_at: string | null;
  return_due_at: string | null;
  return_confirmed_at: string | null;
  claim_window_ends_at: string | null;
  created_at: string;
  listing?: { title: string; photo_paths: string[] | null } | { title: string; photo_paths: string[] | null }[] | null;
}

const RENTAL_SELECT = '*, listing:listings!rentals_listing_id_fkey(title, photo_paths)';

const num = (v: number | string | null | undefined) => Number(v ?? 0);

function photoUrl(path: string | undefined): string | null {
  if (!path || !supabase) return null;
  return supabase.storage.from('listing-media').getPublicUrl(path).data.publicUrl;
}

function toRental(row: RentalRow): Rental {
  const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
  return {
    id: row.id,
    listingId: row.listing_id,
    renterId: row.renter_id,
    ownerId: row.owner_id,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    delivery: row.delivery,

    rentAmount: num(row.rent_amount),
    renterServiceFee: num(row.renter_service_fee),
    ownerServiceFee: num(row.owner_service_fee),
    shippingFee: num(row.shipping_fee),
    cleaningFee: num(row.cleaning_fee),
    totalCharged: num(row.total_charged),
    ownerPayout: num(row.owner_payout_amount),

    approvedValue: num(row.approved_value),
    maxLiability: num(row.max_liability),
    depositRequired: row.deposit_required,
    depositAmount: num(row.deposit_amount),

    lateFeePerDay: num(row.late_fee_per_day),
    lateFeeCap: num(row.late_fee_cap),
    lateFeesCharged: num(row.late_fees_charged),
    gracePeriodHours: row.grace_period_hours,
    claimWindowHours: row.claim_window_hours,
    nonReturnReviewDays: row.non_return_review_days,

    policyVersion: row.policy_version,
    consentVersion: row.consent_version,
    consentText: row.consent_text,

    handoverConfirmedAt: row.handover_confirmed_at,
    returnDueAt: row.return_due_at,
    returnConfirmedAt: row.return_confirmed_at,
    claimWindowEndsAt: row.claim_window_ends_at,
    createdAt: row.created_at,

    listingTitle: listing?.title ?? 'Pièce',
    listingPhoto: photoUrl(listing?.photo_paths?.[0]),
  };
}

function client() {
  if (!supabase) throw new Error('Le serveur n’est pas configuré.');
  return supabase;
}

/**
 * Books a rental. Postgres computes the money, the approved value, the maximum
 * liability and the hold decision, then freezes them onto the row with the
 * policy and consent versions.
 */
export async function bookRental(args: {
  listingId: string;
  startDate: string;
  endDate: string;
  delivery: 'ship' | 'meet';
  consentText: string;
  methodLabel?: string | null;
}): Promise<Rental> {
  const { data, error } = await client().rpc('book_rental', {
    p_listing: args.listingId,
    p_start: args.startDate,
    p_end: args.endDate,
    p_delivery: args.delivery,
    p_consent_text: args.consentText,
    p_method_label: args.methodLabel ?? null,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as RentalRow | null;
  if (!row) throw new Error('La réservation n’a pas abouti.');
  return toRental(row);
}

/** Handover or return, confirmed with the one-time code held by the other party. */
export async function confirmPossession(
  rentalId: string,
  kind: PossessionKind,
  code: string,
): Promise<Rental> {
  const { data, error } = await client().rpc('confirm_possession', {
    p_rental: rentalId,
    p_kind: kind,
    p_code: code,
    p_method: 'pin',
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as RentalRow | null;
  if (!row) throw new Error('Confirmation impossible.');
  return toRental(row);
}

/** Timestamped condition photos. Kept deliberately small: shoot and go. */
export async function addConditionReport(args: {
  rentalId: string;
  userId: string;
  phase: ConditionPhase;
  items: MediaItem[];
  note?: string;
}): Promise<void> {
  if (args.items.length === 0) throw new Error('Ajoutez au moins une photo.');
  const paths: string[] = [];
  for (const item of args.items) {
    paths.push(await uploadMedia('rental-evidence', args.userId, item, args.rentalId));
  }
  const { error } = await client().from('condition_reports').insert({
    rental_id: args.rentalId,
    author_id: args.userId,
    phase: args.phase,
    photo_paths: paths,
    note: args.note ?? null,
    captured_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export interface Claim {
  id: string;
  rentalId: string;
  ownerId: string;
  renterId: string;
  category: ClaimCategory;
  description: string;
  requestedAmount: number;
  approvedAmount: number | null;
  status: string;
  renterResponse: string | null;
  createdAt: string;
}

interface ClaimRow {
  id: string;
  rental_id: string;
  owner_id: string;
  renter_id: string;
  category: ClaimCategory;
  description: string;
  requested_amount: number | string;
  approved_amount: number | string | null;
  status: string;
  renter_response: string | null;
  created_at: string;
}

const toClaim = (row: ClaimRow): Claim => ({
  id: row.id,
  rentalId: row.rental_id,
  ownerId: row.owner_id,
  renterId: row.renter_id,
  category: row.category,
  description: row.description,
  requestedAmount: num(row.requested_amount),
  approvedAmount: row.approved_amount === null ? null : num(row.approved_amount),
  status: row.status,
  renterResponse: row.renter_response,
  createdAt: row.created_at,
});

/**
 * The owner opens a claim. They never decide it: the database refuses to take a
 * status or an approved amount from a member, and caps what can be asked for at
 * the liability snapshotted on the rental.
 */
export async function submitClaim(args: {
  rental: Rental;
  userId: string;
  category: ClaimCategory;
  description: string;
  requestedAmount: number;
  evidence: MediaItem[];
}): Promise<void> {
  const paths: string[] = [];
  for (const item of args.evidence) {
    paths.push(await uploadMedia('rental-evidence', args.userId, item, args.rental.id));
  }
  const { error } = await client().from('claims').insert({
    rental_id: args.rental.id,
    owner_id: args.rental.ownerId,
    renter_id: args.rental.renterId,
    category: args.category,
    description: args.description,
    evidence_paths: paths,
    requested_amount: args.requestedAmount,
  });
  if (error) throw new Error(error.message);
}

/** The renter's side of the story, before Rota reviews. */
export async function respondToClaim(claimId: string, response: string): Promise<void> {
  const { error } = await client()
    .from('claims')
    .update({ renter_response: response, renter_responded_at: new Date().toISOString() })
    .eq('id', claimId);
  if (error) throw new Error(error.message);
}

/** Every rental this member is part of, newest first. */
export function useMyRentals(userId: string | undefined) {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!supabase || !userId) {
      setRentals([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('rentals')
      .select(RENTAL_SELECT)
      .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError) setError(queryError.message);
        else {
          setError(null);
          setRentals(((data ?? []) as unknown as RentalRow[]).map(toRental));
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  return { rentals, loading, error, refresh: useCallback(() => setTick((n) => n + 1), []) };
}

/**
 * The one-time code, when this member is the one who must SHOW it. The other
 * party types it in; RLS means they cannot read it.
 */
export function usePossessionCode(rentalId: string | null, kind: PossessionKind) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !rentalId) {
      setCode(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('possession_codes')
      .select('code')
      .eq('rental_id', rentalId)
      .eq('kind', kind)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setCode((data as { code: string } | null)?.code ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rentalId, kind]);

  // `code` is null for the party who must TYPE it in — RLS hides the row from
  // them — so the caller must wait for `loading` before choosing a side.
  return { code, loading };
}

/** Claims on one rental, for both sides to read. */
export function useClaims(rentalId: string | null) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!supabase || !rentalId) {
      setClaims([]);
      return;
    }
    let cancelled = false;
    supabase
      .from('claims')
      .select('*')
      .eq('rental_id', rentalId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setClaims(((data ?? []) as unknown as ClaimRow[]).map(toClaim));
      });
    return () => {
      cancelled = true;
    };
  }, [rentalId, tick]);

  return { claims, refresh: useCallback(() => setTick((n) => n + 1), []) };
}

/** True while this member has never completed a rental (first-rental cap). */
export function useFirstRental(userId: string | undefined) {
  const [first, setFirst] = useState(true);

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;
    supabase
      .from('rentals')
      .select('id')
      .eq('renter_id', userId)
      .in('status', ['returned', 'closed'])
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) setFirst((data ?? []).length === 0);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return first;
}

/** Condition reports already filed for a rental, by phase. */
export function useConditionReports(rentalId: string | null) {
  const [phases, setPhases] = useState<ConditionPhase[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!supabase || !rentalId) {
      setPhases([]);
      return;
    }
    let cancelled = false;
    supabase
      .from('condition_reports')
      .select('phase')
      .eq('rental_id', rentalId)
      .then(({ data }) => {
        if (!cancelled) setPhases(((data ?? []) as { phase: ConditionPhase }[]).map((r) => r.phase));
      });
    return () => {
      cancelled = true;
    };
  }, [rentalId, tick]);

  return { phases, refresh: useCallback(() => setTick((n) => n + 1), []) };
}
