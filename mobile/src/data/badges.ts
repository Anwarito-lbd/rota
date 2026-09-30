/** The Pro crown and the verified-shop badge, read from a profile row (migration 028). */

export interface BadgeCols {
  pro_until?: string | null;
  account_type?: string | null;
  business_verified?: boolean | null;
  business_name?: string | null;
}

export interface Badges {
  /** Rota Pro member: a crown next to the name. */
  pro?: boolean;
  /** A shop whose SIRET the company register confirmed. */
  business?: boolean;
  businessName?: string | null;
}

/** Profile columns to select wherever a name is shown. */
export const BADGE_COLUMNS = 'pro_until, account_type, business_verified, business_name';

export function badgesFrom(p: BadgeCols | null | undefined): Badges {
  return {
    pro: !!p?.pro_until && Date.parse(p.pro_until) > Date.now(),
    business: p?.account_type === 'business' && !!p?.business_verified,
    businessName: p?.account_type === 'business' ? (p?.business_name ?? null) : null,
  };
}
