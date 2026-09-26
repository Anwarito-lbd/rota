/**
 * Everything the Settings screens read and write. Each function talks to
 * the real backend (Supabase tables from migration 007, Supabase Auth, the
 * `account` Edge Function); nothing is kept only on the phone.
 */
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { uploadMedia } from '../lib/upload';
import type { MediaItem } from '../state/types';

function db() {
  if (!supabase) throw new Error('server_not_configured');
  return supabase;
}

// ── Profile ────────────────────────────────────────────────────

export async function usernameFree(username: string) {
  const { data, error } = await db().rpc('username_available', { name: username });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function saveProfile(
  userId: string,
  patch: { username?: string; bio?: string | null; city?: string | null; showCity?: boolean; avatarUrl?: string },
) {
  const row: Record<string, unknown> = {};
  if (patch.username !== undefined) row.username = patch.username;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.showCity !== undefined) row.show_city = patch.showCity;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  const { error } = await db().from('profiles').update(row).eq('id', userId);
  if (error) throw new Error(error.code === '23505' ? 'username_taken' : error.message);
}

/** Uploads to the public avatars bucket and returns the URL stored on the profile. */
export async function uploadAvatar(userId: string, item: MediaItem) {
  const path = await uploadMedia('avatars', userId, item);
  return db().storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

/** The phone's current city, after asking for location permission. */
export async function currentCity(): Promise<string | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('location_denied');
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const [place] = await Location.reverseGeocodeAsync(position.coords);
  return place?.city ?? place?.subregion ?? place?.region ?? null;
}

// ── Shipping address ───────────────────────────────────────────

export interface Address {
  fullName: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
}

export const emptyAddress: Address = { fullName: '', line1: '', line2: '', postalCode: '', city: '', country: 'FR', phone: '' };

interface AddressRow {
  full_name: string;
  line1: string;
  line2: string | null;
  postal_code: string;
  city: string;
  country: string;
  phone: string | null;
}

const toAddress = (r: AddressRow): Address => ({
  fullName: r.full_name,
  line1: r.line1,
  line2: r.line2 ?? '',
  postalCode: r.postal_code,
  city: r.city,
  country: r.country,
  phone: r.phone ?? '',
});

export function useAddress(enabled: boolean) {
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled || !supabase) return setLoading(false);
    supabase
      .from('member_addresses')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        setAddress(data ? toAddress(data as AddressRow) : null);
        setLoading(false);
      });
  }, [enabled]);
  return { address, loading, setAddress };
}

export async function saveAddress(a: Address) {
  const { error } = await db()
    .from('member_addresses')
    .upsert(
      {
        full_name: a.fullName.trim(),
        line1: a.line1.trim(),
        line2: a.line2.trim() || null,
        postal_code: a.postalCode.trim(),
        city: a.city.trim(),
        country: a.country.trim().toUpperCase() || 'FR',
        phone: a.phone.trim() || null,
      },
      { onConflict: 'user_id' },
    );
  if (error) throw new Error(error.code === '23514' ? 'address_invalid' : error.message);
}

export async function deleteAddress() {
  const { error } = await db().from('member_addresses').delete().not('user_id', 'is', null);
  if (error) throw new Error(error.message);
}

/** For the owner of a paid rental that ships: where to send the piece. */
export async function rentalShippingAddress(rentalId: string): Promise<Address | null> {
  const { data } = await db().rpc('rental_shipping_address', { p_rental: rentalId });
  const row = Array.isArray(data) ? (data[0] as AddressRow | undefined) : undefined;
  return row ? toAddress(row) : null;
}

// ── Notification preferences ───────────────────────────────────

export interface Preferences {
  emailReminders: boolean;
  pushEnabled: boolean;
  pushBookings: boolean;
  pushReminders: boolean;
  pushClaims: boolean;
}

const DEFAULT_PREFS: Preferences = {
  emailReminders: true,
  pushEnabled: false,
  pushBookings: true,
  pushReminders: true,
  pushClaims: true,
};

const COLUMNS: Record<keyof Preferences, string> = {
  emailReminders: 'email_reminders',
  pushEnabled: 'push_enabled',
  pushBookings: 'push_bookings',
  pushReminders: 'push_reminders',
  pushClaims: 'push_claims',
};

export function usePreferences(enabled: boolean) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled || !supabase) return setLoading(false);
    supabase
      .from('member_preferences')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            emailReminders: data.email_reminders,
            pushEnabled: data.push_enabled,
            pushBookings: data.push_bookings,
            pushReminders: data.push_reminders,
            pushClaims: data.push_claims,
          });
        }
        setLoading(false);
      });
  }, [enabled]);

  /** Saves one change; the switch flips back if the server refuses. */
  const update = useCallback(async (patch: Partial<Preferences> & { pushToken?: string | null }) => {
    const before = prefs;
    const { pushToken, ...rest } = patch;
    setPrefs((p) => ({ ...p, ...rest }));
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) row[COLUMNS[k as keyof Preferences]] = v;
    if (pushToken !== undefined) row.push_token = pushToken;
    const { error } = await db().from('member_preferences').upsert(row, { onConflict: 'user_id' });
    if (error) {
      setPrefs(before);
      throw new Error(error.message);
    }
  }, [prefs]);

  return { prefs, loading, update };
}

// ── Push notifications ─────────────────────────────────────────

/** Shows notifications as banners even while the app is open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushResult = { token: string } | { error: 'denied' | 'no_project' | 'unsupported' };

/** Asks for permission and returns this phone's Expo push token. */
export async function registerForPush(): Promise<PushResult> {
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return { error: 'denied' };
  // Expo Go on Android can't receive remote notifications since SDK 53.
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') return { error: 'unsupported' };
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return { error: 'no_project' };
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return { token: data };
}

// ── Security ───────────────────────────────────────────────────

/** Sends a code to the new address; the change applies once it is entered. */
export async function requestEmailChange(email: string) {
  const { error } = await db().auth.updateUser({ email: email.trim() });
  if (error) throw new Error(error.message);
}

export async function confirmEmailChange(email: string, code: string) {
  const { error } = await db().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email_change' });
  if (error) throw new Error(error.message);
}

/** Checks the current password first, so a borrowed unlocked phone can't change it. */
export async function changePassword(email: string, current: string, next: string) {
  const check = await db().auth.signInWithPassword({ email, password: current });
  if (check.error) throw new Error('wrong_password');
  const { error } = await db().auth.updateUser({ password: next });
  if (error) throw new Error(error.message);
}

export async function signOutOtherDevices() {
  const { error } = await db().auth.signOut({ scope: 'others' });
  if (error) throw new Error(error.message);
}

export async function signOutEverywhere() {
  await db().auth.signOut({ scope: 'global' });
}

// Two-step verification with an authenticator app (TOTP, Supabase MFA).

export async function totpFactor() {
  const { data } = await db().auth.mfa.listFactors();
  return data?.totp?.[0] ?? null;
}

export async function startTotpEnrollment() {
  // A half-finished earlier attempt would block a new one.
  const { data: factors } = await db().auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.factor_type === 'totp' && f.status !== 'verified') await db().auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await db().auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Rota' });
  if (error || !data) throw new Error(error?.message ?? 'enroll_failed');
  return { factorId: data.id, secret: data.totp.secret, uri: data.totp.uri };
}

export async function verifyTotp(factorId: string, code: string) {
  const { error } = await db().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
  if (error) throw new Error('wrong_code');
}

export async function disableTotp(factorId: string) {
  const { error } = await db().auth.mfa.unenroll({ factorId });
  if (error) throw new Error(error.message);
}

// ── Privacy ────────────────────────────────────────────────────

/** Writes the member's data to a JSON file and opens the share sheet. */
export async function exportMyData() {
  const { data, error } = await db().rpc('export_my_data');
  if (error) throw new Error(error.message);
  const file = new File(Paths.cache, `rota-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
}

/** Closes the account for good. The server refuses while a rental is in progress. */
export async function closeAccount(confirm: string) {
  const { error } = await db().functions.invoke('account', { body: { action: 'delete', confirm } });
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(body?.error ?? error.message);
  }
  await db().auth.signOut({ scope: 'local' });
}
