/**
 * Flat, full-width settings lists (Vinted-style): a small centred title,
 * sections separated by a thick band, rows with an optional explanation,
 * icon, value, switch or small outlined button.
 */
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { ChevronRight } from './icons';
import { BackButton, Screen, Toggle, Txt } from './kit';

type Action = { label: string; onPress: () => void; disabled?: boolean };

export function FlatPage({
  title,
  onBack,
  left,
  right,
  children,
}: {
  title: string;
  onBack?: () => void;
  /** Text actions instead of the back button (e.g. Fermer / Valider). */
  left?: Action;
  right?: Action;
  children: ReactNode;
}) {
  const { c } = useTheme();
  const text = (a: Action, align: 'left' | 'right') => (
    <Pressable
      accessibilityRole="button"
      onPress={a.onPress}
      disabled={a.disabled}
      hitSlop={8}
      style={{ minWidth: 64, alignItems: align === 'left' ? 'flex-start' : 'flex-end', opacity: a.disabled ? 0.4 : 1 }}
    >
      <Txt size={16} weight={align === 'right' ? 'bold' : 'reg'} color={align === 'right' ? c.accent : c.ink}>
        {a.label}
      </Txt>
    </Pressable>
  );
  return (
    <Screen padded={false} bottomInset={60}>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
        {left ? text(left, 'left') : onBack ? <BackButton onPress={onBack} /> : <View style={{ width: 44 }} />}
        <Txt size={17} weight="bold" center numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Txt>
        {right ? text(right, 'right') : <View style={{ width: left ? 64 : 44 }} />}
      </View>
      {children}
    </Screen>
  );
}

/** Big heading and a line under it, at the top of a page. */
export function FlatIntro({ title, body }: { title: string; body?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 }}>
      <Txt size={24} weight="bold">
        {title}
      </Txt>
      {body ? (
        <Txt size={15} color={c.ink3} style={{ marginTop: 6 }}>
          {body}
        </Txt>
      ) : null}
    </View>
  );
}

export function FlatSection({ title, first, children }: { title?: string; first?: boolean; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ borderTopWidth: first ? 0 : 10, borderTopColor: c.surf }}>
      {title ? (
        <Txt size={14} color={c.ink3} style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 6 }}>
          {title}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

/** Title, optional explanation under it, switch on the right. */
export function FlatToggle({
  label,
  body,
  on,
  onPress,
  disabled,
  last,
}: {
  label: string;
  body?: string;
  on: boolean;
  onPress: () => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 60,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt size={16} weight="semi">
          {label}
        </Txt>
        {body ? (
          <Txt size={14} color={c.ink3} style={{ marginTop: 3 }}>
            {body}
          </Txt>
        ) : null}
      </View>
      <Toggle on={on} onPress={() => !disabled && onPress()} label={label} />
    </View>
  );
}

/**
 * A line: optional icon, title (and explanation), value on the right, then
 * a chevron when it opens something — or any custom `right` element.
 */
export function FlatRow({
  label,
  sub,
  detail,
  detailColor,
  icon,
  right,
  onPress,
  tone,
  last,
}: {
  label: string;
  sub?: string;
  detail?: string;
  detailColor?: string;
  icon?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  tone?: 'plum' | 'accent';
  last?: boolean;
}) {
  const { c } = useTheme();
  const color = tone === 'plum' ? c.plum : tone === 'accent' ? c.accent : c.ink;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 58,
        paddingHorizontal: 18,
        paddingVertical: sub ? 14 : 0,
        backgroundColor: pressed ? c.surf2 : 'transparent',
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line,
      })}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Txt size={16} weight={sub ? 'semi' : 'reg'} color={color}>
          {label}
        </Txt>
        {sub ? (
          <Txt size={14} color={c.ink3} style={{ marginTop: 3 }}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {detail ? (
        <Txt size={15} color={detailColor ?? c.ink3} numberOfLines={1} style={{ maxWidth: '50%' }}>
          {detail}
        </Txt>
      ) : null}
      {right}
      {onPress && !right && !tone ? <ChevronRight size={15} color={c.ink3} /> : null}
    </Pressable>
  );
}

export function FlatHelp({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt size={13} color={c.ink3} style={{ paddingHorizontal: 18, paddingVertical: 12 }}>
      {children}
    </Txt>
  );
}

/** Small outlined button inside a row ("Supprimer", "Vérifié", "Ajouter"). */
export function Pill({ label, onPress, tone = 'accent', disabled }: { label: string; onPress?: () => void; tone?: 'accent' | 'plum' | 'muted'; disabled?: boolean }) {
  const { c } = useTheme();
  const color = tone === 'plum' ? c.plum : tone === 'muted' ? c.ink3 : c.accent;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={{ paddingHorizontal: 14, height: 36, borderRadius: 10, borderWidth: 1.2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}
    >
      <Txt size={14} weight="semi" color={color}>
        {label}
      </Txt>
    </Pressable>
  );
}
