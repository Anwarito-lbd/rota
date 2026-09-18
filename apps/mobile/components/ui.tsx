import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, spacing } from '../constants/theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sub}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryBtn, disabled && { opacity: 0.5 }]}
    >
      <Text style={styles.primaryBtnText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.secondaryBtn}>
      <Text style={styles.secondaryBtnText}>{title}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.ink3}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ text, tone = 'clay' }: { text: string; tone?: 'clay' | 'plum' | 'mute' }) {
  const bg = tone === 'clay' ? colors.clay : tone === 'plum' ? colors.plum : colors.surf2;
  const color = tone === 'mute' ? colors.ink2 : colors.onClay;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function Avatar({ uri, size = 36 }: { uri?: string; size?: number }) {
  return (
    <Image
      source={{
        uri:
          uri ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surf2 }}
    />
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.clay} />
    </View>
  );
}

export function Price({ value }: { value: number }) {
  return <Text style={styles.price}>{value} € <Text style={styles.perDay}>/ jour</Text></Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  sub: { color: colors.ink2, fontSize: 15, lineHeight: 22, marginTop: 6 },
  label: {
    color: colors.ink3,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  primaryBtn: {
    backgroundColor: colors.clay,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryBtnText: { color: colors.onClay, fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryBtnText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  input: {
    backgroundColor: colors.surf,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 16,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surf,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  price: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  perDay: { color: colors.ink3, fontSize: 13, fontWeight: '500' },
});
