/**
 * Floating Liquid Glass tab bar (Figma redesign): four tabs in a pill,
 * the selected one marked by a filled capsule and a bolder label — shape,
 * not colour alone. With Reduce Transparency on, the glass becomes solid.
 * The round "+" in the middle opens the camera (post a fit or list a piece).
 */
import { BlurView } from 'expo-blur';
import { useEffect, useState, type ReactElement } from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInbox } from '../data/messages';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import type { Screen } from '../state/types';
import { useTheme } from '../theme/useTheme';
import { PlusIcon, TabClosetIcon, TabDiscoverIcon, TabFeedIcon, TabMessagesIcon } from './icons';
import { Txt } from './kit';
import { PressScale } from './motion';

type TabKey = 'feed' | 'discover' | 'messages' | 'closet';

const TABS: { key: TabKey; label: 'tab.feed' | 'tab.discover' | 'tab.messages' | 'tab.closet'; Icon: (p: { color: string }) => ReactElement }[] = [
  { key: 'feed', label: 'tab.feed', Icon: TabFeedIcon },
  { key: 'discover', label: 'tab.discover', Icon: TabDiscoverIcon },
  { key: 'messages', label: 'tab.messages', Icon: TabMessagesIcon },
  { key: 'closet', label: 'tab.closet', Icon: TabClosetIcon },
];

/** Height the floating bar takes, for content that scrolls under it. */
export const TAB_BAR_SPACE = 84;

function useReduceTransparency() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then(setOn)
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

/** Screens that keep a given tab lit while you are deeper in its stack. */
const TAB_GROUPS: Record<string, Screen[]> = {
  feed: ['feed', 'post'],
  discover: ['discover', 'search', 'boards', 'board', 'map'],
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
  const { state, set, go, config } = useStore();
  const { c, dark } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const solid = useReduceTransparency();
  const { unread } = useInbox();

  const create = (
    <View key="create" style={{ width: 64, alignItems: 'center', justifyContent: 'center' }}>
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={t('create.title')}
        haptic="medium"
        scaleTo={0.88}
        onPress={() => set({ screen: 'camera' })}
        style={{
          width: 52,
          height: 52,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.accent,
          shadowColor: c.accent,
          shadowOpacity: 0.45,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <PlusIcon size={26} color={c.onAccent} />
      </PressScale>
    </View>
  );

  const bar = (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 6, gap: 2 }}>
      {TABS.flatMap(({ key, label, Icon }, i) => {
        const active = state.screen === key || (TAB_GROUPS[key] ?? []).includes(state.screen);
        const color = active ? c.accent : c.ink2;
        const tab = (
          <PressScale
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(label)}
            haptic="light"
            scaleTo={0.9}
            onPress={() => go(key)}
            style={{
              flex: 1,
              minHeight: 52,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              backgroundColor: active ? c.accentSoft : 'transparent',
            }}
          >
            <View style={{ width: 26, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <Icon color={color} />
              {key === 'messages' && unread > 0 ? (
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
              <Txt size={11} weight={active ? 'bold' : 'semi'} color={color}>
                {t(label)}
              </Txt>
            ) : null}
          </PressScale>
        );
        return i === 1 ? [tab, create] : [tab];
      })}
    </View>
  );

  const frame = {
    borderRadius: 999,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: dark ? 'rgba(247,242,248,0.14)' : 'rgba(26,20,32,0.10)',
  };

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 14, right: 14, bottom: Math.max(insets.bottom - 6, 10) }}
    >
      {solid ? (
        <View style={[frame, { backgroundColor: c.surf2 }]}>{bar}</View>
      ) : (
        <BlurView
          intensity={Platform.OS === 'web' ? 40 : 60}
          tint={dark ? 'dark' : 'light'}
          style={[frame, { backgroundColor: dark ? 'rgba(27,24,29,0.62)' : 'rgba(255,255,255,0.62)' }]}
        >
          {bar}
        </BlurView>
      )}
    </View>
  );
}
