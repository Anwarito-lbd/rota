export type Screen =
  | 'onboard'
  | 'feed'
  | 'discover'
  | 'search'
  | 'detail'
  | 'booking'
  | 'checkout'
  | 'rentals'
  | 'boards'
  | 'board'
  | 'profile'
  | 'closet'
  | 'list'
  | 'messages'
  | 'notifs'
  | 'reviews'
  | 'claim'
  | 'payouts'
  | 'settings'
  | 'blocked'
  | 'fees'
  | 'safety'
  | 'guidelines'
  | 'wallet'
  | 'payments'
  | 'identity'
  | 'certification'
  | 'security'
  | 'referral'
  | 'promote'
  | 'preferences'
  | 'bundles'
  | 'vacation'
  | 'help';

/**
 * 0 welcome · 'auth' credentials · 'otp' e-mail code · 'twofa' login challenge
 * · 1 guidelines gate · 2 permission priming
 */
export type ObStep = 0 | 1 | 2 | 'auth' | 'otp' | 'twofa';

export type Theme = 'dark' | 'light';
export type Lang = 'fr' | 'en' | 'es';
export type AuthMode = 'signup' | 'login';
export type Delivery = 'ship' | 'meet';
export type FeedTab = 'near' | 'foryou' | 'follow';
export type RentalTab = 'renting' | 'lending';
export type OfferStatus = 'pending' | 'accepted' | 'declined';
export type PermKey = 'camera' | 'microphone' | 'photos' | 'location';

/** Cash is never an option — every rental is captured in-app. */
export type PayMethod = 'applepay' | 'googlepay' | 'paypal' | 'card' | 'wallet';

/** Shared shape for identity checks and certification requests. */
export type ReviewStatus = 'none' | 'pending' | 'verified' | 'rejected';

export type Flags = Record<string, boolean>;

export interface MediaItem {
  /** Local file URI returned by the image picker. */
  uri: string;
  kind: 'image' | 'video';
  name: string;
}

export interface CardDetails {
  last4: string;
  brand: string;
  expiry: string;
}

export interface AppState {
  screen: Screen;
  obStep: ObStep;
  agreed: boolean;
  permOn: Record<PermKey, boolean>;
  signedIn: boolean;
  feedTab: FeedTab;

  authMode: AuthMode | null;
  username: string;
  email: string;
  pw: string;
  authErr: string | null;

  /** Code the demo "sends" by e-mail, and what the user typed back. */
  otpSent: string;
  otpInput: string;
  otpErr: boolean;
  emailVerified: boolean;

  twoFactorOn: boolean;
  twoFactorInput: string;
  twoFactorErr: boolean;

  identityStatus: ReviewStatus;
  identityStep: number;
  identityDoc: 'cni' | 'passport' | 'licence';

  certificationStatus: ReviewStatus;
  /** Accounts this user vouches for — their profiles show a certified mark. */
  certifies: Flags;

  payMethod: PayMethod;
  cards: CardDetails[];
  walletBalance: number;

  activeId: string;
  size: string;
  occasion: string;
  liked: Flags;
  wish: Flags;

  delivery: Delivery;
  dates: [number, number];
  rulesAccepted: boolean;
  rentalTab: RentalTab;
  thread: string | null;

  listStep: number;
  listCat: string;
  listPrice: number;
  /** The lender cleans the piece themselves and charges for it. */
  listLenderCleans: boolean;
  listCleaningFee: number;
  listRules: string[];
  listRuleDraft: string;
  acceptOffers: boolean;
  minOffer: number;
  offerStatus: OfferStatus;

  filters: boolean;
  confirmed: boolean;
  follow: boolean;
  instant: boolean;
  local: boolean;
  vacation: boolean;
  bundlesOn: boolean;
  bundlePct: number;

  idea: string;
  sortIdx: number;
  category: string;
  board: string | null;

  offer: boolean;
  offerIdx: number;
  favs: Flags;
  pinSaves: Flags;

  theme: Theme | null;
  textLg: boolean;
  lang: Lang;

  report: boolean;
  reportReason: number;
  reportSent: boolean;
  blocked: Flags;

  deleteStep: 0 | 1 | 2;
  claimStep: number;
  claimKind: number;
  stars: number;
  ratingTags: Flags;

  /** Uploaded photos and videos, keyed by the slot they fill. */
  media: Record<string, MediaItem>;
}

/** Canvas-level props that were editor-configurable on the design doc. */
export interface AppConfig {
  theme: Theme;
  currency: '€' | '$' | '£';
  instantBook: boolean;
  showTabLabels: boolean;
  demoEmptyStates: boolean;
}
