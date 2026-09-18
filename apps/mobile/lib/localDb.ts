/**
 * Web local catalog — in-memory (no ExpoSQLite on web).
 */
import { SEED_LISTINGS, SEED_USERS, type Listing, type User } from '@rota/shared';

const listings = new Map<string, Listing>();
const users = new Map<string, User>();
const bookings = new Map<string, unknown>();
let ready = false;

export async function getDb() {
  return null;
}

export async function initLocalDb() {
  if (ready) return;
  const now = new Date().toISOString();
  for (const u of SEED_USERS) users.set(u.id, u);
  for (const l of SEED_LISTINGS) listings.set(l.id, { ...l, createdAt: now });
  ready = true;
}

export async function localListings(filters?: {
  q?: string;
  category?: string;
  occasion?: string;
}): Promise<Listing[]> {
  await initLocalDb();
  let list = [...listings.values()];
  const q = filters?.q?.toLowerCase().trim();
  if (q) {
    list = list.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.brand.toLowerCase().includes(q) ||
        l.neighborhood.toLowerCase().includes(q),
    );
  }
  if (filters?.category) list = list.filter((l) => l.category === filters.category);
  if (filters?.occasion) list = list.filter((l) => l.occasion === filters.occasion);
  return list.sort((a, b) => b.likes - a.likes);
}

export async function localListing(id: string): Promise<Listing | null> {
  await initLocalDb();
  return listings.get(id) ?? null;
}

export async function localUser(id: string): Promise<User | null> {
  await initLocalDb();
  return users.get(id) ?? null;
}

export async function localUserByHandle(handle: string): Promise<User | null> {
  await initLocalDb();
  const h = handle.replace(/^@/, '');
  return [...users.values()].find((u) => u.handle === h) ?? null;
}

export async function saveLocalListing(listing: Listing) {
  await initLocalDb();
  listings.set(listing.id, listing);
}

export async function saveLocalBooking(booking: unknown) {
  await initLocalDb();
  const b = booking as { id: string };
  bookings.set(b.id, booking);
}

export async function localBookings(): Promise<any[]> {
  await initLocalDb();
  return [...bookings.values()];
}

export async function listingsByOwner(ownerId: string): Promise<Listing[]> {
  const all = await localListings();
  return all.filter((l) => l.ownerId === ownerId);
}
