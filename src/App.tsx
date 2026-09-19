import type { ReactNode } from 'react';
import { DeleteAccount } from './overlays/DeleteAccount';
import { ReportSheet } from './overlays/ReportSheet';
import { Booking } from './screens/Booking';
import { BoardDetail, Boards } from './screens/Boards';
import { Checkout } from './screens/Checkout';
import { Claim } from './screens/Claim';
import { Closet } from './screens/Closet';
import { Detail } from './screens/Detail';
import { Discover } from './screens/Discover';
import { Feed } from './screens/Feed';
import { ListPiece } from './screens/ListPiece';
import { Certification, Identity, PaymentMethods, Security, Wallet } from './screens/Account';
import { Bundles, Help, Preferences, Promote, Referral, Vacation } from './screens/Extras';
import { Messages } from './screens/Messages';
import { Notifications } from './screens/Notifications';
import { Onboarding } from './screens/Onboarding';
import { Fees, Guidelines, Safety } from './screens/Policies';
import { Payouts } from './screens/Payouts';
import { Profile } from './screens/Profile';
import { Rentals } from './screens/Rentals';
import { Reviews } from './screens/Reviews';
import { Search } from './screens/Search';
import { Blocked, Settings } from './screens/Settings';
import { StoreProvider, useStore } from './state/store';
import type { Screen } from './state/types';
import { IOSFrame } from './ui/IOSFrame';
import { TabBar } from './ui/TabBar';
import { SANS, SERIF, fs } from './ui/styles';

const SCREENS: Record<Screen, () => JSX.Element> = {
  onboard: Onboarding,
  feed: Feed,
  discover: Discover,
  search: Search,
  detail: Detail,
  booking: Booking,
  checkout: Checkout,
  rentals: Rentals,
  boards: Boards,
  board: BoardDetail,
  profile: Profile,
  closet: Closet,
  list: ListPiece,
  messages: Messages,
  notifs: Notifications,
  reviews: Reviews,
  claim: Claim,
  payouts: Payouts,
  settings: Settings,
  blocked: Blocked,
  fees: Fees,
  safety: Safety,
  guidelines: Guidelines,
  wallet: Wallet,
  payments: PaymentMethods,
  identity: Identity,
  certification: Certification,
  security: Security,
  referral: Referral,
  promote: Promote,
  preferences: Preferences,
  bundles: Bundles,
  vacation: Vacation,
  help: Help,
};

const CHIPS: [string, Screen][] = [
  ['Onboarding', 'onboard'],
  ['Feed', 'feed'],
  ['Discover', 'discover'],
  ['Catalogue', 'search'],
  ['Detail', 'detail'],
  ['Dates', 'booking'],
  ['Checkout', 'checkout'],
  ['Rentals', 'rentals'],
  ['Boards', 'boards'],
  ['Board', 'board'],
  ['Lender', 'profile'],
  ['Closet', 'closet'],
  ['List a piece', 'list'],
  ['Messages', 'messages'],
  ['Notifications', 'notifs'],
  ['Ratings', 'reviews'],
  ['Return claim', 'claim'],
  ['Payouts', 'payouts'],
  ['Wallet', 'wallet'],
  ['Payment methods', 'payments'],
  ['ID check', 'identity'],
  ['Certification', 'certification'],
  ['Security & 2FA', 'security'],
  ['Referral', 'referral'],
  ['Promote', 'promote'],
  ['Preferences', 'preferences'],
  ['Bundles', 'bundles'],
  ['Vacation', 'vacation'],
  ['Help', 'help'],
  ['Settings', 'settings'],
  ['Blocked', 'blocked'],
  ['Fees & policy', 'fees'],
  ['Handover safety', 'safety'],
  ['Guidelines', 'guidelines'],
];

function AppShell() {
  const { state } = useStore();
  const CurrentScreen = SCREENS[state.screen];
  const showTabs = state.screen !== 'onboard' && !(state.screen === 'messages' && state.thread);

  return (
    <div style={{ position: 'relative', height: '100%', background: 'var(--bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: 'var(--ink)', fontFamily: SANS }}>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <CurrentScreen />
      </div>
      {showTabs ? <TabBar /> : null}
      {state.report ? <ReportSheet /> : null}
      {state.deleteStep > 0 ? <DeleteAccount /> : null}
    </div>
  );
}

function SidePanel() {
  const { state, set, go, theme, config, setConfig } = useStore();

  const toggleButton = {
    cursor: 'pointer',
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: 600,
    minHeight: 44,
    padding: '0 16px',
    borderRadius: 12,
    border: '1px solid var(--line2)',
    background: 'var(--surf)',
    color: 'var(--ink)',
  } as const;

  return (
    <>
      <div style={{ fontFamily: SERIF, fontSize: 84, lineHeight: 0.88, letterSpacing: '-0.02em' }}>ROTA</div>
      <div style={{ marginTop: 10, fontSize: 14, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--clay)' }}>
        Louer, porter, faire tourner
      </div>
      <p style={{ margin: '22px 0 0', fontSize: 17, lineHeight: 1.55, color: 'var(--ink2)', maxWidth: '40ch' }}>
        Peer-to-peer outfit rental for France. Scroll real wardrobes in full-screen video, book a piece for your dates,
        hand it on to the next person. Every rental is insured, cleaned and rated both ways.
      </p>

      <div style={{ marginTop: 28, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => set({ theme: theme === 'dark' ? 'light' : 'dark' })} style={toggleButton}>
          {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        </button>
        <button type="button" onClick={() => set((s) => ({ textLg: !s.textLg }))} style={toggleButton}>
          {state.textLg ? 'Texte standard' : 'Texte agrandi'}
        </button>
        <button type="button" onClick={() => setConfig({ demoEmptyStates: !config.demoEmptyStates })} style={toggleButton}>
          {config.demoEmptyStates ? 'États pleins' : 'États vides'}
        </button>
        <button type="button" onClick={() => setConfig({ instantBook: !config.instantBook })} style={toggleButton}>
          {config.instantBook ? 'Réservation immédiate' : 'Sur demande'}
        </button>
      </div>

      <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CHIPS.map(([label, key]) => {
          const on = state.screen === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => go(key)}
              style={{
                cursor: 'pointer',
                fontFamily: SANS,
                fontSize: 13,
                fontWeight: 600,
                minHeight: 36,
                padding: '8px 14px',
                borderRadius: 999,
                border: `1px solid ${on ? 'var(--clay)' : 'var(--line2)'}`,
                background: on ? 'var(--clay)' : 'transparent',
                color: on ? 'var(--onclay)' : 'var(--ink)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 36, paddingTop: 22, borderTop: '1px solid var(--line)', display: 'grid', gap: 10, maxWidth: '38ch' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
          Built for App Review
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink2)' }}>
          Sign in with Apple, Google or email · community guidelines gate · report and block on every listing and profile
          · account deletion in Settings · purpose-primed permissions · fees and cancellation disclosed before payment ·
          in-person handover safety · Dynamic Type, 44pt targets and light/dark support.
        </div>
      </div>
    </>
  );
}

function Themed({ children }: { children: ReactNode }) {
  const { state, theme } = useStore();
  return (
    <div
      data-theme={theme}
      data-text={state.textLg ? 'lg' : 'md'}
      style={{ minHeight: '100%', background: 'var(--bg)', color: 'var(--ink)', fontFamily: SANS, fontSize: fs(15) }}
    >
      {children}
    </div>
  );
}

function Stage() {
  const { dark } = useStore();

  return (
    <Themed>
      <div className="stage">
        <div className="side-panel">
          <SidePanel />
        </div>
        <div className="phone-slot">
          <IOSFrame dark={dark}>
            <AppShell />
          </IOSFrame>
        </div>
      </div>
    </Themed>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Stage />
    </StoreProvider>
  );
}
