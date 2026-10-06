import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { defaultDates } from '../lib/dates';
import { NAV_KEYS, type AppConfig, type AppState, type Lang, type MediaItem, type NavEntry, type Screen, type Theme, type ThemeMode } from './types';

const initialState: AppState = {
  screen: 'onboard',
  obStep: 0,
  agreed: false,
  permOn: { camera: false, microphone: false, photos: false, location: false },
  signedIn: false,
  feedTab: 'foryou',

  authMode: null,
  signupStep: 0,
  emailFlow: false,
  signupAccount: 'personal',
  business: null,
  username: '',
  email: '',
  pw: '',
  authErr: null,

  otpSent: '',
  otpInput: '',
  otpErr: false,
  emailVerified: false,


  certificationStatus: 'none',
  certifies: {},

  activeId: 'f3',
  size: 'S',
  occasion: 'Soirée',
  liked: {},
  wish: { f3: true, f1: true },

  // Meeting in Paris is the free default (docs/DELIVERY.md).
  delivery: 'meet',
  dates: defaultDates(),
  rulesAccepted: false,
  payConsent: false,
  rentalTab: 'renting',
  activeRentalId: null,
  thread: null,

  listStep: 0,
  listCat: 'Nuisette',
  listPrice: 22,
  listLenderCleans: true,
  listCleaningFee: 12,
  listRules: ['Pas de cigarette ni de parfum sur le tissu', 'Retour dans la housse fournie'],
  listRuleDraft: '',
  acceptOffers: true,
  minOffer: 16,
  offerStatus: 'pending',

  filters: false,
  confirmed: false,
  follow: false,
  instant: true,
  local: true,
  vacation: false,
  bundlesOn: false,
  bundlePct: 15,

  idea: 'Saison des galas',
  sortIdx: 0,
  category: 'Robes',
  board: null,

  offer: false,
  offerIdx: 1,
  agreedOffer: null,
  favs: {},
  pinSaves: { p2: true, p5: true },

  themeMode: 'dark',
  textLg: false,
  lang: 'fr',

  report: false,
  reportReason: 0,
  reportSent: false,
  blocked: {},

  deleteStep: 0,
  claimStep: 0,
  claimKind: 0,
  stars: 5,
  ratingTags: {},

  media: {},

  activePostId: null,
  profileId: null,
  challenge: null,
  commentsFor: null,
  saveTarget: null,
  createSheet: false,
  captured: null,
  followList: null,
  storyAuthorId: null,
  highlight: null,
  proFrom: null,
  socialReport: null,
  tryOnListingId: null,
  afterVerify: null,

  history: [],
};

const defaultConfig: AppConfig = {
  theme: 'dark',
  currency: '€',
  instantBook: true,
  showTabLabels: true,
  demoEmptyStates: false,
};

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

// ── Back history ──
// Every state change goes through `navigate`, so `go` and `set` both record
// where you came from. The rules, in order:
//  1. A patch that sets `history` itself is taken as is (back, resets).
//  2. Entering or leaving onboarding clears the history (sign-in, sign-out).
//  3. A new screen, or the same screen showing another member, piece, post
//     or conversation (profile → profile), pushes the previous screen and
//     its context.
//     Anything else (a sheet, a filter, a viewer moving to its next story)
//     changes nothing.
// `go` (or `finish`) to one of the four tab roots also clears it, like a
// tab press.

const HISTORY_CAP = 30;

/** Screens that show one thing; opening another one counts as navigating. */
const IDENTITY: Partial<Record<Screen, 'profileId' | 'activeId' | 'activePostId' | 'thread'>> = {
  user: 'profileId',
  profile: 'profileId',
  detail: 'activeId',
  post: 'activePostId',
  messages: 'thread',
};

export const TAB_ROOTS: Screen[] = ['feed', 'discover', 'messages', 'closet'];

/** Transient overlays every navigation closes. */
const CLOSED: Partial<AppState> = {
  filters: false,
  confirmed: false,
  thread: null,
  offer: false,
  report: false,
  reportSent: false,
  deleteStep: 0,
  commentsFor: null,
  saveTarget: null,
  createSheet: false,
  socialReport: null,
};

function snapshot(s: AppState): NavEntry {
  const entry = {} as Record<string, unknown>;
  for (const key of NAV_KEYS) entry[key] = s[key];
  return entry as NavEntry;
}

function navigate(s: AppState, patch: Partial<AppState>): AppState {
  const next = { ...s, ...patch };
  if ('history' in patch) return next;
  if (next.screen === 'onboard' || s.screen === 'onboard') return next.history.length ? { ...next, history: [] } : next;
  const id = IDENTITY[next.screen];
  const moved = next.screen !== s.screen || (id !== undefined && next[id] !== s[id]);
  if (!moved) return next;
  return { ...next, history: [...s.history, snapshot(s)].slice(-HISTORY_CAP) };
}

type FlagBag = 'liked' | 'wish' | 'favs' | 'pinSaves' | 'ratingTags' | 'blocked' | 'certifies';

interface Store {
  state: AppState;
  config: AppConfig;
  set: (patch: Patch) => void;
  setConfig: (patch: Partial<AppConfig>) => void;
  /** Navigate to a screen, closing any transient overlay first. */
  go: (screen: Screen) => void;
  /**
   * Return to the previous screen with the context it had (same profile,
   * piece, post…). With no history, open `fallback` instead.
   */
  back: (fallback: Screen | Partial<AppState>) => void;
  /**
   * End a flow: drop the trailing history entries on the `drop` screens
   * (e.g. the booking steps after a payment), then apply `patch` without
   * recording the current screen, so back never returns into the flow.
   */
  finish: (patch: Partial<AppState>, drop: Screen[]) => void;
  theme: Theme;
  dark: boolean;
  /** Format an amount in the configured currency. */
  m: (n: number) => string;
  toggleFlag: (bag: FlagBag, key: string) => void;
  setMedia: (id: string, item: MediaItem | null) => void;
}

const StoreContext = createContext<Store | null>(null);

/** Language and appearance survive closing the app. */
const PREFS_KEY = 'rota.prefs.v1';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [config, setConfigState] = useState<AppConfig>(defaultConfig);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const system = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        const saved = raw ? (JSON.parse(raw) as { lang?: Lang; themeMode?: ThemeMode }) : {};
        setState((s) => ({
          ...s,
          ...(saved.lang === 'fr' || saved.lang === 'en' || saved.lang === 'es' ? { lang: saved.lang } : {}),
          ...(saved.themeMode === 'system' || saved.themeMode === 'light' || saved.themeMode === 'dark'
            ? { themeMode: saved.themeMode }
            : {}),
        }));
      })
      .catch(() => undefined)
      .finally(() => setPrefsLoaded(true));
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ lang: state.lang, themeMode: state.themeMode })).catch(
      () => undefined,
    );
  }, [prefsLoaded, state.lang, state.themeMode]);

  const set = useCallback((patch: Patch) => {
    setState((s) => navigate(s, typeof patch === 'function' ? patch(s) : patch));
  }, []);

  const setConfig = useCallback((patch: Partial<AppConfig>) => {
    setConfigState((c) => ({ ...c, ...patch }));
  }, []);

  const go = useCallback((screen: Screen) => {
    setState((s) => navigate(s, { ...CLOSED, screen, ...(TAB_ROOTS.includes(screen) ? { history: [] } : {}) }));
  }, []);

  // The history as last rendered: a second tap before the next render (a
  // double tap on a back button) must not pop a second screen.
  const rendered = useRef(state.history);
  rendered.current = state.history;

  const back = useCallback((fallback: Screen | Partial<AppState>) => {
    const seen = rendered.current;
    setState((s) => {
      if (s.history !== seen) return s;
      const prev = s.history[s.history.length - 1];
      if (!prev) return { ...s, ...CLOSED, ...(typeof fallback === 'string' ? { screen: fallback } : fallback), history: [] };
      return { ...s, ...CLOSED, ...prev, history: s.history.slice(0, -1) };
    });
  }, []);

  const finish = useCallback((patch: Partial<AppState>, drop: Screen[]) => {
    setState((s) => {
      const history = [...s.history];
      while (history.length && drop.includes(history[history.length - 1].screen)) history.pop();
      const screen = patch.screen ?? s.screen;
      return { ...s, ...CLOSED, ...patch, history: TAB_ROOTS.includes(screen) ? [] : history };
    });
  }, []);

  const toggleFlag = useCallback<Store['toggleFlag']>((bag, key) => {
    setState((s) => ({ ...s, [bag]: { ...s[bag], [key]: !s[bag][key] } }));
  }, []);

  const setMedia = useCallback<Store['setMedia']>((id, item) => {
    setState((s) => {
      const media = { ...s.media };
      if (item) media[id] = item;
      else delete media[id];
      return { ...s, media };
    });
  }, []);

  const theme: Theme =
    state.themeMode === 'system' ? (system === 'light' ? 'light' : 'dark') : state.themeMode;
  const currency = config.currency;
  const m = useCallback(
    (n: number) => {
      // Whole amounts stay short ("25 €"); cents always show two digits ("7,50 €").
      const cents = Math.round(n * 100);
      const text = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
      return currency === '€' ? `${text.replace('.', ',')} ${currency}` : `${currency}${text}`;
    },
    [currency],
  );

  const value = useMemo<Store>(
    () => ({
      state,
      config,
      set,
      setConfig,
      go,
      back,
      finish,
      theme,
      dark: theme === 'dark',
      m,
      toggleFlag,
      setMedia,
    }),
    [state, config, set, setConfig, go, back, finish, theme, m, toggleFlag, setMedia],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
