import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';

/** A listing as the screens need it: owner joined, storage paths resolved. */
export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  brand: string | null;
  category: string;
  /** Every size the lender offers. A single one means no size picker. */
  sizes: string[];
  occasion: string | null;
  price: number;
  retail: number | null;
  city: string | null;
  rules: string[];
  cleaning: { byLender: boolean; fee: number };
  acceptOffers: boolean;
  minOffer: number | null;
  instantBook: boolean;
  authenticity: 'none' | 'pending' | 'verified' | 'rejected';
  photos: string[];
  video: string | null;
  createdAt: string;
  owner: {
    username: string;
    avatar: string | null;
    certified: boolean;
    identityVerified: boolean;
  };
}

interface OwnerRow {
  username: string;
  avatar_url: string | null;
  certified: boolean;
  identity_status: string;
}

interface ListingRow {
  id: string;
  owner_id: string;
  title: string;
  brand: string | null;
  category: string;
  size: string;
  sizes?: string[] | null;
  occasion: string | null;
  price_per_day: number;
  retail_value: number | null;
  city: string | null;
  rules: string[] | null;
  cleaning_by_lender: boolean;
  cleaning_fee: number;
  accept_offers: boolean;
  min_offer: number | null;
  instant_book: boolean;
  authenticity_status: string;
  photo_paths: string[] | null;
  video_path: string | null;
  created_at: string;
  owner: OwnerRow | OwnerRow[] | null;
}

const SELECT =
  '*, owner:profiles!listings_owner_id_fkey(username, avatar_url, certified, identity_status)';

/** Storage paths live in the row; the listing-media bucket is public. */
function publicUrl(path: string | null | undefined): string | null {
  if (!path || !supabase) return null;
  if (path.startsWith('http')) return path;
  return supabase.storage.from('listing-media').getPublicUrl(path).data.publicUrl;
}

function toListing(row: ListingRow): Listing {
  const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner;
  const sizes = row.sizes?.length ? row.sizes : row.size ? [row.size] : [];
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    brand: row.brand,
    category: row.category,
    sizes,
    occasion: row.occasion,
    price: row.price_per_day,
    retail: row.retail_value,
    city: row.city,
    rules: row.rules ?? [],
    cleaning: { byLender: row.cleaning_by_lender, fee: row.cleaning_fee },
    acceptOffers: row.accept_offers,
    minOffer: row.min_offer,
    instantBook: row.instant_book,
    authenticity: (row.authenticity_status as Listing['authenticity']) ?? 'none',
    photos: (row.photo_paths ?? []).map(publicUrl).filter((u): u is string => !!u),
    video: publicUrl(row.video_path),
    createdAt: row.created_at,
    owner: {
      username: owner?.username ?? 'membre',
      avatar: owner?.avatar_url ?? null,
      certified: owner?.certified ?? false,
      identityVerified: owner?.identity_status === 'verified',
    },
  };
}

interface ListingsValue {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  byId: (id: string | null) => Listing | null;
}

const ListingsContext = createContext<ListingsValue | null>(null);

/** Loads every active listing once and shares it with all screens. */
export function ListingsProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('listings')
      .select(SELECT)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError) setError(queryError.message);
        else {
          setError(null);
          setListings(((data ?? []) as unknown as ListingRow[]).map(toListing));
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  const byId = useCallback((id: string | null) => listings.find((l) => l.id === id) ?? null, [listings]);

  const value = useMemo<ListingsValue>(
    () => ({ listings, loading, error, refresh, byId }),
    [listings, loading, error, refresh, byId],
  );

  return <ListingsContext.Provider value={value}>{children}</ListingsContext.Provider>;
}

export function useListings(): ListingsValue {
  const ctx = useContext(ListingsContext);
  if (!ctx) throw new Error('useListings must be used inside <ListingsProvider>');
  return ctx;
}

/** The listing currently opened, or null while it loads / if it is gone. */
export function useListing(id: string | null): Listing | null {
  const { byId } = useListings();
  return byId(id);
}

/** The signed-in member's own listings, including paused ones. */
export function useMyListings(ownerId: string | undefined) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!supabase || !ownerId) {
      setListings([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('listings')
      .select(SELECT)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setListings(((data ?? []) as unknown as ListingRow[]).map(toListing));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, tick]);

  return { listings, loading, refresh: useCallback(() => setTick((n) => n + 1), []) };
}
