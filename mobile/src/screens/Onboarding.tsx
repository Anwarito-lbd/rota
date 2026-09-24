import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { permissions, rules } from '../data/catalog';
import { useAuth } from '../lib/auth';
import { usePermissions, type PermStatus } from '../lib/permissions';
import { emailValid, passwordChecks, passwordValid, usernameError } from '../state/auth';
import { useStore } from '../state/store';
import { FONT, OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AppleIcon } from '../ui/icons';
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

function Welcome() {
  const { set } = useStore();
  const insets = useSafeAreaInsets();
  const social = () => set({ signedIn: true, emailVerified: true, obStep: 1, authErr: null });

  return (
    <View style={{ flex: 1, backgroundColor: '#0C0A0D' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <MediaSlot id="ob-hero" shape="rect" tone="media" placeholder="Photo d'accueil" />
      </View>
      <LinearGradient
        colors={['rgba(12,10,13,0.5)', 'rgba(12,10,13,0.05)', 'rgba(12,10,13,0.92)', '#0C0A0D']}
        locations={[0, 0.3, 0.74, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 26, paddingBottom: insets.bottom + 24 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 11,
            paddingVertical: 7,
            borderRadius: 8,
            backgroundColor: '#E2A9F1',
          }}
        >
          <Txt size={11} weight="bold" upper color="#2A1033">
            Paris · location entre particuliers
          </Txt>
        </View>

        <Display size={48} color={OVER_INK} style={{ marginTop: 16 }}>
          Wear it once.
        </Display>
        <Display size={48} color="#E2A9F1" italic>
          Pass it on.
        </Display>

        <Txt size={15} color="#D6CEC5" style={{ marginTop: 12 }}>
          Empruntez dans les dressings près de chez vous, pour un soir ou une semaine. Mettez le vôtre en location et il
          commence à se rembourser.
        </Txt>

        <View style={{ marginTop: 24, gap: 10 }}>
          <SocialButton label="Continuer avec Apple" onPress={social} filled icon={<AppleIcon />} />
          <SocialButton label="Continuer avec Google" onPress={social} />
          <SocialButton
            label="S'inscrire avec un e-mail"
            onPress={() => set({ obStep: 'auth', authMode: 'signup', authErr: null })}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => set({ obStep: 'auth', authMode: 'login', authErr: null })}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}
        >
          <Txt size={14} color="#D6CEC5">
            Vous avez déjà un compte ?
          </Txt>
          <Txt size={14} weight="bold" color="#E2A9F1">
            Se connecter
          </Txt>
        </Pressable>

        <Txt size={12} center color="#BDB4AA" style={{ marginTop: 4 }}>
          Rota est réservé aux 16 ans et plus. En continuant, vous acceptez nos Conditions et notre Politique de
          confidentialité.
        </Txt>
      </View>
    </View>
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
                <Txt size={9} weight="bold" color={c.onAccent}>
                  ✓
                </Txt>
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
            {resent ? 'Nouveau code envoyé ✓' : 'Renvoyer le code'}
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

function TwoFactorChallenge() {
  const { state, set } = useStore();
  const { c } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={140}>
        <BackButton onPress={() => set({ obStep: 'auth' })} />
        <Display size={36} style={{ marginTop: 16 }}>
          Validation en deux étapes
        </Display>
        <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
          Entrez le code affiché dans votre application d'authentification.
        </Txt>

        <CodeField
          value={state.twoFactorInput}
          label="Code de validation en deux étapes"
          onChangeText={(v) => set({ twoFactorInput: v, twoFactorErr: false })}
        />

        {state.twoFactorErr ? <ErrorBanner>Entrez les 6 chiffres affichés dans votre application.</ErrorBanner> : null}

        <Txt size={13} color={c.ink3} style={{ marginTop: 14 }}>
          Vous n'avez plus accès à votre application ? Utilisez un code de secours enregistré lors de l'activation.
        </Txt>
      </Screen>

      <FooterBar>
        <PrimaryButton
          label="Valider"
          onPress={() =>
            state.twoFactorInput.length === 6
              ? set({ signedIn: true, screen: 'feed', twoFactorErr: false })
              : set({ twoFactorErr: true })
          }
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

function Perms() {
  const { go } = useStore();
  const { c, fs } = useTheme();
  const { statuses, request } = usePermissions();

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={140}>
        <Txt size={12} weight="semi" upper color={c.accent}>
          Étape 2 sur 2
        </Txt>
        <Display size={36} style={{ marginTop: 8 }}>
          Ce qu'on demande, et pourquoi
        </Display>
        <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
          Rien n'est nécessaire pour parcourir l'app. Activez au moment où vous en avez besoin — le téléphone
          redemandera à ce moment-là.
        </Txt>

        <View style={{ marginTop: 20, gap: 10 }}>
          {permissions.map((p) => {
            const status = statuses[p.key];
            const on = status === 'granted';
            return (
              <Card key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                <View style={{ flex: 1 }}>
                  <Txt weight="bold">{p.title}</Txt>
                  <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
                    {status === 'blocked'
                      ? 'Refusé sur ce téléphone. Touchez « Réglages » pour l’autoriser.'
                      : p.body}
                  </Txt>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: on }}
                  onPress={() => !on && request(p.key)}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: on ? c.accent : c.line2,
                    backgroundColor: on ? c.accent : 'transparent',
                  }}
                >
                  <Txt size={14} weight="bold" color={on ? c.onAccent : c.ink} style={{ fontSize: fs(14) }}>
                    {PERM_LABEL[status]}
                  </Txt>
                </Pressable>
              </Card>
            );
          })}
        </View>
      </Screen>

      <FooterBar>
        <PrimaryButton label="Commencer à parcourir" onPress={() => go('feed')} />
      </FooterBar>
    </View>
  );
}

export function Onboarding() {
  const { state } = useStore();
  if (state.obStep === 'auth') return <AuthForm />;
  if (state.obStep === 'otp') return <EmailOtp />;
  if (state.obStep === 'twofa') return <TwoFactorChallenge />;
  if (state.obStep === 1) return <RulesGate />;
  if (state.obStep === 2) return <Perms />;
  return <Welcome />;
}
