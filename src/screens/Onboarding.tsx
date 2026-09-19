import { permissions, rules } from '../data/catalog';
import { emailValid, makeOtp, passwordChecks, passwordValid, usernameError } from '../state/auth';
import { useStore } from '../state/store';
import { ImageSlot } from '../ui/ImageSlot';
import { AppleIcon } from '../ui/icons';
import { SANS, SERIF, amount, footerBar, fs, primaryButton, screen } from '../ui/styles';
import { Tappable } from '../ui/widgets';

const overButton = {
  cursor: 'pointer',
  fontFamily: SANS,
  fontSize: fs(17),
  fontWeight: 600,
  minHeight: 54,
  borderRadius: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
} as const;

const fieldBox = {
  display: 'block',
  padding: '12px 14px',
  borderRadius: 14,
  background: 'var(--surf)',
  border: '1px solid var(--line)',
} as const;

const fieldLabel = {
  fontSize: fs(11),
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--ink3)',
} as const;

const fieldInput = {
  marginTop: 5,
  width: '100%',
  boxSizing: 'border-box',
  border: 'none',
  outline: 'none',
  background: 'none',
  fontFamily: SANS,
  fontSize: fs(16),
  fontWeight: 600,
  color: 'var(--ink)',
  minHeight: 28,
} as const;

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  hint?: string;
  autoComplete?: string;
}) {
  return (
    <label style={fieldBox}>
      <div style={fieldLabel}>{label}</div>
      <input
        value={value}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        style={fieldInput}
      />
      {hint ? <div style={{ marginTop: 6, fontSize: fs(12), color: 'var(--ink3)' }}>{hint}</div> : null}
    </label>
  );
}

function Welcome() {
  const { set } = useStore();
  const social = () => set({ signedIn: true, emailVerified: true, obStep: 1, authErr: null });

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--sink)' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <ImageSlot id="ob-hero" shape="rect" tone="media" placeholder="Photo d'accueil" />
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(12,10,11,0.5) 0%, rgba(12,10,11,0.05) 30%, rgba(12,10,11,0.92) 74%, #0C0A0B 100%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 26px 40px' }}>
        <div
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            padding: '7px 11px',
            borderRadius: 8,
            background: '#E8865F',
            color: '#1B1009',
          }}
        >
          Paris · location entre particuliers
        </div>
        <h1 style={{ margin: '16px 0 0', fontFamily: SERIF, fontSize: 50, lineHeight: 1, fontWeight: 400, color: '#F6F1E9' }}>
          Wear it once.
          <br />
          <span style={{ fontStyle: 'italic', color: '#E8865F' }}>Pass it on.</span>
        </h1>
        <p style={{ margin: '14px 0 0', fontSize: fs(15), lineHeight: 1.5, color: '#D6CEC5', maxWidth: '32ch' }}>
          Empruntez dans les dressings près de chez vous, pour un soir ou une semaine. Mettez le vôtre en location et il
          commence à se rembourser.
        </p>

        <div style={{ marginTop: 24, display: 'grid', gap: 10 }}>
          <button type="button" onClick={social} style={{ ...overButton, border: 'none', background: '#F6F1E9', color: '#14100E' }}>
            <AppleIcon color="#14100E" />
            Continuer avec Apple
          </button>
          <button
            type="button"
            onClick={social}
            style={{
              ...overButton,
              border: '1px solid rgba(246,241,233,0.3)',
              background: 'rgba(246,241,233,0.08)',
              color: '#F6F1E9',
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                background: '#F6F1E9',
                color: '#14100E',
                fontWeight: 700,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              G
            </span>
            Continuer avec Google
          </button>
          <button
            type="button"
            onClick={() => set({ obStep: 'auth', authMode: 'signup', authErr: null })}
            style={{ ...overButton, border: '1px solid rgba(246,241,233,0.3)', background: 'none', color: '#F6F1E9' }}
          >
            S'inscrire avec un e-mail
          </button>
        </div>

        <Tappable
          onClick={() => set({ obStep: 'auth', authMode: 'login', authErr: null })}
          style={{
            marginTop: 14,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: fs(14),
            color: '#D6CEC5',
          }}
        >
          Vous avez déjà un compte ?<span style={{ marginLeft: 6, color: '#E8865F', fontWeight: 700 }}>Se connecter</span>
        </Tappable>
        <p style={{ margin: '6px 0 0', fontSize: fs(12), lineHeight: 1.5, textAlign: 'center', color: '#BDB4AA' }}>
          Rota est réservé aux 16 ans et plus. En continuant, vous acceptez nos{' '}
          <span style={{ color: '#E8865F', fontWeight: 600 }}>Conditions</span> et notre{' '}
          <span style={{ color: '#E8865F', fontWeight: 600 }}>Politique de confidentialité</span>.
        </p>
      </div>
    </div>
  );
}

function PasswordMeter({ pw }: { pw: string }) {
  const checks = passwordChecks(pw);
  const score = Object.values(checks).filter(Boolean).length;
  const items: [keyof typeof checks, string][] = [
    ['length', '8 caractères minimum'],
    ['upper', 'Une majuscule'],
    ['digit', 'Un chiffre'],
    ['symbol', 'Un symbole (!, ?, #…)'],
  ];

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 4 }} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background: i < score ? (score === 4 ? 'var(--clay)' : 'var(--plum)') : 'var(--surf2)',
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
        {items.map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: fs(12), color: checks[key] ? 'var(--ink2)' : 'var(--ink3)' }}>
            <span
              style={{
                width: 16,
                height: 16,
                flex: '0 0 16px',
                borderRadius: 99,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                background: checks[key] ? 'var(--clay)' : 'var(--surf2)',
                color: checks[key] ? 'var(--onclay)' : 'var(--ink3)',
              }}
            >
              {checks[key] ? '✓' : ''}
            </span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthForm() {
  const { state, set } = useStore();
  const signup = state.authMode !== 'login';

  const submit = () => {
    if (signup) {
      const nameErr = usernameError(state.username);
      if (nameErr) return set({ authErr: nameErr });
      if (!emailValid(state.email)) return set({ authErr: 'Cet e-mail ne semble pas valide.' });
      if (!passwordValid(state.pw)) {
        return set({ authErr: 'Le mot de passe ne remplit pas encore toutes les conditions.' });
      }
      return set({ obStep: 'otp', otpSent: makeOtp(), otpInput: '', otpErr: false, authErr: null });
    }

    if (!state.username.trim() || !state.pw) {
      return set({ authErr: 'Entrez votre nom d’utilisateur et votre mot de passe.' });
    }
    if (state.twoFactorOn) {
      return set({ obStep: 'twofa', twoFactorInput: '', twoFactorErr: false, authErr: null });
    }
    return set({ signedIn: true, screen: 'feed', authErr: null });
  };

  return (
    <>
      <div style={{ ...screen, padding: '56px 20px 130px' }}>
        <button
          type="button"
          aria-label="Retour"
          onClick={() => set({ obStep: 0, authErr: null })}
          style={{ cursor: 'pointer', width: 44, height: 44, borderRadius: 999, border: '1px solid var(--line2)', background: 'none', fontSize: 18, color: 'var(--ink)' }}
        >
          ‹
        </button>
        <h1 style={{ margin: '16px 0 0', fontFamily: SERIF, fontSize: 38, lineHeight: 1.02, fontWeight: 400 }}>
          {signup ? 'Créer votre compte' : 'Content de vous revoir'}
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: fs(15), lineHeight: 1.55, color: 'var(--ink2)', maxWidth: '34ch' }}>
          {signup
            ? "Votre nom d'utilisateur est public et unique : c'est lui que les autres membres voient sur vos annonces."
            : 'Entrez le nom d’utilisateur ou l’e-mail utilisé à l’inscription.'}
        </p>

        <div style={{ marginTop: 22, display: 'grid', gap: 10 }}>
          <Field
            label={signup ? "Nom d'utilisateur" : "Nom d'utilisateur ou e-mail"}
            value={state.username}
            placeholder="camille.rota"
            autoComplete="username"
            hint={signup ? 'Lettres minuscules, chiffres, point ou tiret bas · 3 à 20 caractères' : undefined}
            onChange={(v) => set({ username: v.toLowerCase(), authErr: null })}
          />
          {signup ? (
            <Field
              label="E-mail"
              value={state.email}
              placeholder="vous@exemple.fr"
              type="email"
              autoComplete="email"
              onChange={(v) => set({ email: v, authErr: null })}
            />
          ) : null}
          <label style={fieldBox}>
            <div style={fieldLabel}>Mot de passe</div>
            <input
              value={state.pw}
              type="password"
              placeholder="8 caractères, majuscule, chiffre, symbole"
              autoComplete={signup ? 'new-password' : 'current-password'}
              onChange={(e) => set({ pw: e.target.value, authErr: null })}
              style={fieldInput}
            />
            {signup ? <PasswordMeter pw={state.pw} /> : null}
          </label>
        </div>

        {state.authErr ? (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'var(--plumSoft)',
              border: '1px solid var(--plum)',
              fontSize: fs(13),
              lineHeight: 1.45,
              color: 'var(--ink)',
            }}
          >
            {state.authErr}
          </div>
        ) : null}

        {!signup ? (
          <div style={{ marginTop: 12, minHeight: 44, display: 'flex', alignItems: 'center', fontSize: fs(14), fontWeight: 700, color: 'var(--clay)' }}>
            Mot de passe oublié ?
          </div>
        ) : null}

        <Tappable
          onClick={() => set({ authMode: signup ? 'login' : 'signup', authErr: null })}
          style={{ marginTop: 14, minHeight: 44, display: 'flex', alignItems: 'center', gap: 6, fontSize: fs(14), color: 'var(--ink2)' }}
        >
          {signup ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?'}
          <span style={{ color: 'var(--clay)', fontWeight: 700 }}>{signup ? 'Se connecter' : "S'inscrire"}</span>
        </Tappable>
      </div>

      <div style={{ ...footerBar, padding: '14px 20px 26px' }}>
        <button type="button" onClick={submit} style={primaryButton}>
          {signup ? 'Créer le compte' : 'Se connecter'}
        </button>
      </div>
    </>
  );
}

function CodeInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <input
      value={value}
      inputMode="numeric"
      autoComplete="one-time-code"
      aria-label={label}
      maxLength={6}
      placeholder="000000"
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      style={{
        marginTop: 20,
        width: '100%',
        boxSizing: 'border-box',
        padding: '18px 14px',
        borderRadius: 16,
        border: '1px solid var(--line2)',
        background: 'var(--surf)',
        color: 'var(--ink)',
        textAlign: 'center',
        outline: 'none',
        ...amount(30),
        letterSpacing: '0.34em',
      }}
    />
  );
}

function EmailOtp() {
  const { state, set } = useStore();

  const confirm = () => {
    if (state.otpInput !== state.otpSent) return set({ otpErr: true });
    set({
      signedIn: true,
      emailVerified: true,
      otpErr: false,
      obStep: 1,
    });
  };

  return (
    <>
      <div style={{ ...screen, padding: '56px 20px 130px' }}>
        <button
          type="button"
          aria-label="Retour"
          onClick={() => set({ obStep: 'auth' })}
          style={{ cursor: 'pointer', width: 44, height: 44, borderRadius: 999, border: '1px solid var(--line2)', background: 'none', fontSize: 18, color: 'var(--ink)' }}
        >
          ‹
        </button>
        <h1 style={{ margin: '16px 0 0', fontFamily: SERIF, fontSize: 38, lineHeight: 1.02, fontWeight: 400 }}>
          Vérifiez votre e-mail
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: fs(15), lineHeight: 1.55, color: 'var(--ink2)', maxWidth: '34ch' }}>
          Nous avons envoyé un code à 6 chiffres à <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{state.email}</span>.
          Il expire dans 10 minutes.
        </p>

        <CodeInput value={state.otpInput} label="Code à 6 chiffres" onChange={(v) => set({ otpInput: v, otpErr: false })} />

        {state.otpErr ? (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'var(--plumSoft)',
              border: '1px solid var(--plum)',
              fontSize: fs(13),
              color: 'var(--ink)',
            }}
          >
            Code incorrect. Vérifiez vos e-mails ou demandez un nouveau code.
          </div>
        ) : null}

        <Tappable
          onClick={() => set({ otpSent: makeOtp(), otpInput: '', otpErr: false })}
          style={{ marginTop: 14, minHeight: 44, display: 'flex', alignItems: 'center', fontSize: fs(14), fontWeight: 700, color: 'var(--clay)' }}
        >
          Renvoyer le code
        </Tappable>

        <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: 'var(--surf2)', fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>
          Démo : aucun e-mail n'est réellement envoyé. Votre code est{' '}
          <span style={{ ...amount(15), color: 'var(--clay)' }}>{state.otpSent}</span>.
        </div>
      </div>

      <div style={{ ...footerBar, padding: '14px 20px 26px' }}>
        <button
          type="button"
          onClick={confirm}
          style={{
            ...primaryButton,
            background: state.otpInput.length === 6 ? 'var(--clay)' : 'var(--surf2)',
            color: state.otpInput.length === 6 ? 'var(--onclay)' : 'var(--ink3)',
          }}
        >
          Vérifier mon e-mail
        </button>
      </div>
    </>
  );
}

function TwoFactorChallenge() {
  const { state, set } = useStore();

  const confirm = () => {
    if (state.twoFactorInput.length !== 6) return set({ twoFactorErr: true });
    set({ signedIn: true, screen: 'feed', twoFactorErr: false });
  };

  return (
    <>
      <div style={{ ...screen, padding: '56px 20px 130px' }}>
        <button
          type="button"
          aria-label="Retour"
          onClick={() => set({ obStep: 'auth' })}
          style={{ cursor: 'pointer', width: 44, height: 44, borderRadius: 999, border: '1px solid var(--line2)', background: 'none', fontSize: 18, color: 'var(--ink)' }}
        >
          ‹
        </button>
        <h1 style={{ margin: '16px 0 0', fontFamily: SERIF, fontSize: 38, lineHeight: 1.02, fontWeight: 400 }}>
          Validation en deux étapes
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: fs(15), lineHeight: 1.55, color: 'var(--ink2)', maxWidth: '34ch' }}>
          Entrez le code affiché dans votre application d'authentification.
        </p>

        <CodeInput
          value={state.twoFactorInput}
          label="Code de validation en deux étapes"
          onChange={(v) => set({ twoFactorInput: v, twoFactorErr: false })}
        />

        {state.twoFactorErr ? (
          <div role="alert" style={{ marginTop: 12, fontSize: fs(13), color: 'var(--plum)' }}>
            Entrez les 6 chiffres affichés dans votre application.
          </div>
        ) : null}

        <div style={{ marginTop: 16, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink3)' }}>
          Vous n'avez plus accès à votre application ? Utilisez un code de secours enregistré lors de l'activation.
        </div>
      </div>

      <div style={{ ...footerBar, padding: '14px 20px 26px' }}>
        <button type="button" onClick={confirm} style={primaryButton}>
          Valider
        </button>
      </div>
    </>
  );
}

function RulesGate() {
  const { state, set } = useStore();
  return (
    <>
      <div style={{ ...screen, padding: '60px 20px 130px' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--clay)' }}>
          Étape 1 sur 2
        </div>
        <h1 style={{ margin: '8px 0 0', fontFamily: SERIF, fontSize: 38, lineHeight: 1.02, fontWeight: 400 }}>
          Comment on se traite ici
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: fs(15), lineHeight: 1.55, color: 'var(--ink2)', maxWidth: '34ch' }}>
          Rota ne fonctionne que parce que les pièces reviennent comme elles sont parties. Quatre règles, et elles sont
          appliquées.
        </p>
        <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
          {rules.map((r) => (
            <div key={r.title} style={{ padding: 15, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: fs(15), fontWeight: 700 }}>{r.title}</div>
              <div style={{ marginTop: 5, fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)' }}>{r.body}</div>
            </div>
          ))}
        </div>
        <Tappable
          onClick={() => set((s) => ({ agreed: !s.agreed }))}
          label="Accepter les règles de la communauté"
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            padding: 15,
            borderRadius: 16,
            background: 'var(--surf2)',
            minHeight: 44,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              flex: '0 0 24px',
              borderRadius: 7,
              border: `2px solid ${state.agreed ? 'var(--clay)' : 'var(--line2)'}`,
              background: state.agreed ? 'var(--clay)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--onclay)',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {state.agreed ? '✓' : ''}
          </div>
          <div style={{ fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink)' }}>
            J'accepte les règles de la communauté et je comprends que le harcèlement, les contrefaçons ou les paiements
            hors application entraînent la suppression du compte.
          </div>
        </Tappable>
        <p style={{ margin: '12px 0 0', fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink3)' }}>
          Vous pouvez signaler une annonce, un message ou un profil depuis le menu •••. Les signalements sont examinés
          sous 24 heures.
        </p>
      </div>
      <div style={{ ...footerBar, padding: '14px 20px 26px' }}>
        <button
          type="button"
          onClick={() => (state.agreed ? set({ obStep: 2 }) : set({ agreed: true }))}
          style={{
            ...primaryButton,
            background: state.agreed ? 'var(--clay)' : 'var(--surf2)',
            color: state.agreed ? 'var(--onclay)' : 'var(--ink3)',
          }}
        >
          Accepter et continuer
        </button>
      </div>
    </>
  );
}

function Perms() {
  const { state, set, go } = useStore();
  return (
    <>
      <div style={{ ...screen, padding: '60px 20px 130px' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--clay)' }}>
          Étape 2 sur 2
        </div>
        <h1 style={{ margin: '8px 0 0', fontFamily: SERIF, fontSize: 38, lineHeight: 1.02, fontWeight: 400 }}>
          Ce qu'on demande, et pourquoi
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: fs(15), lineHeight: 1.55, color: 'var(--ink2)', maxWidth: '34ch' }}>
          Rien n'est nécessaire pour parcourir l'app. Activez au moment où vous en avez besoin — iOS redemandera à ce
          moment-là.
        </p>
        <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
          {permissions.map((p) => {
            const on = state.permOn[p.key];
            return (
              <div
                key={p.key}
                style={{
                  display: 'flex',
                  gap: 13,
                  alignItems: 'center',
                  padding: 15,
                  borderRadius: 16,
                  background: 'var(--surf)',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: fs(15), fontWeight: 700 }}>{p.title}</div>
                  <div style={{ marginTop: 4, fontSize: fs(13), lineHeight: 1.45, color: 'var(--ink2)' }}>{p.body}</div>
                </div>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => set((s) => ({ permOn: { ...s.permOn, [p.key]: !s.permOn[p.key] } }))}
                  style={{
                    cursor: 'pointer',
                    flex: '0 0 auto',
                    minHeight: 44,
                    padding: '0 16px',
                    fontFamily: SANS,
                    fontSize: fs(14),
                    fontWeight: 700,
                    borderRadius: 12,
                    border: `1px solid ${on ? 'var(--clay)' : 'var(--line2)'}`,
                    background: on ? 'var(--clay)' : 'transparent',
                    color: on ? 'var(--onclay)' : 'var(--ink)',
                  }}
                >
                  {on ? 'Activé' : 'Activer'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ ...footerBar, padding: '14px 20px 26px' }}>
        <button type="button" onClick={() => go('feed')} style={primaryButton}>
          Commencer à parcourir
        </button>
      </div>
    </>
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
