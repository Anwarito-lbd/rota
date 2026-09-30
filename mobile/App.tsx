import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
  useFonts,
} from '@expo-google-fonts/instrument-serif';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, type ReactElement } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { paymentsConfigured, stripePublishableKey, stripeUrlScheme } from './src/data/payments';
import { AuthProvider, useAuth } from './src/lib/auth';
import { PolicyProvider } from './src/lib/policy';
import { ListingsProvider } from './src/data/listings';
import { SocialProvider } from './src/data/social';
import { CommunityProvider } from './src/data/community';
import { Admin } from './src/screens/Admin';
import { Booking } from './src/screens/Booking';
import { Checkout } from './src/screens/Checkout';
import { Claim } from './src/screens/Claim';
import { Closet } from './src/screens/Closet';
import { Detail } from './src/screens/Detail';
import { Fees } from './src/screens/Fees';
import { Discover } from './src/screens/Discover';
import { Feed } from './src/screens/Feed';
import { ListPiece } from './src/screens/ListPiece';
import { Messages } from './src/screens/Messages';
import { Onboarding } from './src/screens/Onboarding';
import { RentalDetail } from './src/screens/RentalDetail';
import { Rentals } from './src/screens/Rentals';
import { Compose } from './src/screens/Compose';
import { Guidelines } from './src/screens/Guidelines';
import { NearMap } from './src/screens/NearMap';
import { Camera } from './src/screens/Camera';
import { ActivityScreen, FollowList, HighlightViewer, PlannerScreen, ProScreen, StoryViewer } from './src/screens/Community';
import { Settings } from './src/screens/Settings';
import { Blocked, Boards, PostScreen, UserProfile } from './src/screens/Social';
import { TryOn } from './src/screens/TryOn';
import { Verify } from './src/screens/Verify';
import {
  AccountSettings,
  EmailSettings,
  LanguageSettings,
  PaymentsSettings,
  PrivacySettings,
  ProfileSettings,
  PushSettings,
  SecuritySettings,
  ShippingSettings,
  ThemeSettings,
  BusinessSettings,
} from './src/screens/SettingsPages';
import { ModerationDecisions } from './src/screens/Decisions';
import { StoreProvider, useStore } from './src/state/store';
import type { Screen as ScreenKey } from './src/state/types';
import { useTheme } from './src/theme/useTheme';
import { GhostButton, Display, Screen, Txt } from './src/ui/kit';
import { MfaChallenge } from './src/ui/Mfa';
import { UsernamePrompt } from './src/ui/UsernamePrompt';
import { ReportSheet } from './src/ui/Moderation';
import { CommentsSheet, CreateSheet, SaveSheet, SocialReportSheet } from './src/ui/SocialSheets';
import { TAB_BAR_SPACE, TabBar } from './src/ui/TabBar';

/** Screens still being ported from the web build. */
function ComingSoon() {
  const { state, go } = useStore();
  const { c } = useTheme();
  return (
    <Screen>
      <Display size={32}>Écran en cours de portage</Display>
      <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
        « {state.screen} » existe déjà dans la version web et arrive dans la prochaine passe du portage natif.
      </Txt>
      <GhostButton label="Retour au feed" onPress={() => go('feed')} style={{ marginTop: 20 }} />
    </Screen>
  );
}

const SCREENS: Partial<Record<ScreenKey, () => ReactElement>> = {
  onboard: Onboarding,
  feed: Feed,
  detail: Detail,
  booking: Booking,
  checkout: Checkout,
  discover: Discover,
  list: ListPiece,
  messages: Messages,
  closet: Closet,
  settings: Settings,
  rentals: Rentals,
  rental: RentalDetail,
  claim: Claim,
  admin: Admin,
  fees: Fees,
  'set.profile': ProfileSettings,
  'set.account': AccountSettings,
  'set.payments': PaymentsSettings,
  'set.shipping': ShippingSettings,
  'set.security': SecuritySettings,
  'set.push': PushSettings,
  'set.email': EmailSettings,
  'set.language': LanguageSettings,
  'set.theme': ThemeSettings,
  'set.privacy': PrivacySettings,
  'set.decisions': ModerationDecisions,
  'set.business': BusinessSettings,
  post: PostScreen,
  user: UserProfile,
  profile: UserProfile,
  map: NearMap,
  camera: Camera,
  follows: FollowList,
  activity: ActivityScreen,
  story: StoryViewer,
  highlight: HighlightViewer,
  pro: ProScreen,
  planner: PlannerScreen,
  compose: Compose,
  tryon: TryOn,
  verify: Verify,
  guidelines: Guidelines,
  blocked: Blocked,
  boards: Boards,
  board: Boards,
};

/** Full-screen flows that hide the tab bar. */
const NO_TABS: ScreenKey[] = ['onboard', 'map', 'compose', 'tryon', 'verify', 'camera', 'story', 'highlight', 'detail', 'booking', 'checkout'];
/** Screens whose photos run under the floating tab bar. */
const FULL_BLEED: ScreenKey[] = ['feed', 'post'];

function Shell() {
  const { state, set } = useStore();
  const { c, dark } = useTheme();
  const { loading, session, needsMfa, profile } = useAuth();

  // A stored session means the phone is already signed in: skip onboarding.
  useEffect(() => {
    if (session && state.screen === 'onboard' && state.obStep === 0) {
      set({ signedIn: true, emailVerified: true, screen: 'feed' });
    }
  }, [session, state.screen, state.obStep, set]);

  // Tapping a push opens what it is about: the conversation, or the post.
  useEffect(() => {
    const open = (data: Record<string, unknown> | undefined) => {
      if (!data || !session) return;
      if (typeof data.conversation === 'string') set({ screen: 'messages', thread: data.conversation });
      else if (typeof data.post === 'string') set({ screen: 'post', activePostId: data.post });
      else if (typeof data.kind === 'string' && data.kind === 'social_follow') set({ screen: 'activity' });
    };
    // Not on the web, and Expo Go may lack it: push taps only exist on phones.
    if (Platform.OS === 'web') return;
    try {
      const last = Notifications.getLastNotificationResponse();
      if (last) open(last.notification.request.content.data as Record<string, unknown>);
      const sub = Notifications.addNotificationResponseReceivedListener((r) =>
        open(r.notification.request.content.data as Record<string, unknown>),
      );
      return () => sub.remove();
    } catch {
      return;
    }
  }, [session, set]);

  // Signed out (from Settings, a closed account, an expired session): back to
  // the welcome screen. Only on the change from signed in to signed out.
  const hadSession = useRef(false);
  useEffect(() => {
    if (session) {
      hadSession.current = true;
    } else if (hadSession.current) {
      hadSession.current = false;
      set({ screen: 'onboard', obStep: 0, signedIn: false, emailVerified: false });
    }
  }, [session, set]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  // Password accepted, authenticator code still owed: nothing else is reachable.
  if (session && needsMfa) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <MfaChallenge />
      </View>
    );
  }

  // Signed in with Apple / Google: pick a username first (migration 011).
  if (session && profile && !profile.usernameConfirmed) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <UsernamePrompt />
      </View>
    );
  }

  const Current = SCREENS[state.screen] ?? ComingSoon;
  const showTabs = !NO_TABS.includes(state.screen) && !(state.screen === 'messages' && state.thread);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {/* The glass tab bar floats; full-bleed photo screens run under it. */}
      <View style={{ flex: 1, paddingBottom: showTabs && !FULL_BLEED.includes(state.screen) ? TAB_BAR_SPACE : 0 }}>
        <Current />
      </View>
      {showTabs ? <TabBar /> : null}
      <ReportSheet />
      <CommentsSheet />
      <SaveSheet />
      <CreateSheet />
      <SocialReportSheet />
    </View>
  );
}

/** Stripe only when a publishable key is set; the app still runs without one. */
function Payments({ children }: { children: ReactElement }) {
  if (!paymentsConfigured) return children;
  return (
    <StripeProvider
      publishableKey={stripePublishableKey}
      urlScheme={stripeUrlScheme}
      merchantIdentifier="merchant.com.rota.app"
    >
      {children}
    </StripeProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    // UI text uses the system font (Figma tokens); the serif is brand-only.
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#121013', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#E2A9F1" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <AuthProvider>
          <PolicyProvider>
            <ListingsProvider>
              <SocialProvider>
                <CommunityProvider>
                  <Payments>
                    <Shell />
                  </Payments>
                </CommunityProvider>
              </SocialProvider>
            </ListingsProvider>
          </PolicyProvider>
        </AuthProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
