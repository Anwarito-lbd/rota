import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { FONT } from '../theme/tokens';

type Weight = 'reg' | 'med' | 'semi' | 'bold';

const FAMILY: Record<Weight, string> = {
  reg: FONT.sans,
  med: FONT.sansMed,
  semi: FONT.sansSemi,
  bold: FONT.sansBold,
};

export function Txt({
  children,
  size = 15,
  weight = 'reg',
  color,
  style,
  center,
  upper,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  weight?: Weight;
  color?: string;
  style?: StyleProp<TextStyle>;
  center?: boolean;
  upper?: boolean;
  numberOfLines?: number;
}) {
  const { c, fs } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: FAMILY[weight],
          fontSize: fs(size),
          lineHeight: fs(size) * 1.45,
          color: color ?? c.ink,
          textAlign: center ? 'center' : 'auto',
          letterSpacing: upper ? 1.6 : 0,
          textTransform: upper ? 'uppercase' : 'none',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Display type — the serif is for words only, never for figures. */
export function Display({
  children,
  size = 34,
  color,
  italic,
  style,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  italic?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const { c } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: italic ? FONT.serifItalic : FONT.serif,
          fontSize: size,
          lineHeight: size * 1.05,
          color: color ?? c.ink,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Amount({
  children,
  size = 16,
  color,
  style,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { c, amount } = useTheme();
  return <Text style={[amount(size), { color: color ?? c.ink }, style]}>{children}</Text>;
}

export function Screen({
  children,
  padded = true,
  bottomInset = 24,
  style,
}: {
  children: ReactNode;
  padded?: boolean;
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: c.bg }, style]}
      contentContainerStyle={{
        paddingHorizontal: padded ? 18 : 0,
        paddingTop: insets.top + 12,
        paddingBottom: bottomInset,
      }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  onPress,
  accent,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accent?: boolean;
}) {
  const { c } = useTheme();
  const body = (
    <View
      style={[
        {
          padding: 14,
          borderRadius: 16,
          backgroundColor: c.surf,
          borderWidth: 1,
          borderColor: accent ? c.accent : c.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = 'accent',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'accent' | 'plum';
  style?: StyleProp<ViewStyle>;
}) {
  const { c, fs } = useTheme();
  const bg = disabled ? c.surf2 : tone === 'plum' ? c.plum : c.accent;
  const fg = disabled ? c.ink3 : tone === 'plum' ? c.onplum : c.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={() => !disabled && onPress()}
      style={({ pressed }) => [
        {
          minHeight: 54,
          borderRadius: 16,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed && !disabled ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: FONT.sansBold, fontSize: fs(17), color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  tone = 'ink',
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'ink' | 'plum' | 'accent';
  style?: StyleProp<ViewStyle>;
}) {
  const { c, fs } = useTheme();
  const color = tone === 'plum' ? c.plum : tone === 'accent' ? c.accent : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 50,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: tone === 'plum' ? c.plum : tone === 'accent' ? c.accent : c.line2,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
          paddingHorizontal: 16,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: FONT.sansBold, fontSize: fs(15), color }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  on,
  onPress,
  tone = 'accent',
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  tone?: 'accent' | 'plum' | 'ink';
}) {
  const { c, fs } = useTheme();
  const fill = tone === 'plum' ? c.plum : tone === 'ink' ? c.ink : c.accent;
  const onFill = tone === 'plum' ? c.onplum : tone === 'ink' ? c.bg : c.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{
        minHeight: 38,
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: on ? fill : c.line2,
        backgroundColor: on ? fill : 'transparent',
      }}
    >
      <Text style={{ fontFamily: FONT.sansSemi, fontSize: fs(13), color: on ? onFill : c.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 50,
        height: 30,
        borderRadius: 99,
        backgroundColor: on ? c.accent : c.surf2,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          width: 24,
          height: 24,
          borderRadius: 99,
          backgroundColor: c.sink,
        }}
      />
    </Pressable>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: c.line2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 22, color: c.ink, marginTop: -4 }}>‹</Text>
    </Pressable>
  );
}

export function Header({
  title,
  onBack,
  size = 32,
  right,
}: {
  title: string;
  onBack?: () => void;
  size?: number;
  right?: ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {onBack ? <BackButton onPress={onBack} /> : null}
      <View style={{ flex: 1 }}>
        <Display size={size}>{title}</Display>
      </View>
      {right}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 22 }}>
      {children}
    </Txt>
  );
}

export function Row({
  label,
  detail,
  detailColor,
  onPress,
  last,
}: {
  label: string;
  detail?: string;
  detailColor?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
        paddingHorizontal: 15,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line,
      }}
    >
      <Txt style={{ flex: 1 }}>{label}</Txt>
      {detail ? (
        <Txt size={13} weight="semi" color={detailColor ?? c.ink3}>
          {detail}
        </Txt>
      ) : null}
      {onPress ? <Text style={{ color: c.ink3, fontSize: 18 }}>›</Text> : null}
    </Pressable>
  );
}

export function Group({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        marginTop: 12,
        borderRadius: 16,
        backgroundColor: c.surf,
        borderWidth: 1,
        borderColor: c.line,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

export function Note({ children, tone = 'surf2' }: { children: ReactNode; tone?: 'surf2' | 'accent' }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        padding: 14,
        borderRadius: 14,
        backgroundColor: tone === 'accent' ? c.accentSoft : c.surf2,
      }}
    >
      <Txt size={13} color={c.ink2}>
        {children}
      </Txt>
    </View>
  );
}

export function Steps({ current, count = 3 }: { current: number; count?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: i <= current ? c.accent : c.surf2 }}
        />
      ))}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
  hint,
  autoCapitalize = 'none',
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  hint?: string;
  autoCapitalize?: 'none' | 'sentences';
  multiline?: boolean;
}) {
  const { c, fs } = useTheme();
  return (
    <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.surf, borderWidth: 1, borderColor: c.line }}>
      <Txt size={11} weight="semi" upper color={c.ink3}>
        {label}
      </Txt>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.ink3}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={!!multiline}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'auto'}
        style={{
          marginTop: 4,
          minHeight: multiline ? 96 : 32,
          fontFamily: FONT.sansSemi,
          fontSize: fs(16),
          color: c.ink,
          padding: 0,
        }}
      />
      {hint ? (
        <Txt size={12} color={c.ink3} style={{ marginTop: 4 }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** The bottom action bar that fades the scrolling content out beneath it. */
export function FooterBar({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <LinearGradient
        colors={['transparent', c.bg, c.bg]}
        locations={[0, 0.45, 1]}
        style={{ paddingHorizontal: 18, paddingTop: 22, paddingBottom: 30 }}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

export function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(6,5,5,0.62)' }} />
      <View
        style={{
          backgroundColor: c.surf,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderColor: c.line,
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 34,
          maxHeight: '86%',
        }}
      >
        <View style={{ width: 44, height: 4, borderRadius: 99, backgroundColor: c.line2, alignSelf: 'center', marginBottom: 16 }} />
        <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

export function Radio({ on }: { on: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 99,
        borderWidth: 2,
        borderColor: on ? c.accent : c.line2,
        backgroundColor: on ? c.accent : 'transparent',
      }}
    />
  );
}

export function Check({ on }: { on: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: on ? c.accent : c.line2,
        backgroundColor: on ? c.accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {on ? <Text style={{ color: c.onAccent, fontSize: 13, fontFamily: FONT.sansBold }}>✓</Text> : null}
    </View>
  );
}

export function CertifiedMark({ size = 18 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: c.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: c.onAccent, fontSize: size * 0.6, fontFamily: FONT.sansBold }}>✓</Text>
    </View>
  );
}
