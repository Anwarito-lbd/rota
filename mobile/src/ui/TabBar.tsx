import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../state/store';
import type { Screen } from '../state/types';
import { useTheme } from '../theme/useTheme';
import { TabAddIcon, TabClosetIcon, TabDiscoverIcon, TabFeedIcon, TabMessagesIcon } from './icons';
import { Txt } from './kit';

type TabKey = 'feed' | 'discover' | 'list' | 'messages' | 'closet';

const TABS: { key: TabKey; label: string; Icon: (p: { color: string }) => ReactElement }[] = [
  { key: 'feed', label: 'Feed', Icon: TabFeedIcon },
  { key: 'discover', label: 'Explorer', Icon: TabDiscoverIcon },
  { key: 'list', label: 'Louez', Icon: TabAddIcon },
  { key: 'messages', label: 'Messages', Icon: TabMessagesIcon },
  { key: 'closet', label: 'Dressing', Icon: TabClosetIcon },
];

/** Screens that keep a given tab lit while you are deeper in its stack. */
const TAB_GROUPS: Record<string, Screen[]> = {
  discover: ['discover', 'search', 'boards', 'board'],
  messages: ['messages'],
  closet: [
    'closet',
    'profile',
    'settings',
    'payouts',
    'blocked',
    'fees',
    'rentals',
    'claim',
    'reviews',
    'safety',
    'wallet',
    'payments',
    'identity',
    'certification',
    'security',
    'referral',
    'promote',
    'preferences',
    'bundles',
    'vacation',
    'help',
  ],
};

export function TabBar() {
  const { state, go, config } = useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: c.sink,
        borderTopWidth: 1,
        borderTopColor: c.line,
        paddingTop: 8,
        paddingHorizontal: 6,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      {TABS.map(({ key, label, Icon }) => {
        const active = state.screen === key || (TAB_GROUPS[key] ?? []).includes(state.screen);
        const color = active ? c.clay : c.ink3;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            onPress={() => go(key)}
            style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 }}
          >
            <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
              <Icon color={color} />
              {key === 'messages' ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -1,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: 99,
                    backgroundColor: c.plum,
                  }}
                />
              ) : null}
            </View>
            {config.showTabLabels ? (
              <Txt size={10} weight="semi" color={color}>
                {label}
              </Txt>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
