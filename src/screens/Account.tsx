import { useState } from 'react';
import { identityDocs, payMethods, pieces } from '../data/catalog';
import { useStore } from '../state/store';
import type { PayMethod } from '../state/types';
import { ImageSlot } from '../ui/ImageSlot';
import { AppleIcon } from '../ui/icons';
import { SANS, amount, footerBar, fs, primaryButton, screen } from '../ui/styles';
import { Header, ListRow, Note, Steps, Toggle } from '../ui/widgets';

const cardStyle = {
  padding: 14,
  borderRadius: 16,
  background: 'var(--surf)',
  border: '1px solid var(--line)',
} as const;

function StatusPill({ status }: { status: 'none' | 'pending' | 'verified' | 'rejected' }) {
  const map = {
    none: { label: 'Non vérifié', bg: 'var(--surf2)', fg: 'var(--ink2)' },
    pending: { label: 'En cours', bg: 'var(--plumSoft)', fg: 'var(--plum)' },
    verified: { label: 'Vérifié', bg: 'var(--claySoft)', fg: 'var(--clay)' },
    rejected: { label: 'Refusé', bg: 'var(--plumSoft)', fg: 'var(--plum)' },
  } as const;
  const tone = map[status];
  return (
    <span
      style={{
        flex: '0 0 auto',
        padding: '6px 10px',
        borderRadius: 999,
        fontSize: fs(12),
        fontWeight: 700,
        background: tone.bg,
        color: tone.fg,
      }}
    >
      {tone.label}
    </span>
  );
}

export function Wallet() {
  const { state, set, go, m } = useStore();

  const moves = [
    { label: 'Location · Maxi robe en soie', sub: '11–15 sept.', value: `+${m(104)}`, fg: 'var(--clay)' },
    { label: 'Remboursement caution', sub: '9 sept.', value: `+${m(150)}`, fg: 'var(--clay)' },
    { label: 'Location · Robe colonne', sub: '2 sept.', value: `−${m(101)}`, fg: 'var(--ink3)' },
  ];

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Mon porte-monnaie" onBack={() => go('closet')} size={32} />

      <div style={{ marginTop: 18, padding: 18, borderRadius: 18, background: 'var(--clay)', color: 'var(--onclay)' }}>
        <div style={{ fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase' }}>Solde disponible</div>
        <div style={{ marginTop: 8, ...amount(40) }}>{m(state.walletBalance)}</div>
        <div style={{ marginTop: 8, fontSize: fs(13), lineHeight: 1.5 }}>
          Utilisable pour payer une location, ou virable sur votre compte bancaire.
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => set((s) => ({ walletBalance: s.walletBalance + 20 }))}
          style={{
            cursor: 'pointer',
            flex: 1,
            minHeight: 48,
            fontFamily: SANS,
            fontSize: fs(14),
            fontWeight: 700,
            borderRadius: 14,
            border: 'none',
            background: 'var(--surf2)',
            color: 'var(--ink)',
          }}
        >
          Recharger {m(20)}
        </button>
        <button
          type="button"
          onClick={() => go('payouts')}
          style={{
            cursor: 'pointer',
            flex: 1,
            minHeight: 48,
            fontFamily: SANS,
            fontSize: fs(14),
            fontWeight: 700,
            borderRadius: 14,
            border: '1px solid var(--line2)',
            background: 'none',
            color: 'var(--ink)',
          }}
        >
          Virer sur mon compte
        </button>
      </div>

      <div style={{ marginTop: 22, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Mouvements
      </div>
      <div style={{ marginTop: 10, display: 'grid', gap: 2 }}>
        {moves.map((t) => (
          <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 2px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: fs(14), fontWeight: 600, lineHeight: 1.3 }}>{t.label}</div>
              <div style={{ marginTop: 3, fontSize: fs(12), color: 'var(--ink3)' }}>{t.sub}</div>
            </div>
            <div style={{ flex: '0 0 auto', ...amount(14), color: t.fg }}>{t.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <Note>Le paiement en espèces n'est jamais autorisé sur Rota : hors application, aucune protection ne s'applique.</Note>
      </div>
    </div>
  );
}

function MethodIcon({ method }: { method: PayMethod }) {
  if (method === 'applepay') return <AppleIcon size={16} color="var(--ink)" />;
  const letter = { googlepay: 'G', paypal: 'P', card: '▭', wallet: '◉' }[method];
  return (
    <span
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surf2)',
        color: 'var(--ink)',
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {letter}
    </span>
  );
}

export function PaymentMethods() {
  const { state, set, go, m } = useStore();
  const [adding, setAdding] = useState(false);
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');

  const addCard = () => {
    const digits = number.replace(/\D/g, '');
    if (digits.length < 12) return;
    set((s) => ({
      cards: [...s.cards, { last4: digits.slice(-4), brand: digits.startsWith('4') ? 'Visa' : 'Mastercard', expiry: expiry || '01/30' }],
      payMethod: 'card',
    }));
    setNumber('');
    setExpiry('');
    setAdding(false);
  };

  const input = {
    width: '100%',
    boxSizing: 'border-box' as const,
    marginTop: 6,
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid var(--line2)',
    background: 'var(--surf2)',
    color: 'var(--ink)',
    fontFamily: SANS,
    fontSize: fs(15),
    outline: 'none',
  };

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Moyens de paiement" onBack={() => go('closet')} size={32} />
      <p style={{ margin: '10px 0 0', fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>
        Choisissez ce qui est débité au moment de la réservation. Tout passe par l'application : aucun paiement en
        espèces, aucun virement direct.
      </p>

      <div style={{ marginTop: 18, display: 'grid', gap: 8 }} role="radiogroup" aria-label="Moyen de paiement">
        {payMethods.map((p) => {
          const on = state.payMethod === p.key;
          const detail =
            p.key === 'wallet'
              ? `Solde ${m(state.walletBalance)}`
              : p.key === 'card'
                ? state.cards.map((c) => `${c.brand} ·· ${c.last4}`).join(' · ')
                : p.detail;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ payMethod: p.key })}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minHeight: 62,
                padding: '0 15px',
                borderRadius: 14,
                background: 'var(--surf)',
                border: `1px solid ${on ? 'var(--clay)' : 'var(--line)'}`,
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  flex: '0 0 20px',
                  borderRadius: 99,
                  border: `2px solid ${on ? 'var(--clay)' : 'var(--line2)'}`,
                  background: on ? 'var(--clay)' : 'transparent',
                }}
              />
              <MethodIcon method={p.key} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: fs(15), fontWeight: 700, color: 'var(--ink)' }}>{p.label}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: fs(13), color: 'var(--ink2)' }}>{detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      {adding ? (
        <div style={{ ...cardStyle, marginTop: 12 }}>
          <div style={{ fontSize: fs(15), fontWeight: 700 }}>Nouvelle carte</div>
          <label style={{ display: 'block', marginTop: 10, fontSize: fs(12), color: 'var(--ink3)' }}>
            Numéro de carte
            <input value={number} inputMode="numeric" placeholder="4242 4242 4242 4242" onChange={(e) => setNumber(e.target.value)} style={input} />
          </label>
          <label style={{ display: 'block', marginTop: 10, fontSize: fs(12), color: 'var(--ink3)' }}>
            Expiration
            <input value={expiry} placeholder="04/29" onChange={(e) => setExpiry(e.target.value)} style={input} />
          </label>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={addCard}
              style={{ ...primaryButton, minHeight: 46, fontSize: fs(15), flex: 1 }}
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              style={{
                cursor: 'pointer',
                flex: '0 0 auto',
                minHeight: 46,
                padding: '0 16px',
                fontFamily: SANS,
                fontSize: fs(15),
                fontWeight: 700,
                borderRadius: 14,
                border: '1px solid var(--line2)',
                background: 'none',
                color: 'var(--ink)',
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            cursor: 'pointer',
            marginTop: 12,
            width: '100%',
            minHeight: 50,
            fontFamily: SANS,
            fontSize: fs(15),
            fontWeight: 700,
            borderRadius: 14,
            border: '1px dashed var(--clay)',
            background: 'none',
            color: 'var(--clay)',
          }}
        >
          + Ajouter une carte
        </button>
      )}

      <div style={{ marginTop: 18 }}>
        <Note>
          Les paiements sont encaissés par Rota puis reversés à la prêteuse après la remise. La caution est une simple
          autorisation, jamais un prélèvement.
        </Note>
      </div>
    </div>
  );
}

export function Identity() {
  const { state, set, go } = useStore();
  const status = state.identityStatus;

  if (status === 'verified' || status === 'pending') {
    return (
      <div style={{ ...screen, padding: '54px 18px 24px' }}>
        <Header title="Vérification d'identité" onBack={() => go('settings')} size={30} />
        <div style={{ ...cardStyle, marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: fs(15), fontWeight: 700 }}>
              {status === 'verified' ? 'Identité vérifiée' : 'Dossier envoyé'}
            </div>
            <div style={{ marginTop: 4, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>
              {status === 'verified'
                ? 'Votre profil affiche le badge « Identité vérifiée ». Vos documents sont chiffrés et jamais publics.'
                : 'Un humain examine vos documents sous 24 h. Vous pouvez continuer à utiliser Rota pendant ce temps.'}
            </div>
          </div>
          <StatusPill status={status} />
        </div>

        {status === 'pending' ? (
          <button
            type="button"
            onClick={() => set({ identityStatus: 'verified' })}
            style={{ ...primaryButton, marginTop: 12 }}
          >
            Simuler la réponse (démo)
          </button>
        ) : (
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {[
              'Réservation immédiate chez les prêteuses qui l’exigent',
              'Plafond de location augmenté',
              'Badge visible sur votre profil et vos annonces',
            ].map((line) => (
              <div key={line} style={{ ...cardStyle, fontSize: fs(14), lineHeight: 1.45, color: 'var(--ink2)' }}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const steps = [
    {
      title: 'Choisissez un document',
      body: 'Il doit être en cours de validité et lisible, sans reflet.',
    },
    {
      title: 'Photographiez le document',
      body: 'Posez-le à plat, sur fond uni. Les quatre coins doivent être visibles.',
    },
    {
      title: 'Prenez un selfie',
      body: 'Nous comparons votre visage au document. La photo n’est jamais publiée.',
    },
  ][state.identityStep];

  const next = () =>
    state.identityStep < 2
      ? set({ identityStep: state.identityStep + 1 })
      : set({ identityStatus: 'pending', identityStep: 0 });

  return (
    <>
      <div style={{ ...screen, padding: '54px 18px 130px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            aria-label="Étape précédente"
            onClick={() => (state.identityStep > 0 ? set({ identityStep: state.identityStep - 1 }) : go('settings'))}
            style={{ cursor: 'pointer', width: 44, height: 44, flex: '0 0 44px', borderRadius: 999, border: '1px solid var(--line2)', background: 'none', fontSize: 18, color: 'var(--ink)' }}
          >
            ‹
          </button>
          <Steps current={state.identityStep} />
        </div>

        <div style={{ marginTop: 18, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--clay)' }}>
          Vérification d'identité
        </div>
        <h1 style={{ margin: '8px 0 0', fontSize: fs(28), lineHeight: 1.15, fontWeight: 700 }}>{steps.title}</h1>
        <p style={{ margin: '8px 0 0', fontSize: fs(15), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>{steps.body}</p>

        {state.identityStep === 0 ? (
          <div style={{ marginTop: 20, display: 'grid', gap: 8 }} role="radiogroup" aria-label="Type de document">
            {identityDocs.map((d) => {
              const on = state.identityDoc === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ identityDoc: d.key })}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 60,
                    padding: '0 15px',
                    borderRadius: 14,
                    background: 'var(--surf)',
                    border: `1px solid ${on ? 'var(--clay)' : 'var(--line)'}`,
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      flex: '0 0 20px',
                      borderRadius: 99,
                      border: `2px solid ${on ? 'var(--clay)' : 'var(--line2)'}`,
                      background: on ? 'var(--clay)' : 'transparent',
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: fs(15), fontWeight: 700, color: 'var(--ink)' }}>{d.label}</span>
                    <span style={{ display: 'block', fontSize: fs(13), color: 'var(--ink2)' }}>{d.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {state.identityStep === 1 ? (
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
            <div style={{ height: 150, borderRadius: 12, overflow: 'hidden' }}>
              <ImageSlot id="id-front" shape="rounded" radius={12} editable placeholder="Recto" />
            </div>
            <div style={{ height: 150, borderRadius: 12, overflow: 'hidden' }}>
              <ImageSlot id="id-back" shape="rounded" radius={12} editable placeholder="Verso" />
            </div>
          </div>
        ) : null}

        {state.identityStep === 2 ? (
          <div style={{ marginTop: 20, height: 240, borderRadius: 16, overflow: 'hidden' }}>
            <ImageSlot id="id-selfie" shape="rounded" radius={16} editable placeholder="Selfie" />
          </div>
        ) : null}

        <div style={{ marginTop: 14 }}>
          <Note>
            Vos documents servent uniquement à confirmer votre identité. Ils sont conservés de façon chiffrée, jamais
            affichés sur votre profil et supprimés à la fermeture du compte.
          </Note>
        </div>
      </div>

      <div style={footerBar}>
        <button type="button" onClick={next} style={primaryButton}>
          {state.identityStep < 2 ? 'Continuer' : 'Envoyer pour vérification'}
        </button>
      </div>
    </>
  );
}

export function Certification() {
  const { state, set, go, toggleFlag } = useStore();
  const status = state.certificationStatus;
  const eligible = state.identityStatus === 'verified';

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Compte certifié" onBack={() => go('settings')} size={32} />
      <p style={{ margin: '10px 0 0', fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>
        La certification est la coche bleue de Rota : elle confirme qu'un compte est bien tenu par la personne annoncée,
        comme sur Instagram ou TikTok.
      </p>

      <div style={{ ...cardStyle, marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: fs(15), fontWeight: 700 }}>Votre demande</div>
          <div style={{ marginTop: 4, fontSize: fs(13), lineHeight: 1.45, color: 'var(--ink2)' }}>
            {status === 'verified'
              ? 'Votre compte est certifié. La coche apparaît partout où votre nom s’affiche.'
              : status === 'pending'
                ? 'Demande en cours d’examen. Réponse sous 5 jours ouvrés.'
                : eligible
                  ? 'Vous remplissez les conditions : identité vérifiée et plus de 10 locations.'
                  : 'Vérifiez d’abord votre identité pour pouvoir demander la certification.'}
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      {status === 'none' ? (
        <button
          type="button"
          disabled={!eligible}
          onClick={() => set({ certificationStatus: 'pending' })}
          style={{
            ...primaryButton,
            marginTop: 12,
            background: eligible ? 'var(--clay)' : 'var(--surf2)',
            color: eligible ? 'var(--onclay)' : 'var(--ink3)',
            cursor: eligible ? 'pointer' : 'default',
          }}
        >
          Demander la certification
        </button>
      ) : null}

      {status === 'pending' ? (
        <button type="button" onClick={() => set({ certificationStatus: 'verified' })} style={{ ...primaryButton, marginTop: 12 }}>
          Simuler la réponse (démo)
        </button>
      ) : null}

      {!eligible ? (
        <button
          type="button"
          onClick={() => go('identity')}
          style={{
            cursor: 'pointer',
            marginTop: 8,
            width: '100%',
            minHeight: 48,
            fontFamily: SANS,
            fontSize: fs(15),
            fontWeight: 700,
            borderRadius: 14,
            border: '1px solid var(--line2)',
            background: 'none',
            color: 'var(--ink)',
          }}
        >
          Vérifier mon identité
        </button>
      ) : null}

      <div style={{ marginTop: 24, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Comptes que vous certifiez
      </div>
      <p style={{ margin: '8px 0 0', fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink3)' }}>
        Vous pouvez vous porter garante des personnes avec qui vous avez déjà échangé. Votre garantie apparaît sur leur
        profil.
      </p>
      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        {pieces.map((p) => (
          <div key={p.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, flex: '0 0 42px', borderRadius: 999, overflow: 'hidden' }}>
              <ImageSlot id={`cert-${p.id}`} shape="circle" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: fs(15), fontWeight: 700 }}>
                {p.name} {p.certified ? <span style={{ color: 'var(--clay)' }}>✓</span> : null}
              </div>
              <div style={{ marginTop: 2, fontSize: fs(13), color: 'var(--ink3)' }}>@{p.handle}</div>
            </div>
            <Toggle
              on={!!state.certifies[p.handle]}
              label={`Certifier ${p.name}`}
              onChange={() => toggleFlag('certifies', p.handle)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Security() {
  const { state, set, go } = useStore();
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState(false);

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Sécurité" onBack={() => go('settings')} size={32} />

      <div style={{ marginTop: 18, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)', overflow: 'hidden' }}>
        <ListRow label="Nom d'utilisateur" detail={state.username ? `@${state.username}` : '@camille.b'} />
        <ListRow label="E-mail" detail={state.emailVerified ? 'Vérifié' : 'À vérifier'} detailColor={state.emailVerified ? 'var(--clay)' : 'var(--plum)'} />
        <ListRow label="Mot de passe" detail="Modifié il y a 3 mois" onClick={() => {}} last />
      </div>

      <div style={{ ...cardStyle, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: fs(15), fontWeight: 700 }}>Validation en deux étapes</div>
            <div style={{ marginTop: 3, fontSize: fs(13), lineHeight: 1.45, color: 'var(--ink2)' }}>
              Un code de votre application d'authentification est demandé à chaque connexion sur un nouvel appareil.
            </div>
          </div>
          <Toggle
            on={state.twoFactorOn}
            label="Validation en deux étapes"
            onChange={() => {
              if (state.twoFactorOn) {
                set({ twoFactorOn: false });
                setSetup(false);
              } else {
                setSetup(true);
              }
            }}
          />
        </div>

        {setup && !state.twoFactorOn ? (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>
              Scannez ce code dans Google Authenticator, 1Password ou Authy, puis entrez les 6 chiffres affichés.
            </div>
            <div
              style={{
                margin: '12px auto',
                width: 132,
                height: 132,
                borderRadius: 12,
                background: 'var(--surf2)',
                border: '1px solid var(--line2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink3)',
                fontSize: fs(12),
                textAlign: 'center',
                padding: 10,
                boxSizing: 'border-box',
              }}
            >
              QR code d'appairage
            </div>
            <input
              value={code}
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              aria-label="Code de validation"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '14px',
                borderRadius: 12,
                border: '1px solid var(--line2)',
                background: 'var(--surf2)',
                color: 'var(--ink)',
                textAlign: 'center',
                outline: 'none',
                ...amount(22),
                letterSpacing: '0.3em',
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (code.length === 6) {
                  set({ twoFactorOn: true });
                  setSetup(false);
                  setCode('');
                }
              }}
              style={{ ...primaryButton, marginTop: 12, minHeight: 48, fontSize: fs(15) }}
            >
              Activer
            </button>
          </div>
        ) : null}

        {state.twoFactorOn ? (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>
            Codes de secours : <span style={{ ...amount(13) }}>4 disponibles</span>. Conservez-les hors de votre téléphone.
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 12, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)', overflow: 'hidden' }}>
        <ListRow label="Vérification d'identité" detail={state.identityStatus === 'verified' ? 'Vérifiée' : state.identityStatus === 'pending' ? 'En cours' : 'À faire'} onClick={() => go('identity')} />
        <ListRow label="Compte certifié" detail={state.certificationStatus === 'verified' ? 'Certifié' : 'Demander'} onClick={() => go('certification')} />
        <ListRow label="Appareils connectés" detail="2 appareils" onClick={() => {}} last />
      </div>

      <div style={{ marginTop: 18 }}>
        <Note>
          Rota ne demandera jamais votre mot de passe par message. Signalez toute demande suspecte depuis la conversation
          concernée.
        </Note>
      </div>
    </div>
  );
}
