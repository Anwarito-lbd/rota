import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Linking, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { permissions, rules } from '../data/catalog';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { appleSignInAvailable, backendConfigured, useAuth } from '../lib/auth';
import { LEGAL_URLS } from '../lib/config';
import { AppleIcon, CheckIcon } from '../ui/icons';
import { usePermissions, type PermStatus } from '../lib/permissions';
import { emailValid, passwordChecks, passwordValid, usernameError } from '../state/auth';
import { useStore } from '../state/store';
import { FONT, OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import {
  Amount,
  BackButton,
  Card,
  Check,
  Display,
  Field,
  FooterBar,
  PrimaryButton,
  Screen,
  Txt,
} from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';
import { FadeIn, Logo, PressScale } from '../ui/motion';
import { useT, type TranslationKey } from '../i18n';

function SocialButton({
  label,
  onPress,
  filled,
  icon,
}: {
  label: string;
  onPress: () => void;
  filled?: boolean;
  icon?: React.ReactNode;
}) {
  const { fs } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        backgroundColor: filled ? OVER_INK : 'rgba(247,242,248,0.08)',
        borderWidth: filled ? 0 : 1,
        borderColor: 'rgba(247,242,248,0.3)',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {icon}
      <Txt size={17} weight="semi" color={filled ? '#2A1033' : OVER_INK} style={{ fontSize: fs(17) }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/**
 * Welcome (Figma 01): app tile, brand lines, Apple (iOS) and Google sign-in,
 * e-mail sign-up, sign-in, and the legal links, over our hero photo.
 */
function Welcome() {
  const { set } = useStore();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { signInWithApple, signInWithGoogle } = useAuth();
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    appleSignInAvailable().then(setApple);
  }, []);

  const social = async (provider: 'apple' | 'google') => {
    setBusy(provider);
    setError(null);
    // New members go through the community rules and permissions next.
    set({ obStep: 1, authErr: null });
    const result = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
    setBusy(null);
    if (result) {
      set({ obStep: 0 });
      if (result !== 'cancelled') setError(result);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0C0A0D' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <MediaSlot
          id="ob-hero"
          shape="rect"
          tone="media"
          placeholder="Photo d'accueil"
          remoteUri="https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=80"
        />
      </View>
      <LinearGradient
        colors={['rgba(12,10,13,0.35)', 'rgba(12,10,13,0.2)', 'rgba(12,10,13,0.88)', '#0C0A0D']}
        locations={[0, 0.28, 0.62, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ flex: 1, minHeight: 0 }} />
      <FadeIn style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 18 }}>
        <Image
          source={require('../../assets/icon.png')}
          accessibilityLabel="Rota"
          style={{ width: 72, height: 72, borderRadius: 18 }}
        />
        <Txt size={13} weight="semi" color="#E2A9F1" style={{ marginTop: 14 }}>
          {t('welcome.eyebrow')}
        </Txt>
        <Display brand size={46} color={OVER_INK} style={{ marginTop: 10 }}>
          Wear it once.
        </Display>
        <Display size={46} color="#E2A9F1" italic>
          Pass it on.
        </Display>
        <Txt size={15} color="rgba(247,242,248,0.78)" style={{ marginTop: 12 }}>
          {t('welcome.body')}
        </Txt>

        <View style={{ marginTop: 22, gap: 10 }}>
          {apple ? (
            <PressScale
              haptic="light"
              disabled={!!busy}
              onPress={() => social('apple')}
              accessibilityLabel={t('welcome.apple')}
              style={{
                minHeight: 54,
                borderRadius: 999,
                backgroundColor: OVER_INK,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <AppleIcon size={17} color="#0C0A0D" />
              <Txt size={17} weight="semi" color="#0C0A0D">
                {busy === 'apple' ? t('common.loading') : t('welcome.apple')}
              </Txt>
            </PressScale>
          ) : null}
          <PressScale
            haptic="light"
            disabled={!!busy}
            onPress={() => social('google')}
            accessibilityLabel={t('welcome.google')}
            style={{
              minHeight: 54,
              borderRadius: 999,
              backgroundColor: 'rgba(247,242,248,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(247,242,248,0.22)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <GoogleIcon />
            <Txt size={17} weight="semi" color={OVER_INK}>
              {busy === 'google' ? t('common.loading') : t('welcome.google')}
            </Txt>
          </PressScale>
          {error ? (
            <Txt size={13} center color="#F2A0C4">
              {error}
            </Txt>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => set({ obStep: 'auth', authMode: 'signup', authErr: null })}
            style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt size={16} weight="semi" color="#E2A9F1">
              {t('welcome.email')}
            </Txt>
          </Pressable>
          {!backendConfigured ? (
            <PressScale
              haptic="light"
              onPress={() => set({ signedIn: true, emailVerified: true, obStep: 1, authErr: null })}
              style={{
                minHeight: 48,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#E2A9F1',
                paddingHorizontal: 16,
              }}
            >
              <Txt size={16} weight="bold" center color="#2A1033">
                {t('demo.enter')}
              </Txt>
            </PressScale>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => set({ obStep: 'auth', authMode: 'login', authErr: null })}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}
        >
          <Txt size={14} color="rgba(247,242,248,0.7)">
            {t('welcome.haveAccount')}
          </Txt>
          <Txt size={14} weight="bold" color={OVER_INK}>
            {t('welcome.login')}
          </Txt>
        </Pressable>

        <Txt size={12} center color="rgba(247,242,248,0.55)" style={{ marginTop: 8 }}>
          {t('welcome.legal')}
        </Txt>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 6 }}>
          {[
            [t('welcome.terms'), LEGAL_URLS.terms],
            [t('welcome.privacy'), LEGAL_URLS.privacy],
          ].map(([label, url]) => (
            <Pressable key={url} accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(url)} hitSlop={8}>
              <Txt size={12} weight="semi" color={OVER_INK} style={{ textDecorationLine: 'underline' }}>
                {label}
              </Txt>
            </Pressable>
          ))}
        </View>
      </FadeIn>
    </View>
  );
}

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
    </Svg>
  );
}

function PasswordMeter({ pw }: { pw: string }) {
  const { c } = useTheme();
  const checks = passwordChecks(pw);
  const score = Object.values(checks).filter(Boolean).length;
  const items: [keyof typeof checks, string][] = [
    ['length', '8 caractères minimum'],
    ['upper', 'Une majuscule'],
    ['digit', 'Un chiffre'],
    ['symbol', 'Un symbole (!, ?, #…)'],
  ];

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              backgroundColor: i < score ? (score === 4 ? c.accent : c.plum) : c.surf2,
            }}
          />
        ))}
      </View>
      <View style={{ marginTop: 8, gap: 4 }}>
        {items.map(([key, text]) => (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 99,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: checks[key] ? c.accent : c.surf2,
              }}
            >
              {checks[key] ? (
                <CheckIcon size={11} color={c.onAccent} />
              ) : null}
            </View>
            <Txt size={12} color={checks[key] ? c.ink2 : c.ink3}>
              {text}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

function ErrorBanner({ children }: { children: string }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: c.plumSoft,
        borderWidth: 1,
        borderColor: c.plum,
      }}
    >
      <Txt size={13}>{children}</Txt>
    </View>
  );
}

function AuthForm() {
  const { state, set } = useStore();
  const { c } = useTheme();
  const { signUp, signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const signup = state.authMode !== 'login';

  const submit = async () => {
    if (busy) return;

    if (signup) {
      const nameErr = usernameError(state.username);
      if (nameErr) return set({ authErr: nameErr });
      if (!emailValid(state.email)) return set({ authErr: 'Cet e-mail ne semble pas valide.' });
      if (!passwordValid(state.pw)) {
        return set({ authErr: 'Le mot de passe ne remplit pas encore toutes les conditions.' });
      }
      setBusy(true);
      const error = await signUp({ username: state.username, email: state.email, password: state.pw });
      setBusy(false);
      if (error) return set({ authErr: error });
      return set({ obStep: 'otp', otpInput: '', otpErr: false, authErr: null });
    }

    if (!emailValid(state.email)) return set({ authErr: 'Entrez l’e-mail de votre compte.' });
    if (!state.pw) return set({ authErr: 'Entrez votre mot de passe.' });
    setBusy(true);
    const error = await signIn({ email: state.email, password: state.pw });
    setBusy(false);
    if (error) return set({ authErr: error });
    return set({ signedIn: true, screen: 'feed', authErr: null });
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={140}>
        <BackButton onPress={() => set({ obStep: 0, authErr: null })} />
        <Display size={36} style={{ marginTop: 16 }}>
          {signup ? 'Créer votre compte' : 'Content de vous revoir'}
        </Display>
        <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
          {signup
            ? "Votre nom d'utilisateur est public et unique : c'est lui que les autres membres voient sur vos annonces."
            : 'Entrez le nom d’utilisateur ou l’e-mail utilisé à l’inscription.'}
        </Txt>

        <View style={{ marginTop: 22, gap: 10 }}>
          {signup ? (
            <Field
              label="Nom d'utilisateur"
              value={state.username}
              placeholder="camille.rota"
              hint="Minuscules, chiffres, point ou tiret bas · 3 à 20 caractères"
              onChangeText={(v) => set({ username: v.toLowerCase(), authErr: null })}
            />
          ) : null}
          <Field
            label="E-mail"
            value={state.email}
            placeholder="vous@exemple.fr"
            keyboardType="email-address"
            onChangeText={(v) => set({ email: v, authErr: null })}
          />
          <View>
            <Field
              label="Mot de passe"
              value={state.pw}
              secure
              placeholder="8 caractères, majuscule, chiffre, symbole"
              onChangeText={(v) => set({ pw: v, authErr: null })}
            />
            {signup ? <PasswordMeter pw={state.pw} /> : null}
          </View>
        </View>

        {state.authErr ? <ErrorBanner>{state.authErr}</ErrorBanner> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => set({ authMode: signup ? 'login' : 'signup', authErr: null })}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}
        >
          <Txt size={14} color={c.ink2}>
            {signup ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?'}
          </Txt>
          <Txt size={14} weight="bold" color={c.accent}>
            {signup ? 'Se connecter' : "S'inscrire"}
          </Txt>
        </Pressable>
      </Screen>

      <FooterBar>
        <PrimaryButton
          label={busy ? 'Un instant…' : signup ? 'Créer le compte' : 'Se connecter'}
          disabled={busy}
          onPress={submit}
        />
      </FooterBar>
    </View>
  );
}

/** Supabase can be set to 6, 7 or 8 digits — accept whatever it sends. */
const CODE_MIN = 6;
const CODE_MAX = 8;

function CodeField({ value, onChangeText, label }: { value: string; onChangeText: (v: string) => void; label: string }) {
  const { c, amount } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={(v) => onChangeText(v.replace(/\D/g, '').slice(0, CODE_MAX))}
      keyboardType="number-pad"
      maxLength={CODE_MAX}
      accessibilityLabel={label}
      placeholder="000000"
      placeholderTextColor={c.ink3}
      textContentType="oneTimeCode"
      style={[
        amount(value.length > 6 ? 24 : 28),
        {
          marginTop: 20,
          paddingVertical: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.line2,
          backgroundColor: c.surf,
          color: c.ink,
          textAlign: 'center',
          letterSpacing: value.length > 6 ? 6 : 10,
        },
      ]}
    />
  );
}

function EmailOtp() {
  const { state, set } = useStore();
  const { c } = useTheme();
  const { confirmEmail, resendCode } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    const failure = await confirmEmail({ email: state.email, code: state.otpInput });
    setBusy(false);
    if (failure) {
      setError(failure);
      return set({ otpErr: true });
    }
    set({ signedIn: true, emailVerified: true, otpErr: false, obStep: 1 });
  };

  const resend = async () => {
    setError(null);
    setResent(false);
    const failure = await resendCode(state.email);
    if (failure) setError(failure);
    else setResent(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={140}>
        <BackButton onPress={() => set({ obStep: 'auth' })} />
        <Display size={36} style={{ marginTop: 16 }}>
          Vérifiez votre e-mail
        </Display>
        <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
          Nous avons envoyé un code à {state.email || 'votre adresse'}. Il expire dans 1 heure.
        </Txt>

        <CodeField
          value={state.otpInput}
          label="Code reçu par e-mail"
          onChangeText={(v) => {
            setError(null);
            set({ otpInput: v, otpErr: false });
          }}
        />

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        <Pressable
          accessibilityRole="button"
          onPress={resend}
          style={{ minHeight: 44, justifyContent: 'center', marginTop: 10 }}
        >
          <Txt size={14} weight="bold" color={c.accent}>
            {resent ? 'Nouveau code envoyé' : 'Renvoyer le code'}
          </Txt>
        </Pressable>

        <Txt size={13} color={c.ink3} style={{ marginTop: 6 }}>
          Pensez à regarder dans les spams. L'e-mail vient de no-reply@therotaapp.com.
        </Txt>
      </Screen>

      <FooterBar>
        <PrimaryButton
          label={busy ? 'Vérification…' : 'Vérifier mon e-mail'}
          onPress={confirm}
          disabled={busy || state.otpInput.length < CODE_MIN}
        />
      </FooterBar>
    </View>
  );
}

function RulesGate() {
  const { state, set } = useStore();
  const { c } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={140}>
        <Txt size={12} weight="semi" upper color={c.accent}>
          Étape 1 sur 2
        </Txt>
        <Display size={36} style={{ marginTop: 8 }}>
          Comment on se traite ici
        </Display>
        <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
          Rota ne fonctionne que parce que les pièces reviennent comme elles sont parties. Quatre règles, et elles sont
          appliquées.
        </Txt>

        <View style={{ marginTop: 20, gap: 10 }}>
          {rules.map((r) => (
            <Card key={r.title}>
              <Txt weight="bold">{r.title}</Txt>
              <Txt size={14} color={c.ink2} style={{ marginTop: 5 }}>
                {r.body}
              </Txt>
            </Card>
          ))}
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: state.agreed }}
          onPress={() => set((s) => ({ agreed: !s.agreed }))}
          style={{
            marginTop: 16,
            flexDirection: 'row',
            gap: 12,
            alignItems: 'flex-start',
            padding: 15,
            borderRadius: 16,
            backgroundColor: c.surf2,
          }}
        >
          <Check on={state.agreed} />
          <Txt size={14} style={{ flex: 1 }}>
            J'accepte les règles de la communauté et je comprends que le harcèlement, les contrefaçons ou les paiements
            hors application entraînent la suppression du compte.
          </Txt>
        </Pressable>

        <Txt size={13} color={c.ink3} style={{ marginTop: 12 }}>
          Vous pouvez signaler une annonce, un message ou un profil depuis le menu •••. Les signalements sont examinés
          sous 24 heures.
        </Txt>
      </Screen>

      <FooterBar>
        <PrimaryButton
          label="Accepter et continuer"
          disabled={!state.agreed}
          onPress={() => set({ obStep: 2 })}
        />
      </FooterBar>
    </View>
  );
}

const PERM_LABEL: Record<PermStatus, string> = {
  granted: 'Activé',
  denied: 'Activer',
  undetermined: 'Activer',
  blocked: 'Réglages',
};

const PERM_ICON: Record<'camera' | 'microphone' | 'photos' | 'location', string> = {
  camera:
    'M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM12 16.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8z',
  microphone: 'M12 3.5a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0v-5a3 3 0 0 1 3-3zM6 11.5a6 6 0 0 0 12 0M12 17.5v3',
  photos: 'M4 5h16v14H4zM4 15l4.5-4.5 3.5 3.5 2.5-2.5L20 17',
  location: 'M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21zM12 12.1a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z',
};

/** Permissions, explained before the system asks (Figma 10). */
function Perms() {
  const { go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { statuses, request } = usePermissions();
  const keys = ['camera', 'microphone', 'photos', 'location'] as const;

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={140}>
        <Txt size={13} weight="semi" color={c.accent}>
          {t('perm.step')}
        </Txt>
        <Display size={34} style={{ marginTop: 8 }}>
          {t('perm.title')}
        </Display>
        <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
          {t('perm.body')}
        </Txt>

        <View style={{ marginTop: 20, borderRadius: 20, backgroundColor: c.surf, overflow: 'hidden' }}>
          {keys.map((key, i) => {
            const status = statuses[key];
            const on = status === 'granted';
            const blocked = status === 'blocked';
            return (
              <View
                key={key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: i === keys.length - 1 ? 0 : 1,
                  borderBottomColor: c.line,
                }}
              >
                <Svg width={22} height={22} viewBox="0 0 24 24">
                  <Path d={PERM_ICON[key]} stroke={c.accent} strokeWidth={1.7} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                </Svg>
                <View style={{ flex: 1 }}>
                  <Txt weight="semi">{t(`perm.${key}` as TranslationKey)}</Txt>
                  <Txt size={13} color={c.ink2} style={{ marginTop: 2 }}>
                    {blocked ? t('perm.blocked') : t(`perm.${key}Body` as TranslationKey)}
                  </Txt>
                </View>
                <PressScale
                  haptic="light"
                  accessibilityState={{ selected: on, disabled: on }}
                  onPress={() => {
                    if (blocked) Linking.openSettings().catch(() => undefined);
                    else if (!on) request(key);
                  }}
                  style={{
                    minHeight: 36,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    justifyContent: 'center',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: on ? c.accentSoft : c.surf2,
                  }}
                >
                  {on ? (
                    <CheckIcon size={15} color={c.accent} />
                  ) : null}
                  <Txt size={14} weight="bold" color={c.accent}>
                    {on ? t('perm.active') : blocked ? t('perm.settings') : t('perm.activate')}
                  </Txt>
                </PressScale>
              </View>
            );
          })}
        </View>
      </Screen>

      <FooterBar>
        <PrimaryButton label={t('perm.start')} onPress={() => go('feed')} />
      </FooterBar>
    </View>
  );
}

export function Onboarding() {
  const { state } = useStore();
  if (state.obStep === 'auth') return <AuthForm />;
  if (state.obStep === 'otp') return <EmailOtp />;
  if (state.obStep === 1) return <RulesGate />;
  if (state.obStep === 2) return <Perms />;
  return <Welcome />;
}
