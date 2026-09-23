import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppConfig, AppState, MediaItem, Screen, Theme } from './types';

const initialState: AppState = {
  screen: 'onboard',
  obStep: 0,
  agreed: false,
  permOn: { camera: false, microphone: false, photos: false, location: false },
  signedIn: false,
  feedTab: 'foryou',

  authMode: null,
  username: '',
  email: '',
  pw: '',
  authErr: null,

  otpSent: '',
  otpInput: '',
  otpErr: false,
  emailVerified: false,

  twoFactorOn: false,
  twoFactorInput: '',
  twoFactorErr: false,

  identityStatus: 'none',
  identityStep: 0,
  identityDoc: 'cni',

  certificationStatus: 'none',
  certifies: {},

  payMethod: 'applepay',
  cards: [{ last4: '4417', brand: 'Visa', expiry: '04/29' }],
  walletBalance: 226,

  activeId: 'f3',
  size: 'S',
  occasion: 'Soirée',
  liked: {},
  wish: { f3: true, f1: true },

  delivery: 'ship',
  dates: [18, 21],
  rulesAccepted: false,
  depositAuthorized: false,
  safetyAccepted: false,
  pickupEvidenceReady: false,
  returnEvidenceReady: false,
  payoutStatus: 'held',
  rentalTab: 'renting',
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
  favs: {},
  pinSaves: { p2: true, p5: true },

  theme: null,
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
};

const defaultConfig: AppConfig = {
  theme: 'dark',
  currency: '€',
  instantBook: true,
  showTabLabels: true,
  demoEmptyStates: false,
};

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

type FlagBag = 'liked' | 'wish' | 'favs' | 'pinSaves' | 'ratingTags' | 'blocked' | 'certifies';

interface Store {
  state: AppState;
  config: AppConfig;
  set: (patch: Patch) => void;
  setConfig: (patch: Partial<AppConfig>) => void;
  /** Navigate to a screen, closing any transient overlay first. */
  go: (screen: Screen) => void;
  theme: Theme;
  dark: boolean;
  /** Format an amount in the configured currency. */
  m: (n: number) => string;
  toggleFlag: (bag: FlagBag, key: string) => void;
  setMedia: (id: string, item: MediaItem | null) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [config, setConfigState] = useState<AppConfig>(defaultConfig);

  const set = useCallback((patch: Patch) => {
    setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);

  const setConfig = useCallback((patch: Partial<AppConfig>) => {
    setConfigState((c) => ({ ...c, ...patch }));
  }, []);

  const go = useCallback((screen: Screen) => {
    setState((s) => ({
      ...s,
      screen,
      filters: false,
      confirmed: false,
      thread: null,
      offer: false,
      report: false,
      reportSent: false,
      deleteStep: 0,
    }));
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

  const theme: Theme = state.theme ?? config.theme;
  const currency = config.currency;
  const m = useCallback(
    (n: number) => (currency === '€' ? `${n} ${currency}` : `${currency}${n}`),
    [currency],
  );

  const value = useMemo<Store>(
    () => ({
      state,
      config,
      set,
      setConfig,
      go,
      theme,
      dark: theme === 'dark',
      m,
      toggleFlag,
      setMedia,
    }),
    [state, config, set, setConfig, go, theme, m, toggleFlag, setMedia],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
