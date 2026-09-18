import type { Listing, User } from '@rota/shared';
import { quoteCheckout } from '@rota/shared';
import { API_URL } from './config';
import {
  initLocalDb,
  listingsByOwner,
  localBookings,
  localListing,
  localListings,
  localUser,
  localUserByHandle,
  saveLocalBooking,
  saveLocalListing,
} from './localDb';
import { sessionStore } from './storage';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await sessionStore.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function tryFetch(path: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    };
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    });
    clearTimeout(t);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

export const api = {
  async health() {
    try {
      return await tryFetch('/health');
    } catch {
      return { ok: false, offline: true };
    }
  },

  async signup(body: { email: string; password: string; name: string; handle: string }) {
    try {
      const data = await tryFetch('/auth/signup', { method: 'POST', body: JSON.stringify(body) });
      await sessionStore.save(data.token, JSON.stringify(data.user));
      return data as { token: string; user: User };
    } catch {
      // Offline/local auth stub
      const user: User = {
        id: `local_${Date.now()}`,
        email: body.email,
        handle: body.handle.replace(/^@/, ''),
        name: body.name,
        city: 'Paris',
        certified: false,
        foundingCloset: false,
        createdAt: new Date().toISOString(),
      };
      const token = `local_${user.id}`;
      await sessionStore.save(token, JSON.stringify(user));
      return { token, user };
    }
  },

  async login(email: string, password: string) {
    try {
      const data = await tryFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await sessionStore.save(data.token, JSON.stringify(data.user));
      return data as { token: string; user: User };
    } catch {
      // Demo offline login
      if (email === 'demo@rota.app' && password === 'rota1234') {
        await initLocalDb();
        const user = (await localUser('u_demo'))!;
        const token = 'local_demo';
        await sessionStore.save(token, JSON.stringify(user));
        return { token, user };
      }
      throw new Error('Identifiants invalides (hors-ligne : demo@rota.app / rota1234)');
    }
  },

  async magicLink(email: string) {
    try {
      const data = await tryFetch('/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      await sessionStore.save(data.token, JSON.stringify(data.user));
      return data as { token: string; user: User };
    } catch {
      const handle = email.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'member';
      const user: User = {
        id: `magic_${Date.now()}`,
        email,
        handle,
        name: handle,
        city: 'Paris',
        certified: false,
        foundingCloset: false,
        createdAt: new Date().toISOString(),
      };
      const token = `local_${user.id}`;
      await sessionStore.save(token, JSON.stringify(user));
      return { token, user };
    }
  },

  async me() {
    try {
      const data = await tryFetch('/auth/me');
      return data.user as User;
    } catch {
      return (await sessionStore.getUser()) as User | null;
    }
  },

  async logout() {
    try {
      await tryFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    await sessionStore.clear();
  },

  async listings(params?: { q?: string; category?: string; occasion?: string }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.category) qs.set('category', params.category);
    if (params?.occasion) qs.set('occasion', params.occasion);
    try {
      const data = await tryFetch(`/listings?${qs}`);
      return data.listings as Listing[];
    } catch {
      return localListings(params);
    }
  },

  async listing(id: string) {
    try {
      const data = await tryFetch(`/listings/${id}`);
      return data.listing as Listing & { owner?: Partial<User> };
    } catch {
      const listing = await localListing(id);
      if (!listing) throw new Error('Pièce introuvable');
      const owner = await localUser(listing.ownerId);
      return { ...listing, owner: owner || undefined };
    }
  },

  async createListing(body: Partial<Listing>) {
    try {
      const data = await tryFetch('/listings', { method: 'POST', body: JSON.stringify(body) });
      return data.listing as Listing;
    } catch {
      const user = (await sessionStore.getUser()) as User;
      const listing: Listing = {
        id: `local_f_${Date.now()}`,
        ownerId: user.id,
        title: body.title || 'Nouvelle pièce',
        brand: body.brand || 'Marque',
        description: body.description || '',
        pricePerDay: body.pricePerDay || 20,
        retail: body.retail || 200,
        size: body.size || 'M',
        category: body.category || 'Robes',
        occasion: body.occasion || 'Tous les jours',
        city: 'Paris',
        neighborhood: body.neighborhood || 'Paris',
        media: body.media || [
          {
            url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
            kind: 'image',
          },
        ],
        wornCount: 0,
        rating: 5,
        authenticity: null,
        cleaningByLender: !!body.cleaningByLender,
        cleaningFee: body.cleaningFee || 0,
        rules: body.rules || ['Retour propre'],
        instantBook: true,
        likes: 0,
        createdAt: new Date().toISOString(),
      };
      await saveLocalListing(listing);
      return listing;
    }
  },

  async book(input: {
    listingId: string;
    startDate: string;
    endDate: string;
    delivery: 'ship' | 'meet';
  }) {
    try {
      return await tryFetch('/bookings', { method: 'POST', body: JSON.stringify(input) });
    } catch {
      const user = (await sessionStore.getUser()) as User;
      const listing = await localListing(input.listingId);
      if (!listing) throw new Error('Pièce introuvable');
      const quote = quoteCheckout({
        pricePerDay: listing.pricePerDay,
        startDate: input.startDate,
        endDate: input.endDate,
        delivery: input.delivery,
        badge: listing.badge,
        cleaningByLender: listing.cleaningByLender,
        cleaningFee: listing.cleaningFee,
        retail: listing.retail,
      });
      const totalCents = Math.round(quote.totalDueNow * 100);
      const depositCents = Math.round(quote.deposit * 100);
      const booking = {
        id: `local_b_${Date.now()}`,
        listingId: listing.id,
        renterId: user.id,
        lenderId: listing.ownerId,
        startDate: input.startDate,
        endDate: input.endDate,
        delivery: input.delivery,
        status: 'confirmed',
        totalCents,
        depositCents,
        createdAt: new Date().toISOString(),
        listingTitle: listing.title,
        listingMedia: listing.media,
      };
      await saveLocalBooking(booking);
      return {
        booking,
        checkout: {
          mode: 'stripe_test_stub',
          clientSecret: `pi_test_${booking.id}_secret`,
          amountCents: totalCents,
          depositCents,
          currency: 'eur',
          quote,
        },
      };
    }
  },

  async bookings(tab: 'renting' | 'lending' = 'renting') {
    try {
      const data = await tryFetch(`/bookings?tab=${tab}`);
      return data.bookings as any[];
    } catch {
      const user = (await sessionStore.getUser()) as User;
      const all = await localBookings();
      return all.filter((b) => (tab === 'lending' ? b.lenderId === user.id : b.renterId === user.id));
    }
  },

  async closet() {
    try {
      const data = await tryFetch('/closet');
      return data.listings as Listing[];
    } catch {
      const user = (await sessionStore.getUser()) as User;
      return listingsByOwner(user.id);
    }
  },

  async confirmCheckout(bookingId: string) {
    try {
      return await tryFetch('/checkout/confirm', {
        method: 'POST',
        body: JSON.stringify({ bookingId }),
      });
    } catch {
      return { ok: true, status: 'succeeded', paymentIntentId: `pi_test_${bookingId}` };
    }
  },

  async referral() {
    try {
      return await tryFetch('/referral');
    } catch {
      const user = (await sessionStore.getUser()) as User;
      return {
        code: `ROTA-${user.handle.toUpperCase().slice(0, 8)}`,
        shareUrl: `https://rota.app/u/${user.handle}`,
        foundingCloset: user.foundingCloset,
        rewardEur: 15,
        message: user.foundingCloset
          ? 'Badge Closet fondateur actif — invitez 3 amies à Paris.'
          : 'Parrainez des closets à Paris.',
      };
    }
  },

  async profile(handle: string) {
    try {
      return await tryFetch(`/users/${handle}`);
    } catch {
      const user = await localUserByHandle(handle);
      if (!user) throw new Error('Profil introuvable');
      const listings = await listingsByOwner(user.id);
      return { user, listings };
    }
  },
};
