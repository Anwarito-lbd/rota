export type Delivery = 'ship' | 'meet';
export type RentalStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
export type MediaKind = 'image' | 'video';

export interface MediaItem {
  url: string;
  kind: MediaKind;
  poster?: string;
}

export interface User {
  id: string;
  email: string;
  handle: string;
  name: string;
  city: string;
  bio?: string;
  avatarUrl?: string;
  certified: boolean;
  foundingCloset: boolean;
  createdAt: string;
}

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  brand: string;
  description: string;
  pricePerDay: number;
  retail: number;
  size: string;
  category: string;
  occasion: string;
  city: string;
  neighborhood: string;
  media: MediaItem[];
  badge?: string;
  wornCount: number;
  rating: number;
  authenticity: 'receipt' | 'tag' | null;
  cleaningByLender: boolean;
  cleaningFee: number;
  rules: string[];
  instantBook: boolean;
  likes: number;
  createdAt: string;
}

export interface Booking {
  id: string;
  listingId: string;
  renterId: string;
  lenderId: string;
  startDate: string;
  endDate: string;
  delivery: Delivery;
  status: RentalStatus;
  totalCents: number;
  depositCents: number;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
}
