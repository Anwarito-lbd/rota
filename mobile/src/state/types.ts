export type Screen =
  | 'onboard'
  | 'feed'
  | 'discover'
  | 'search'
  | 'detail'
  | 'booking'
  | 'checkout'
  | 'rentals'
  | 'rental'
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
  | 'help'
  | 'admin'
  | 'set.profile'
  | 'set.account'
  | 'set.payments'
  | 'set.shipping'
  | 'set.security'
  | 'set.push'
  | 'set.email'
  | 'set.language'
  | 'set.theme'
  | 'set.privacy';

/**
 * 0 welcome · 'auth' credentials · 'otp' e-mail code · 1 guidelines gate
 * · 2 permission priming. Two-step verification is handled by ui/Mfa.tsx.
 */
export type ObStep = 0 | 1 | 2 | 'auth' | 'otp';

export type Theme = 'dark' | 'light';
/** What the member picked in Settings; 'system' follows the phone. */
export type ThemeMode = 'system' | Theme;
export type Lang = 'fr' | 'en' | 'es';
export type AuthMode = 'signup' | 'login';
export type Delivery = 'ship' | 'meet';
export type FeedTab = 'near' | 'foryou' | 'follow';
export type RentalTab = 'renting' | 'lending';
export type OfferStatus = 'pending' | 'accepted' | 'declined';
export type PermKey = 'camera' | 'microphone' | 'photos' | 'location';

/** Shared shape for identity checks and certification requests. */
export type ReviewStatus = 'none' | 'pending' | 'verified' | 'rejected';

export type Flags = Record<string, boolean>;

export interface MediaItem {
  /** Local file URI returned by the image picker. */
  uri: string;
  kind: 'image' | 'video';
  name: string;
  /**
   * Where the file came from and what the picker said about it. Sent to
   * moderation as a signal; the phone reports it, so it is never proof.
   */
  source?: 'camera' | 'library';
  width?: number;
  height?: number;
  durationMs?: number;
  fileSize?: number;
  exif?: { make?: string; model?: string; software?: string };
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


  certificationStatus: ReviewStatus;
  /** Accounts this user vouches for — their profiles show a certified mark. */
  certifies: Flags;

  activeId: string;
  size: string;
  occasion: string;
  liked: Flags;
  wish: Flags;

  delivery: Delivery;
  /** ISO dates (YYYY-MM-DD), start and end inclusive. */
  dates: [string, string];
  rulesAccepted: boolean;
  /** Explicit consent to keep the payment method for off-session charges. */
  payConsent: boolean;
  rentalTab: RentalTab;
  /** The rental opened on the rental / claim screens. */
  activeRentalId: string | null;
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

  themeMode: ThemeMode;
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
