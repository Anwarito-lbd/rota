import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  useFonts,
} from '@expo-google-fonts/archivo';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Feed } from './src/screens/Feed';
import { Onboarding } from './src/screens/Onboarding';
import { StoreProvider, useStore } from './src/state/store';
import type { Screen as ScreenKey } from './src/state/types';
import { useTheme } from './src/theme/useTheme';
import { GhostButton, Display, Screen, Txt } from './src/ui/kit';
import { TabBar } from './src/ui/TabBar';

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
};

function Shell() {
  const { state } = useStore();
  const { c, dark } = useTheme();
  const Current = SCREENS[state.screen] ?? ComingSoon;
  const showTabs = state.screen !== 'onboard' && !(state.screen === 'messages' && state.thread);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        <Current />
      </View>
      {showTabs ? <TabBar /> : null}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#121011', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#E8865F" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
