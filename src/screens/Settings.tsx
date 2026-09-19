import { blockedAccounts } from '../data/catalog';
import { useStore } from '../state/store';
import type { Screen } from '../state/types';
import { ImageSlot } from '../ui/ImageSlot';
import { SANS, fs, screen } from '../ui/styles';
import { Header, ListRow } from '../ui/widgets';

interface Row {
  label: string;
  detail?: string;
  color?: string;
  to?: Screen;
}

export function Settings() {
  const { state, set, go, m } = useStore();

  const identityDetail =
    state.identityStatus === 'verified' ? 'Vérifiée' : state.identityStatus === 'pending' ? 'En cours' : 'À faire';
  const certDetail =
    state.certificationStatus === 'verified'
      ? 'Certifié'
      : state.certificationStatus === 'pending'
        ? 'En cours'
        : 'Non demandée';

  const groups: { head: string; rows: Row[] }[] = [
    {
      head: 'Compte',
      rows: [
        { label: "Nom d'utilisateur", detail: `@${state.username || 'camille.b'}` },
        {
          label: 'E-mail',
          detail: state.emailVerified ? 'Vérifié' : 'À vérifier',
          color: state.emailVerified ? 'var(--clay)' : 'var(--plum)',
        },
        {
          label: 'Mot de passe et sécurité',
          detail: state.twoFactorOn ? '2FA activée' : '2FA désactivée',
          color: state.twoFactorOn ? 'var(--clay)' : 'var(--ink3)',
          to: 'security',
        },
        { label: "Vérification d'identité", detail: identityDetail, to: 'identity' },
        { label: 'Compte certifié', detail: certDetail, to: 'certification' },
      ],
    },
    {
      head: 'Paiements',
      rows: [
        { label: 'Moyens de paiement', detail: 'Apple Pay, PayPal, carte', to: 'payments' },
        { label: 'Mon porte-monnaie', detail: m(state.walletBalance), to: 'wallet' },
        { label: 'Compte de versement', detail: 'SEPA ·· 4417', to: 'payouts' },
      ],
    },
    {
      head: 'Confidentialité',
      rows: [
        { label: 'Comptes bloqués', detail: String(Object.keys(state.blocked).length), to: 'blocked' },
        { label: 'Télécharger mes données', detail: 'E-mail sous 48 h' },
        { label: 'Gestion des cookies', detail: 'Essentiels' },
      ],
    },
    {
      head: 'Sécurité et règles',
      rows: [
        { label: 'Règles de la communauté', to: 'guidelines' },
        { label: 'Remise en main propre', to: 'safety' },
        { label: 'Frais et annulation', to: 'fees' },
        { label: "Centre d'aide", to: 'help' },
      ],
    },
    {
      head: 'Informations légales',
      rows: [
        { label: 'Conditions générales' },
        { label: 'Politique de confidentialité' },
        { label: 'Mentions légales' },
      ],
    },
  ];

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Paramètres" onBack={() => go('closet')} />

      {groups.map((g) => (
        <div key={g.head} style={{ marginTop: 20 }}>
          <div style={{ fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
            {g.head}
          </div>
          <div style={{ marginTop: 10, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)', overflow: 'hidden' }}>
            {g.rows.map((r, i) => (
              <ListRow
                key={r.label}
                label={r.label}
                detail={r.detail}
                detailColor={r.color ?? 'var(--ink3)'}
                onClick={r.to ? () => go(r.to as Screen) : undefined}
                last={i === g.rows.length - 1}
              />
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 24, display: 'grid', gap: 8 }}>
        <button
          type="button"
          onClick={() => set({ screen: 'onboard', obStep: 0, signedIn: false })}
          style={{
            cursor: 'pointer',
            width: '100%',
            minHeight: 50,
            fontFamily: SANS,
            fontSize: fs(15),
            fontWeight: 700,
            border: '1px solid var(--line2)',
            borderRadius: 14,
            background: 'none',
            color: 'var(--ink)',
          }}
        >
          Se déconnecter
        </button>
        <button
          type="button"
          onClick={() => set({ deleteStep: 1 })}
          style={{
            cursor: 'pointer',
            width: '100%',
            minHeight: 50,
            fontFamily: SANS,
            fontSize: fs(15),
            fontWeight: 700,
            border: '1px solid var(--plum)',
            borderRadius: 14,
            background: 'none',
            color: 'var(--plum)',
          }}
        >
          Supprimer mon compte
        </button>
        <p style={{ margin: '4px 0 0', fontSize: fs(12), lineHeight: 1.55, color: 'var(--ink3)' }}>
          La suppression efface votre profil, vos annonces, vos enregistrements et vos messages. L'historique de
          facturation est conservé le temps légal, puis supprimé.
        </p>
      </div>

      <div style={{ marginTop: 18, fontSize: fs(12), color: 'var(--ink3)' }}>Rota 1.0 (build 118) · Paris</div>
    </div>
  );
}

export function Blocked() {
  const { go } = useStore();

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Comptes bloqués" onBack={() => go('settings')} />
      <p style={{ margin: '10px 0 0', fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>
        Les comptes bloqués ne voient plus vos annonces et ne peuvent plus vous écrire.
      </p>
      <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
        {blockedAccounts.map((b) => (
          <div key={b.slot} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' }}>
            <div style={{ width: 42, height: 42, flex: '0 0 42px', borderRadius: 999, overflow: 'hidden' }}>
              <ImageSlot id={`blocked-${b.slot}`} shape="circle" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: fs(15), fontWeight: 700 }}>{b.handle}</div>
              <div style={{ marginTop: 3, fontSize: fs(12), lineHeight: 1.4, color: 'var(--ink3)' }}>{b.meta}</div>
            </div>
            <button
              type="button"
              style={{
                cursor: 'pointer',
                flex: '0 0 auto',
                minHeight: 40,
                padding: '0 14px',
                fontFamily: SANS,
                fontSize: fs(13),
                fontWeight: 700,
                borderRadius: 11,
                border: '1px solid var(--line2)',
                background: 'none',
                color: 'var(--ink)',
              }}
            >
              Débloquer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
