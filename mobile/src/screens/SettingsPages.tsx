/**
 * The screens behind Settings, laid out like Vinted's: one list, each row
 * opens a page, every switch and button talks to the real backend.
 */
import * as Notifications from 'expo-notifications';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
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

// ── Mon profil ─────────────────────────────────────────────────

export function ProfileSettings() {
  const { go, state, setMedia } = useStore();
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
    if (!session || !profile) return;
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
    <Page title={t('set.profile')}>
      <View style={{ marginTop: 20, alignItems: 'center' }}>
        <View style={{ width: 96, height: 96, borderRadius: 999, overflow: 'hidden' }}>
          <MediaSlot id="me-avatar" shape="circle" editable remoteUri={profile?.avatarUrl ?? undefined} placeholder={t('set.photo')} />
        </View>
        <Help>{t('set.photoHelp')}</Help>
      </View>
      <View style={{ marginTop: 16, gap: 10 }}>
        <Field label={t('settings.username')} value={username} onChangeText={setUsername} hint={t('set.usernameHelp')} />
        <Field
          label={t('set.bio')}
          value={bio}
          onChangeText={(v) => setBio(v.slice(0, 300))}
          placeholder={t('set.bioPlaceholder')}
          autoCapitalize="sentences"
          multiline
        />
        <Field label={t('set.city')} value={city} onChangeText={setCity} autoCapitalize="sentences" />
      </View>
      <GhostButton label={locating ? t('common.loading') : t('set.useLocation')} onPress={locate} style={{ marginTop: 10 }} />
      <Group>
        <ToggleRow label={t('set.showCity')} on={showCity} onPress={() => setShowCity((v) => !v)} last />
      </Group>
      <Status error={error} />
      <PrimaryButton label={busy ? t('common.loading') : t('set.save')} onPress={save} disabled={busy} style={{ marginTop: 18 }} />
    </Page>
  );
}

// ── Paramètres du compte ───────────────────────────────────────

export function AccountSettings() {
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
  const [confirm, setConfirm] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const remove = async () => {
    setBusy(true);
    setDeleteError(null);
    try {
      await closeAccount(confirm);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setDeleteError(
        code === 'active_rentals' || code === 'open_claims'
          ? t('set.deleteBlockedRentals')
          : code === 'payouts_pending'
            ? t('set.deleteBlockedPayouts')
            : code === 'confirm'
              ? t('set.deleteConfirmWrong')
              : friendlyError(e, t),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title={t('set.account')}>
      <SectionLabel>{t('settings.email')}</SectionLabel>
      <Group>
        <Row
          label={session?.user.email ?? '—'}
          detail={session?.user.email_confirmed_at ? t('settings.verified') : t('settings.toVerify')}
          detailColor={session?.user.email_confirmed_at ? c.accent : c.plum}
          onPress={() => setStep(step === 'idle' ? 'email' : 'idle')}
          last
        />
      </Group>
      {step === 'email' ? (
        <View style={{ marginTop: 10, gap: 10 }}>
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
        <View style={{ marginTop: 10, gap: 10 }}>
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
      <Status ok={ok} error={error} />

      <SectionLabel>{t('closet.identity')}</SectionLabel>
      <Group>
        <Row
          label={t('set.identityCheck')}
          detail={t(`set.identity.${identity}` as TranslationKey)}
          detailColor={identity === 'verified' ? c.accent : undefined}
          onPress={
            canVerify
              ? () =>
                  run(async () => {
                    await verifyIdentity();
                    refreshProfile();
                  })
              : undefined
          }
          last
        />
      </Group>
      <Help>{canVerify ? t('settings.identityHelp') : paymentsConfigured ? '' : t('error.paymentsUnavailable')}</Help>

      <SectionLabel>{t('set.dangerZone')}</SectionLabel>
      <Group>
        <Row label={t('set.deleteAccount')} detailColor={c.plum} onPress={() => setDeleting((v) => !v)} last />
      </Group>
      {deleting ? (
        <View style={{ marginTop: 10, gap: 10 }}>
          <Txt size={13} color={c.ink2}>
            {t('set.deleteBody')}
          </Txt>
          <Field label={t('set.deleteType')} value={confirm} onChangeText={setConfirm} autoCapitalize="none" />
          <PrimaryButton
            label={busy ? t('common.loading') : t('set.deleteForever')}
            tone="plum"
            disabled={busy || confirm.trim().length === 0}
            onPress={remove}
          />
          <Status error={deleteError} />
        </View>
      ) : null}
    </Page>
  );
}

// ── Paiements ──────────────────────────────────────────────────

export function PaymentsSettings() {
  const { c } = useTheme();
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
    <Page title={t('set.payments')}>
      <SectionLabel>{t('set.paymentMethods')}</SectionLabel>
      {!paymentsConfigured ? (
        <Help>{t('error.paymentsUnavailable')}</Help>
      ) : (
        <>
          <Group>
            {(methods ?? []).map((m) => (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 56,
                  paddingHorizontal: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: c.line,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Txt weight="semi">
                    {m.brand.toUpperCase()} {m.last4 ? `•••• ${m.last4}` : ''}
                  </Txt>
                  {m.expMonth ? (
                    <Txt size={12} color={c.ink3}>
                      {t('set.expires')} {String(m.expMonth).padStart(2, '0')}/{String(m.expYear).slice(-2)}
                    </Txt>
                  ) : null}
                </View>
                <Pressable onPress={() => run(() => removePaymentMethod(m.id))} hitSlop={8}>
                  <Txt size={13} weight="semi" color={c.plum}>
                    {t('set.remove')}
                  </Txt>
                </Pressable>
              </View>
            ))}
            <Row
              label={methods === null ? t('common.loading') : t('set.addCard')}
              onPress={() => run(addCard)}
              last
            />
          </Group>
          <Help>{t('set.cardsHelp')}</Help>
        </>
      )}
      <SectionLabel>{t('set.payouts')}</SectionLabel>
      <PayoutsCard />
      <Status error={busy ? null : error} />
    </Page>
  );
}

// ── Envoi ──────────────────────────────────────────────────────

export function ShippingSettings() {
  const { t } = useT();
  const { session } = useAuth();
  const { address, loading } = useAddress(!!session);
  const [form, setForm] = useState<Address>(emptyAddress);
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
    } catch (e) {
      setError(e instanceof Error && e.message === 'address_invalid' ? t('set.addressInvalid') : friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title={t('set.shipping')}>
      <SectionLabel>{t('set.myAddress')}</SectionLabel>
      {loading ? (
        <Help>{t('common.loading')}</Help>
      ) : (
        <View style={{ marginTop: 10, gap: 10 }}>
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
        </View>
      )}
      <Help>{t('set.addressHelp')}</Help>
      <Status ok={ok} error={error} />
      <PrimaryButton label={busy ? t('common.loading') : t('set.save')} onPress={save} disabled={busy || loading} style={{ marginTop: 16 }} />
    </Page>
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
    <View style={{ marginTop: 10, gap: 10 }}>
      <Field label={t('set.currentPassword')} value={current} onChangeText={setCurrent} secure />
      <Field label={t('set.newPassword')} value={next} onChangeText={setNext} secure />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 4 }}>
        {(['length', 'upper', 'digit', 'symbol'] as const).map((k) => (
          <Txt key={k} size={12} color={checks[k] ? c.accent : c.ink3}>
            {checks[k] ? '✓' : '·'} {t(`set.rule.${k}` as TranslationKey)}
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
    <>
      <Group>
        <ToggleRow
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
      </Group>
      {setup ? (
        <View style={{ marginTop: 10, gap: 10 }}>
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
      <Status ok={ok} error={error} />
    </>
  );
}

export function SecuritySettings() {
  const { t } = useT();
  const [open, setOpen] = useState<'password' | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <Page title={t('set.security')}>
      <SectionLabel>{t('set.password')}</SectionLabel>
      <Group>
        <Row label={t('set.changePassword')} onPress={() => setOpen(open === 'password' ? null : 'password')} last />
      </Group>
      {open === 'password' ? <PasswordForm /> : null}

      <SectionLabel>{t('set.twoStep')}</SectionLabel>
      <TwoStep />

      <SectionLabel>{t('set.sessions')}</SectionLabel>
      <Group>
        <Row
          label={t('set.signOutOthers')}
          onPress={() =>
            signOutOtherDevices()
              .then(() => setOk(t('set.signedOutOthers')))
              .catch((e) => setError(friendlyError(e, t)))
          }
          last
        />
      </Group>
      <Status ok={ok} error={error} />
    </Page>
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
  return (
    <Page title={t('set.push')}>
      <Group>
        <ToggleRow label={t('set.pushAllow')} on={prefs.pushEnabled} onPress={toggleAll} disabled={loading} last />
      </Group>
      <SectionLabel>{t('set.pushWhat')}</SectionLabel>
      <Group>
        <ToggleRow
          label={t('set.catBookings')}
          body={t('set.catBookingsBody')}
          on={prefs.pushBookings}
          disabled={!prefs.pushEnabled}
          onPress={() => set({ pushBookings: !prefs.pushBookings })}
        />
        <ToggleRow
          label={t('set.catReminders')}
          body={t('set.catRemindersBody')}
          on={prefs.pushReminders}
          disabled={!prefs.pushEnabled}
          onPress={() => set({ pushReminders: !prefs.pushReminders })}
        />
        <ToggleRow
          label={t('set.catClaims')}
          body={t('set.catClaimsBody')}
          on={prefs.pushClaims}
          disabled={!prefs.pushEnabled}
          onPress={() => set({ pushClaims: !prefs.pushClaims })}
          last
        />
      </Group>
      <GhostButton label={t('set.pushTest')} onPress={test} style={{ marginTop: 16 }} />
      <Status ok={ok} error={error} />
    </Page>
  );
}

export function EmailSettings() {
  const { c } = useTheme();
  const { t } = useT();
  const { session } = useAuth();
  const { prefs, loading, update } = usePreferences(!!session);
  const [error, setError] = useState<string | null>(null);
  return (
    <Page title={t('set.email')}>
      <SectionLabel>{t('set.emailAlways')}</SectionLabel>
      <Group>
        {(['set.catBookings', 'set.catClaims', 'set.catPayouts'] as const).map((k, i, all) => (
          <Row
            key={k}
            label={t(k)}
            detail={t('set.always')}
            detailColor={c.ink3}
            last={i === all.length - 1}
          />
        ))}
      </Group>
      <Help>{t('set.emailAlwaysHelp')}</Help>
      <SectionLabel>{t('set.emailOptional')}</SectionLabel>
      <Group>
        <ToggleRow
          label={t('set.catReminders')}
          body={t('set.catRemindersBody')}
          on={prefs.emailReminders}
          disabled={loading}
          onPress={() => update({ emailReminders: !prefs.emailReminders }).catch((e) => setError(friendlyError(e, t)))}
          last
        />
      </Group>
      <Help>{t('set.noMarketing')}</Help>
      <Status error={error} />
    </Page>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    <Page title={t('set.privacy')}>
      <SectionLabel>{t('set.myData')}</SectionLabel>
      <Group>
        <Row label={busy ? t('common.loading') : t('set.downloadData')} onPress={exportData} last />
      </Group>
      <Help>{t('set.downloadHelp')}</Help>
      <SectionLabel>{t('set.whoSees')}</SectionLabel>
      <Help>{t('set.whoSeesBody')}</Help>
      <Status error={error} />
    </Page>
  );
}
