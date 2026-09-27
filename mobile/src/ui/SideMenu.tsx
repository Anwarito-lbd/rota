/**
 * The Dressing menu, opened from ☰ like Instagram or TikTok: everything that
 * isn't your profile — favourites, rentals, payments, verification, settings,
 * rules, fees and help — in one panel that slides in from the right.
 */
import { useEffect, useRef, type ReactElement } from 'react';
import { Animated, Easing, Linking, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocial } from '../data/social';
import { useT, type TranslationKey } from '../i18n';
import { useAuth } from '../lib/auth';
import { BRAND } from '../lib/config';
import { useStore } from '../state/store';
import type { Screen } from '../state/types';
import { useTheme } from '../theme/useTheme';
import {
  BookIcon,
  CalendarIcon,
  ChevronRight,
  CloseIcon,
  GearIcon,
  HeartIcon,
  HelpIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  WalletIcon,
} from './icons';
import { Txt } from './kit';
import { useReducedMotion } from './motion';

type Item = {
  label: TranslationKey;
  Icon: (p: { size?: number; color?: string }) => ReactElement;
  to?: Screen;
  onPress?: () => void;
  detail?: string;
};

export function SideMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { set, go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { isStaff } = useAuth();
  const social = useSocial();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const panel = Math.min(width * 0.84, 360);
  const x = useRef(new Animated.Value(panel)).current;

  useEffect(() => {
    if (!visible) return;
    x.setValue(panel);
    Animated.timing(x, {
      toValue: 0,
      duration: reduced ? 0 : 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, panel, reduced, x]);

  const open = (item: Item) => {
    onClose();
    if (item.onPress) return item.onPress();
    if (item.to === 'verify') return set({ screen: 'verify', afterVerify: 'closet' });
    if (item.to === 'boards') return set({ screen: 'boards', board: null });
    if (item.to) go(item.to);
  };

  const groups: Item[][] = [
    [
      { label: 'boards.title', Icon: HeartIcon, to: 'boards' },
      { label: 'rentals.title', Icon: CalendarIcon, to: 'rentals' },
      { label: 'set.payments', Icon: WalletIcon, to: 'set.payments' },
    ],
    [
      {
        label: 'verify.title',
        Icon: ShieldCheckIcon,
        to: 'verify',
        detail: social.identity === 'verified' ? t('settings.verified') : t('settings.toVerify'),
      },
      { label: 'settings.title', Icon: GearIcon, to: 'settings' },
    ],
    [
      { label: 'settings.guidelines', Icon: BookIcon, to: 'guidelines' },
      { label: 'closet.feesProtection', Icon: ReceiptIcon, to: 'fees' },
      { label: 'closet.help', Icon: HelpIcon, onPress: () => Linking.openURL(`mailto:${BRAND.supportEmail}`).catch(() => undefined) },
    ],
    ...(isStaff ? [[{ label: 'admin.title' as TranslationKey, Icon: GearIcon, to: 'admin' as Screen }]] : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('camera.close')} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: panel,
          backgroundColor: c.bg,
          paddingTop: insets.top + 8,
          borderTopLeftRadius: 28,
          borderBottomLeftRadius: 28,
          transform: [{ translateX: x }],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, height: 52 }}>
          <Txt size={20} weight="bold" style={{ flex: 1 }}>
            {t('tab.closet')}
          </Txt>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('camera.close')}
            hitSlop={8}
            style={{ width: 40, height: 40, borderRadius: 99, backgroundColor: c.surf2, alignItems: 'center', justifyContent: 'center' }}
          >
            <CloseIcon size={18} color={c.ink} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {groups.map((group, gi) => (
            <View key={gi} style={{ marginTop: gi === 0 ? 6 : 14, borderTopWidth: gi === 0 ? 0 : 8, borderTopColor: c.surf }}>
              {group.map((item, i) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  onPress={() => open(item)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    minHeight: 56,
                    paddingHorizontal: 18,
                    backgroundColor: pressed ? c.surf2 : 'transparent',
                    borderBottomWidth: i === group.length - 1 ? 0 : 1,
                    borderBottomColor: c.line,
                  })}
                >
                  <item.Icon size={22} color={c.ink} />
                  <Txt size={16} style={{ flex: 1 }}>
                    {t(item.label)}
                  </Txt>
                  {item.detail ? (
                    <Txt size={14} color={c.ink3}>
                      {item.detail}
                    </Txt>
                  ) : null}
                  <ChevronRight size={15} color={c.ink3} />
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
