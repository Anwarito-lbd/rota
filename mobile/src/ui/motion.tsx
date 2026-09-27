/**
 * Motion and small shared pieces for the social layer: springy presses,
 * the double-tap heart, a sliding segmented control, skeletons, avatars,
 * badges and the Rota logo. Every animation respects Reduce Motion.
 */
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BRAND_LAVENDER, OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { HeartIcon, ShieldCheckIcon } from './icons';
import { Txt } from './kit';

export const NATIVE_DRIVER = Platform.OS !== 'web';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Reduce Motion from the OS; animations fall back to fades or nothing. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduced)
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

export function tap(kind: 'light' | 'medium' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  else
    Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );
}

/** A Pressable that springs down on touch and back on release. */
export function PressScale({
  children,
  onPress,
  onLongPress,
  style,
  scaleTo = 0.95,
  haptic,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  hitSlop,
  disabled,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'light' | 'medium' | 'success';
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'tab' | 'link' | 'image';
  accessibilityState?: { selected?: boolean; disabled?: boolean };
  hitSlop?: number;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: NATIVE_DRIVER, speed: 40, bounciness: v === 1 ? 10 : 0 }).start();
  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      hitSlop={hitSlop}
      disabled={disabled}
      onPressIn={() => !reduced && to(scaleTo)}
      onPressOut={() => !reduced && to(1)}
      onPress={() => {
        if (haptic) tap(haptic);
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Pops once when `active` turns true — likes, saves, follows. */
export function Pop({ active, children }: { active: boolean; children: ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!active || reduced) return;
    scale.setValue(0.6);
    Animated.spring(scale, { toValue: 1, useNativeDriver: NATIVE_DRIVER, speed: 18, bounciness: 16 }).start();
  }, [active, reduced, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

/** The big heart that blooms in the middle of a photo on double tap. */
export function HeartBurst({ trigger }: { trigger: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!trigger) return;
    scale.setValue(0.3);
    opacity.setValue(1);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: NATIVE_DRIVER, speed: 14, bounciness: 14 }),
      Animated.sequence([
        Animated.delay(420),
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: NATIVE_DRIVER }),
      ]),
    ]).start();
  }, [trigger, scale, opacity]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        transform: [{ scale }],
      }}
    >
      <HeartIcon size={120} fill={BRAND_LAVENDER} color={BRAND_LAVENDER} />
    </Animated.View>
  );
}

/** Fades and lifts children in on mount; staggered by `delay`. */
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: reduced ? 1 : 380,
      delay: reduced ? 0 : delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [v, delay, reduced]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [reduced ? 0 : 14, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Gentle pulse for skeletons and "live" dots. */
export function Pulse({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const v = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(v, { toValue: 0.45, duration: 700, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>;
}

export function Skeleton({ height, radius = 16, style }: { height: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <Pulse style={[{ height, borderRadius: radius, backgroundColor: c.surf2 }, style]} />;
}

/**
 * Segmented tabs with a pill that slides under the active one. `over`
 * renders light ink for use on top of photos (the feed).
 */
export function Segmented<K extends string>({
  items,
  value,
  onChange,
  over,
}: {
  items: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  over?: boolean;
}) {
  const { c } = useTheme();
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const x = useRef(new Animated.Value(0)).current;
  const w = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    const l = layouts[value];
    if (!l) return;
    const cfg = { useNativeDriver: false, speed: 22, bounciness: reduced ? 0 : 6 };
    Animated.parallel([Animated.spring(x, { toValue: l.x, ...cfg }), Animated.spring(w, { toValue: l.w, ...cfg })]).start();
  }, [value, layouts, x, w, reduced]);

  const onLayout = (k: K) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    setLayouts((s) => (s[k]?.x === lx && s[k]?.w === width ? s : { ...s, [k]: { x: lx, w: width } }));
  };

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        alignSelf: 'center',
        padding: 4,
        borderRadius: 999,
        backgroundColor: over ? 'rgba(12,10,13,0.42)' : c.surf2,
        borderWidth: over ? 1 : 0,
        borderColor: 'rgba(247,242,248,0.14)',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: x,
          width: w,
          borderRadius: 999,
          backgroundColor: over ? OVER_INK : c.accent,
        }}
      />
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onLayout={onLayout(it.key)}
            onPress={() => {
              tap();
              onChange(it.key);
            }}
            style={{ paddingHorizontal: 15, minHeight: 34, justifyContent: 'center' }}
          >
            <Txt size={13} weight="bold" color={active ? (over ? '#1A1420' : c.onAccent) : over ? OVER_INK : c.ink2}>
              {it.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({ uri, size = 36, ring }: { uri: string | null | undefined; size?: number; ring?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        padding: ring ? 2 : 0,
        backgroundColor: ring ? BRAND_LAVENDER : 'transparent',
      }}
    >
      <View style={{ flex: 1, borderRadius: 999, overflow: 'hidden', backgroundColor: c.surf2, borderWidth: ring ? 2 : 0, borderColor: '#0C0A0D' }}>
        {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} /> : null}
      </View>
    </View>
  );
}

/** "ID vérifiée" — only shown when Stripe Identity returned verified. */
export function IdBadge({ label, over, compact }: { label: string; over?: boolean; compact?: boolean }) {
  const { c } = useTheme();
  if (compact) return <ShieldCheckIcon size={15} color={BRAND_LAVENDER} fill={BRAND_LAVENDER} />;
  return (
    <View
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: over ? 'rgba(226,169,241,0.22)' : c.accentSoft,
      }}
    >
      <ShieldCheckIcon size={13} color={over ? BRAND_LAVENDER : c.accent} />
      <Txt size={11} weight="bold" color={over ? BRAND_LAVENDER : c.accent}>
        {label}
      </Txt>
    </View>
  );
}

/** The hanger wordmark. White over photos and dark grounds, ink on light. */
export function Logo({ width = 120, tone = 'white' }: { width?: number; tone?: 'white' | 'ink' }) {
  const src = tone === 'white' ? require('../../assets/logo-white.png') : require('../../assets/logo-ink.png');
  return (
    <Image
      source={src}
      accessibilityLabel="Rota"
      style={{ width, height: width * (521 / 992) }}
      contentFit="contain"
    />
  );
}

/** Rounded chip over photography. */
export function GlassChip({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: 'rgba(12,10,13,0.48)',
          borderWidth: 1,
          borderColor: 'rgba(247,242,248,0.16)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Compact counts: 1284 → 1,2 k. */
export function compact(n: number, lang: 'fr' | 'en' | 'es' = 'fr') {
  if (n < 1000) return String(n);
  const k = n / 1000;
  const s = k >= 10 ? Math.round(k).toString() : k.toFixed(1);
  return `${lang === 'en' ? s : s.replace('.', ',')}${lang === 'en' ? 'k' : ' k'}`;
}

export function timeAgo(iso: string, lang: 'fr' | 'en' | 'es' = 'fr') {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 6e4));
  const unit = mins < 60 ? ['min', 'min', 'min'] : mins < 1440 ? ['h', 'h', 'h'] : ['j', 'd', 'd'];
  const v = mins < 60 ? mins : mins < 1440 ? Math.round(mins / 60) : Math.round(mins / 1440);
  const idx = lang === 'fr' ? 0 : lang === 'en' ? 1 : 2;
  return `${v} ${unit[idx]}`;
}
