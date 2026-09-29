/**
 * The screens behind Settings, laid out like Vinted's: one list, each row
 * opens a page, every switch and button talks to the real backend.
 */
import * as Notifications from 'expo-notifications';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import {
  changePassword,
  closeAccount,
  confirmEmailChange,
  currentCity,
  disableTotp,
  emptyAddress,
  exportMyData,
  registerForPush,
  requestEmailChange,
  saveAddress,
  saveProfile,
  signOutOtherDevices,
  startTotpEnrollment,
  totpFactor,
  uploadAvatar,
  useAddress,
  usePreferences,
  usernameFree,
  verifyTotp,
  type Address,
} from '../data/account';
import {
  listPaymentMethods,
  paymentsConfigured,
  removePaymentMethod,
  useAddCard,
  verifyIdentity,
  type SavedMethod,
} from '../data/payments';
import { LANGUAGES, useT, type TranslationKey } from '../i18n';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { passwordChecks, passwordValid, usernameError } from '../state/auth';
import { useStore } from '../state/store';
import type { Lang, ThemeMode } from '../state/types';
import { useTheme } from '../theme/useTheme';
import { Field, GhostButton, Group, Header, PrimaryButton, Radio, Row, Screen, SectionLabel, Toggle, Txt } from '../ui/kit';
import { DeleteAccountSheet } from '../ui/DeleteAccountSheet';
import { FlatHelp, FlatIntro, FlatPage as BasePage, FlatRow, FlatSection, FlatToggle, Pill } from '../ui/Flat';
import { CheckIcon, PencilIcon } from '../ui/icons';
import { usePolicy } from '../lib/policy';
import { MediaSlot } from '../ui/MediaSlot';
import { PayoutsCard } from '../ui/Payouts';

// ── Building blocks ────────────────────────────────────────────

function Page({ title, children }: { title: string; children: ReactNode }) {
  const { go } = useStore();
  return (
    <Screen bottomInset={60}>
      <Header title={title} onBack={() => go('settings')} size={26} />
      {children}
    </Screen>
  );
}

/** A row with a switch, optionally with a line of explanation under it. */
function ToggleRow({
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
        gap: 12,
        minHeight: 56,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt>{label}</Txt>
        {body ? (
          <Txt size={12} color={c.ink3} style={{ marginTop: 2 }}>
            {body}
          </Txt>
        ) : null}
      </View>
      <Toggle on={on} onPress={() => !disabled && onPress()} label={label} />
    </View>
  );
}

/** One line of result under a form: green when it worked, plum when not. */
function Status({ ok, error }: { ok?: string | null; error?: string | null }) {
  const { c } = useTheme();
  if (!ok && !error) return null;
  return (
    <Txt size={13} color={error ? c.plum : c.accent} style={{ marginTop: 10 }}>
      {error ?? ok}
    </Txt>
  );
}

function Help({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt size={12} color={c.ink3} style={{ marginTop: 8, paddingHorizontal: 4 }}>
      {children}
    </Txt>
  );
}

/** Every settings page goes back to Réglages unless it says otherwise. */
function FlatPage(props: Parameters<typeof BasePage>[0]) {
  const { go } = useStore();
  return <BasePage onBack={props.left ? undefined : () => go('settings')} {...props} />;
}

// ── Mon profil ─────────────────────────────────────────────────

/** A text box that sits flat in a list (label on the left or above). */
function FlatInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  inline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  inline?: boolean;
}) {
  const { c, fs } = useTheme();
  const input = (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={c.ink3}
      multiline={multiline}
      autoCapitalize={multiline ? 'sentences' : 'none'}
      autoCorrect={!!multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={{
        flex: inline ? 1 : undefined,
        textAlign: inline ? 'right' : 'left',
        minHeight: multiline ? 110 : 24,
        marginTop: inline ? 0 : 6,
        color: c.ink,
        fontSize: fs(16),
        padding: 0,
      }}
    />
  );
  return inline ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <Txt size={16}>{label}</Txt>
      {input}
    </View>
  ) : (
    <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <Txt size={14} color={c.ink3}>
        {label}
      </Txt>
      {input}
    </View>
  );
}

export function ProfileSettings() {
  const { go, state, setMedia } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [showCity, setShowCity] = useState(profile?.showCity ?? true);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username);
    setBio(profile.bio ?? '');
    setCity(profile.city ?? '');
    setShowCity(profile.showCity);
  }, [profile]);

  const locate = async () => {
    setLocating(true);
    setError(null);
    try {
      const found = await currentCity();
      if (found) setCity(found);
    } catch (e) {
      setError(e instanceof Error && e.message === 'location_denied' ? t('set.locationDenied') : friendlyError(e, t));
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!session || !profile) return go('settings');
    const handle = username.trim().toLowerCase();
    const formatError = usernameError(handle);
    if (formatError && handle !== profile.username) return setError(formatError);
    setBusy(true);
    setError(null);
    try {
      if (handle !== profile.username && !(await usernameFree(handle))) throw new Error('username_taken');
      const picked = state.media['me-avatar'];
      const avatarUrl = picked ? await uploadAvatar(session.user.id, picked) : undefined;
      await saveProfile(session.user.id, {
        username: handle,
        bio: bio.trim() || null,
        city: city.trim() || null,
        showCity,
        avatarUrl,
      });
      if (picked) setMedia('me-avatar', null);
      refreshProfile();
      go('settings');
    } catch (e) {
      setError(e instanceof Error && e.message === 'username_taken' ? t('set.usernameTaken') : friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlatPage
      title={t('set.profile')}
      left={{ label: t('common.close'), onPress: () => go('settings') }}
      right={{ label: busy ? t('common.loading') : t('set.validate'), onPress: save, disabled: busy }}
    >
      <FlatSection first>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <View style={{ width: 58, height: 58, borderRadius: 999, overflow: 'hidden' }}>
            <MediaSlot id="me-avatar" shape="circle" editable remoteUri={profile?.avatarUrl ?? undefined} placeholder="" />
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={16}>{t('set.changePhoto')}</Txt>
            <Txt size={13} color={c.ink3} style={{ marginTop: 2 }}>
              {t('set.photoHelp')}
            </Txt>
          </View>
        </View>
        <FlatInput inline label={t('settings.username')} value={username} onChangeText={setUsername} />
        <FlatInput label={t('set.about')} value={bio} onChangeText={(v) => setBio(v.slice(0, 300))} placeholder={t('set.bioPlaceholder')} multiline />
      </FlatSection>
      <FlatSection>
        <FlatRow label={t('set.myLocation')} detail={locating ? t('common.loading') : city || '—'} onPress={locate} last />
        <FlatHelp>{t('set.cityWhere')}</FlatHelp>
      </FlatSection>
      <View style={{ paddingHorizontal: 18 }}>
        <Status error={error} />
      </View>
    </FlatPage>
  );
}

// ── Paramètres du compte ───────────────────────────────────────

export function AccountSettings() {
  const { go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<'idle' | 'email' | 'code'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await fn();
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  const identity = profile?.identityStatus ?? 'none';
  const canVerify = paymentsConfigured && identity !== 'verified' && identity !== 'pending';
  const verifiedEmail = !!session?.user.email_confirmed_at;
  const providers: string[] = (session?.user.app_metadata?.providers as string[] | undefined) ?? [];

  return (
    <FlatPage title={t('set.account')} onBack={() => go('settings')}>
      <FlatSection first>
        <FlatRow
          label={session?.user.email ?? '—'}
          sub={verifiedEmail ? t('settings.verified') : t('settings.toVerify')}
          right={<Pill label={t('set.change')} onPress={() => setStep(step === 'idle' ? 'email' : 'idle')} />}
          last
        />
        {step === 'email' ? (
          <View style={{ padding: 18, gap: 10 }}>
            <Field label={t('set.newEmail')} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" />
            <PrimaryButton
              label={busy ? t('common.loading') : t('set.sendCode')}
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await requestEmailChange(newEmail);
                  setStep('code');
                  setOk(t('set.codeSent').replace('{email}', newEmail.trim()));
                })
              }
            />
          </View>
        ) : null}
        {step === 'code' ? (
          <View style={{ padding: 18, gap: 10 }}>
            <Field label={t('set.code')} value={code} onChangeText={setCode} keyboardType="number-pad" />
            <PrimaryButton
              label={busy ? t('common.loading') : t('set.confirmEmail')}
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await confirmEmailChange(newEmail, code);
                  setStep('idle');
                  setCode('');
                  setOk(t('set.emailChanged'));
                })
              }
            />
          </View>
        ) : null}
        <View style={{ paddingHorizontal: 18 }}>
          <Status ok={ok} error={error} />
        </View>
      </FlatSection>

      <FlatSection>
        <FlatRow
          label={t('set.identityCheck')}
          sub={t(`set.identity.${identity}` as TranslationKey)}
          right={
            identity === 'verified' ? (
              <Pill label={t('settings.verified')} tone="muted" />
            ) : canVerify ? (
              <Pill
                label={t('verify.gateCta')}
                onPress={() =>
                  run(async () => {
                    await verifyIdentity();
                    refreshProfile();
                  })
                }
              />
            ) : undefined
          }
          last
        />
        {!paymentsConfigured ? <FlatHelp>{t('error.paymentsUnavailable')}</FlatHelp> : null}
      </FlatSection>

      <FlatSection title={t('set.connectedAccounts')}>
        {(['apple', 'google'] as const).map((p, i) => (
          <FlatRow
            key={p}
            label={p === 'apple' ? 'Apple' : 'Google'}
            right={
              providers.includes(p) ? (
                <Pill label={t('set.connected')} tone="muted" />
              ) : (
                <Txt size={14} color={c.ink3}>
                  {t('set.notConnected')}
                </Txt>
              )
            }
            last={i === 1}
          />
        ))}
        <FlatHelp>{t('set.connectedHelp')}</FlatHelp>
      </FlatSection>

      <FlatSection>
        <FlatRow label={t('set.deleteAccount')} tone="plum" onPress={() => setDeleting(true)} last />
      </FlatSection>

      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} />
    </FlatPage>
  );
}

// ── Paiements ──────────────────────────────────────────────────

export function PaymentsSettings() {
  const { go } = useStore();
  const { t } = useT();
  const addCard = useAddCard();
  const [methods, setMethods] = useState<SavedMethod[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    listPaymentMethods()
      .then(setMethods)
      .catch((e) => {
        setMethods([]);
        setError(friendlyError(e, t));
      });
  useEffect(() => {
    if (paymentsConfigured) load();
    // Loaded once when the page opens.
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlatPage title={t('set.payments')} onBack={() => go('settings')}>
      <FlatSection first title={t('set.paymentDetails')}>
        {!paymentsConfigured ? (
          <FlatHelp>{t('error.paymentsUnavailable')}</FlatHelp>
        ) : (
          <>
            {(methods ?? []).map((m) => (
              <FlatRow
                key={m.id}
                label={`${m.brand.toUpperCase()}${m.last4 ? ` •••• ${m.last4}` : ''}`}
                sub={m.expMonth ? `${t('set.expires')} ${String(m.expMonth).padStart(2, '0')}/${String(m.expYear).slice(-2)}` : undefined}
                right={<Pill label={t('set.remove')} tone="plum" onPress={() => run(() => removePaymentMethod(m.id))} disabled={busy} />}
              />
            ))}
            <FlatRow label={methods === null ? t('common.loading') : t('set.addCard')} onPress={() => run(addCard)} last />
            <FlatHelp>{t('set.cardsHelp')}</FlatHelp>
          </>
        )}
      </FlatSection>
      <FlatSection title={t('set.payouts')}>
        <View style={{ paddingHorizontal: 18, paddingBottom: 16 }}>
          <PayoutsCard />
        </View>
      </FlatSection>
      <View style={{ paddingHorizontal: 18 }}>
        <Status error={busy ? null : error} />
      </View>
    </FlatPage>
  );
}

// ── Envoi ──────────────────────────────────────────────────────

function ModeCard({ title, body, on, note }: { title: string; body: string; on: boolean; note?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ marginHorizontal: 18, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: on ? c.accent : c.line2, opacity: on ? 1 : 0.55 }}>
        <View style={{ flex: 1 }}>
          <Txt size={16} weight="semi">
            {title}
          </Txt>
          <Txt size={14} color={c.ink3} style={{ marginTop: 3 }}>
            {body}
          </Txt>
        </View>
        {on ? <CheckIcon size={20} color={c.accent} /> : null}
      </View>
      {note ? (
        <Txt size={13} color={c.ink3} style={{ marginTop: 6 }}>
          {note}
        </Txt>
      ) : null}
    </View>
  );
}

export function ShippingSettings() {
  const { go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session } = useAuth();
  const policy = usePolicy();
  const { address, loading } = useAddress(!!session);
  const [form, setForm] = useState<Address>(emptyAddress);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (address) setForm(address);
  }, [address]);
  const field = (key: keyof Address) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const save = async () => {
    setBusy(true);
    setOk(null);
    setError(null);
    try {
      await saveAddress(form);
      setOk(t('set.addressSaved'));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error && e.message === 'address_invalid' ? t('set.addressInvalid') : friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  const lines = address ? [address.fullName, address.line1, address.line2, `${address.postalCode} ${address.city}`].filter(Boolean) : [];

  return (
    <FlatPage title={t('set.shipping')} onBack={() => go('settings')}>
      <FlatSection first>
        <Txt size={20} weight="bold" style={{ paddingHorizontal: 18, paddingTop: 12 }}>
          {t('set.myAddress')}
        </Txt>
        <Pressable
          accessibilityRole="button"
          onPress={() => setEditing((v) => !v)}
          style={{ margin: 18, marginBottom: 8, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: c.line2, flexDirection: 'row', gap: 12 }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            {loading ? (
              <Txt color={c.ink3}>{t('common.loading')}</Txt>
            ) : lines.length ? (
              lines.map((l) => <Txt key={l}>{l}</Txt>)
            ) : (
              <Txt color={c.ink3}>{t('set.noAddress')}</Txt>
            )}
          </View>
          <PencilIcon size={20} color={c.ink2} />
        </Pressable>
        {editing ? (
          <View style={{ paddingHorizontal: 18, gap: 10 }}>
            <Field label={t('set.fullName')} value={form.fullName} onChangeText={field('fullName')} autoCapitalize="sentences" />
            <Field label={t('set.line1')} value={form.line1} onChangeText={field('line1')} autoCapitalize="sentences" />
            <Field label={t('set.line2')} value={form.line2} onChangeText={field('line2')} autoCapitalize="sentences" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label={t('set.postalCode')} value={form.postalCode} onChangeText={field('postalCode')} />
              </View>
              <View style={{ flex: 2 }}>
                <Field label={t('set.cityShort')} value={form.city} onChangeText={field('city')} autoCapitalize="sentences" />
              </View>
            </View>
            <Field label={t('set.phone')} value={form.phone} onChangeText={field('phone')} keyboardType="number-pad" />
            <PrimaryButton label={busy ? t('common.loading') : t('set.save')} onPress={save} disabled={busy} />
          </View>
        ) : null}
        <FlatHelp>{t('set.addressHelp')}</FlatHelp>
        <View style={{ paddingHorizontal: 18 }}>
          <Status ok={ok} error={error} />
        </View>
      </FlatSection>

      <FlatSection>
        <Txt size={20} weight="bold" style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 }}>
          {t('set.handoverModes')}
        </Txt>
        <ModeCard title={t('set.handHand')} body={t('set.handHandBody')} on />
        <ModeCard
          title={t('set.rotaDelivery')}
          body={t('set.rotaDeliveryBody')}
          on={policy.flagRotaDelivery}
          note={policy.flagRotaDelivery ? undefined : t('set.soon')}
        />
      </FlatSection>
    </FlatPage>
  );
}

// ── Sécurité ───────────────────────────────────────────────────

function PasswordForm() {
  const { c } = useTheme();
  const { t } = useT();
  const { session } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checks = passwordChecks(next);

  const submit = async () => {
    if (!passwordValid(next)) return setError(t('set.passwordRules'));
    if (next !== again) return setError(t('set.passwordMismatch'));
    setBusy(true);
    setOk(null);
    setError(null);
    try {
      await changePassword(session?.user.email ?? '', current, next);
      setCurrent('');
      setNext('');
      setAgain('');
      setOk(t('set.passwordChanged'));
    } catch (e) {
      setError(e instanceof Error && e.message === 'wrong_password' ? t('set.wrongPassword') : friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ padding: 18, gap: 10 }}>
      <Field label={t('set.currentPassword')} value={current} onChangeText={setCurrent} secure />
      <Field label={t('set.newPassword')} value={next} onChangeText={setNext} secure />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 4 }}>
        {(['length', 'upper', 'digit', 'symbol'] as const).map((k) => (
          <Txt key={k} size={12} color={checks[k] ? c.accent : c.ink3}>
            {t(`set.rule.${k}` as TranslationKey)}
          </Txt>
        ))}
      </View>
      <Field label={t('set.repeatPassword')} value={again} onChangeText={setAgain} secure />
      <PrimaryButton label={busy ? t('common.loading') : t('set.changePassword')} onPress={submit} disabled={busy} />
      <Status ok={ok} error={error} />
    </View>
  );
}

function TwoStep() {
  const { c } = useTheme();
  const { t } = useT();
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined);
  const [setup, setSetup] = useState<{ factorId: string; secret: string; uri: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    totpFactor()
      .then((f) => setFactorId(f?.status === 'verified' ? f.id : null))
      .catch(() => setFactorId(null));
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setOk(null);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error && e.message === 'wrong_code' ? t('mfa.wrong') : friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  const on = !!factorId;
  return (
    <View>
      <FlatToggle
        label={t('set.twoStep')}
        body={on ? t('set.twoStepOn') : t('set.twoStepOff')}
        on={on || !!setup}
        disabled={busy || factorId === undefined}
        onPress={() =>
          on
            ? run(async () => {
                await disableTotp(factorId!);
                setFactorId(null);
                setOk(t('set.twoStepDisabled'));
              })
            : setup
              ? setSetup(null)
              : run(async () => setSetup(await startTotpEnrollment()))
        }
        last
      />
      {setup ? (
        <View style={{ padding: 18, gap: 10 }}>
          <Txt size={13} color={c.ink2}>
            {t('set.twoStepSetup')}
          </Txt>
          <GhostButton label={t('set.openAuthenticator')} onPress={() => Linking.openURL(setup.uri).catch(() => undefined)} />
          <View style={{ padding: 12, borderRadius: 12, backgroundColor: c.surf2 }}>
            <Txt size={11} weight="semi" upper color={c.ink3}>
              {t('set.secretKey')}
            </Txt>
            <Text selectable style={{ color: c.ink, fontSize: 15, marginTop: 4, letterSpacing: 1 }}>
              {setup.secret}
            </Text>
          </View>
          <Field label={t('mfa.code')} value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="123456" />
          <PrimaryButton
            label={busy ? t('common.loading') : t('set.activate')}
            disabled={busy}
            onPress={() =>
              run(async () => {
                await verifyTotp(setup.factorId, code.replace(/\D/g, ''));
                setFactorId(setup.factorId);
                setSetup(null);
                setCode('');
                setOk(t('set.twoStepEnabled'));
              })
            }
          />
        </View>
      ) : null}
      <View style={{ paddingHorizontal: 18 }}>
        <Status ok={ok} error={error} />
      </View>
    </View>
  );
}

export function SecuritySettings() {
  const { go } = useStore();
  const { t } = useT();
  const [open, setOpen] = useState<'password' | 'twoStep' | 'sessions' | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toggle = (k: 'password' | 'twoStep' | 'sessions') => setOpen((v) => (v === k ? null : k));
  return (
    <FlatPage title={t('set.security')} onBack={() => go('settings')}>
      <FlatIntro title={t('set.securityTitle')} body={t('set.securityBody')} />
      <FlatRow label={t('set.password')} sub={t('set.passwordSub')} onPress={() => toggle('password')} />
      {open === 'password' ? <PasswordForm /> : null}
      <FlatRow label={t('set.twoStep')} sub={t('set.twoStepSub')} onPress={() => toggle('twoStep')} />
      {open === 'twoStep' ? <TwoStep /> : null}
      <FlatRow label={t('set.sessions')} sub={t('set.sessionsSub')} onPress={() => toggle('sessions')} last={open !== 'sessions'} />
      {open === 'sessions' ? (
        <View style={{ padding: 18 }}>
          <GhostButton
            label={t('set.signOutOthers')}
            onPress={() =>
              signOutOtherDevices()
                .then(() => setOk(t('set.signedOutOthers')))
                .catch((e) => setError(friendlyError(e, t)))
            }
          />
        </View>
      ) : null}
      <View style={{ paddingHorizontal: 18 }}>
        <Status ok={ok} error={error} />
      </View>
    </FlatPage>
  );
}

// ── Notifications ──────────────────────────────────────────────

export function PushSettings() {
  const { t } = useT();
  const { session } = useAuth();
  const { prefs, loading, update } = usePreferences(!!session);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleAll = async () => {
    setOk(null);
    setError(null);
    try {
      if (prefs.pushEnabled) return await update({ pushEnabled: false });
      const result = await registerForPush();
      if ('error' in result) {
        if (result.error === 'denied') {
          setError(t('set.pushDenied'));
          Linking.openSettings();
        } else {
          setError(t(result.error === 'no_project' ? 'set.pushNoProject' : 'set.pushUnsupported'));
        }
        return;
      }
      await update({ pushEnabled: true, pushToken: result.token });
      setOk(t('set.pushOn'));
    } catch (e) {
      setError(friendlyError(e, t));
    }
  };

  const test = async () => {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return setError(t('set.pushDenied'));
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Rota', body: t('set.pushTestBody') },
      trigger: null,
    });
  };

  const set = (patch: Parameters<typeof update>[0]) => update(patch).catch((e) => setError(friendlyError(e, t)));
  const off = !prefs.pushEnabled;
  return (
    <FlatPage title={t('set.push')}>
      <FlatSection first title={t('set.pushImportant')}>
        <FlatToggle
          label={t('set.catBookings')}
          body={t('set.catBookingsBody')}
          on={prefs.pushBookings}
          disabled={off}
          onPress={() => set({ pushBookings: !prefs.pushBookings })}
        />
        <FlatToggle
          label={t('set.catClaims')}
          body={t('set.catClaimsBody')}
          on={prefs.pushClaims}
          disabled={off}
          onPress={() => set({ pushClaims: !prefs.pushClaims })}
          last
        />
      </FlatSection>
      <FlatSection title={t('set.pushSecondary')}>
        <FlatToggle
          label={t('set.catReminders')}
          body={t('set.catRemindersBody')}
          on={prefs.pushReminders}
          disabled={off}
          onPress={() => set({ pushReminders: !prefs.pushReminders })}
          last
        />
      </FlatSection>
      <FlatSection title={t('set.pushGeneral')}>
        <FlatToggle label={t('set.pushAllow')} on={prefs.pushEnabled} onPress={toggleAll} disabled={loading} />
        <FlatRow label={t('set.pushTest')} onPress={test} last />
      </FlatSection>
      <View style={{ paddingHorizontal: 18 }}>
        <Status ok={ok} error={error} />
      </View>
    </FlatPage>
  );
}

export function EmailSettings() {
  const { t } = useT();
  const { session } = useAuth();
  const { prefs, loading, update } = usePreferences(!!session);
  const [error, setError] = useState<string | null>(null);
  return (
    <FlatPage title={t('set.email')}>
      <FlatSection first title={t('set.emailAlways')}>
        {(['set.catBookings', 'set.catClaims', 'set.catPayouts'] as const).map((k, i, all) => (
          <FlatRow key={k} label={t(k)} detail={t('set.always')} last={i === all.length - 1} />
        ))}
        <FlatHelp>{t('set.emailAlwaysHelp')}</FlatHelp>
      </FlatSection>
      <FlatSection title={t('set.emailOptional')}>
        <FlatToggle
          label={t('set.catReminders')}
          body={t('set.catRemindersBody')}
          on={prefs.emailReminders}
          disabled={loading}
          onPress={() => update({ emailReminders: !prefs.emailReminders }).catch((e) => setError(friendlyError(e, t)))}
          last
        />
        <FlatHelp>{t('set.noMarketing')}</FlatHelp>
      </FlatSection>
      <View style={{ paddingHorizontal: 18 }}>
        <Status error={error} />
      </View>
    </FlatPage>
  );
}

// ── Langue, apparence, confidentialité ─────────────────────────

export function LanguageSettings() {
  const { c } = useTheme();
  const { t, lang, setLang } = useT();
  const { session } = useAuth();
  const choose = (next: Lang) => {
    setLang(next);
    // E-mails and push go out in this language too.
    if (session && supabase) supabase.from('profiles').update({ lang: next }).eq('id', session.user.id).then(() => {});
  };
  return (
    <Page title={t('settings.language')}>
      <Group>
        {LANGUAGES.map((option, i) => (
          <Pressable
            key={option.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: lang === option.key }}
            onPress={() => choose(option.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 52,
              paddingHorizontal: 15,
              borderBottomWidth: i < LANGUAGES.length - 1 ? 1 : 0,
              borderBottomColor: c.line,
            }}
          >
            <Radio on={lang === option.key} />
            <Txt style={{ flex: 1 }}>{option.native}</Txt>
          </Pressable>
        ))}
      </Group>
    </Page>
  );
}

export const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

export function ThemeSettings() {
  const { state, set } = useStore();
  const { t } = useT();
  return (
    <Page title={t('set.theme')}>
      <Group>
        {THEME_MODES.map((mode) => (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityState={{ selected: state.themeMode === mode }}
            onPress={() => set({ themeMode: mode })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 15 }}
          >
            <Radio on={state.themeMode === mode} />
            <Txt style={{ flex: 1 }}>{t(`set.themeMode.${mode}` as TranslationKey)}</Txt>
          </Pressable>
        ))}
      </Group>
      <Help>{t('set.themeHelp')}</Help>
    </Page>
  );
}

export function PrivacySettings() {
  const { t } = useT();
  const { session, profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCity, setShowCity] = useState(profile?.showCity ?? true);
  useEffect(() => {
    if (profile) setShowCity(profile.showCity);
  }, [profile]);

  const toggleCity = async () => {
    const next = !showCity;
    setShowCity(next);
    if (!session) return;
    try {
      await saveProfile(session.user.id, { showCity: next });
      refreshProfile();
    } catch (e) {
      setShowCity(!next);
      setError(friendlyError(e, t));
    }
  };

  const exportData = async () => {
    setBusy(true);
    setError(null);
    try {
      await exportMyData();
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <FlatPage title={t('set.privacy')}>
      <FlatSection first title={t('set.privacyProfile')}>
        <FlatToggle label={t('set.showCity')} body={t('set.showCityBody')} on={showCity} onPress={toggleCity} last />
      </FlatSection>
      <FlatSection title={t('set.privacyData')}>
        <FlatRow label={busy ? t('common.loading') : t('set.downloadData')} onPress={exportData} last />
        <FlatHelp>{t('set.downloadHelp')}</FlatHelp>
      </FlatSection>
      <FlatSection title={t('set.whoSees')}>
        <FlatHelp>{t('set.whoSeesBody')}</FlatHelp>
      </FlatSection>
      <View style={{ paddingHorizontal: 18 }}>
        <Status error={error} />
      </View>
    </FlatPage>
  );
}
