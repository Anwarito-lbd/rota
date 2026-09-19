import { closetPieces } from '../data/catalog';
import { useStore } from '../state/store';
import type { Screen } from '../state/types';
import { ImageSlot } from '../ui/ImageSlot';
import { SANS, amount, fs, screen } from '../ui/styles';
import { ListRow, Tappable } from '../ui/widgets';

const TONE: Record<'clay' | 'plum' | 'mute', string> = {
  clay: 'var(--clay)',
  plum: 'var(--plum)',
  mute: 'var(--ink3)',
};

interface Row {
  label: string;
  detail?: string;
  color?: string;
  to: Screen;
}

function Group({ rows, go }: { rows: Row[]; go: (s: Screen) => void }) {
  return (
    <div style={{ marginTop: 12, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)', overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <ListRow
          key={r.label}
          label={r.label}
          detail={r.detail}
          detailColor={r.color ?? 'var(--ink3)'}
          onClick={() => go(r.to)}
          last={i === rows.length - 1}
        />
      ))}
    </div>
  );
}

export function Closet() {
  const { state, go, m } = useStore();

  const checks = [
    state.emailVerified,
    state.identityStatus === 'verified',
    state.certificationStatus === 'verified',
  ];
  const done = checks.filter(Boolean).length;

  return (
    <div style={{ ...screen, padding: '60px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 74, height: 74, flex: '0 0 74px', borderRadius: 999, padding: 2, boxSizing: 'border-box', background: 'var(--clay)' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden', border: '2px solid var(--bg)', boxSizing: 'border-box' }}>
            <ImageSlot id="me-avatar" shape="circle" editable placeholder="Photo" />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: fs(20), fontWeight: 700, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 6 }}>
            @{state.username || 'camille.b'}
            {state.certificationStatus === 'verified' ? <span style={{ color: 'var(--clay)' }}>✓</span> : null}
          </div>
          <div style={{ marginTop: 4, fontSize: fs(13), color: 'var(--ink3)' }}>Paris 11e · membre depuis 2025</div>
          <Tappable onClick={() => go('profile')} style={{ marginTop: 4, fontSize: fs(13), fontWeight: 700, color: 'var(--clay)' }}>
            Voir mes annonces
          </Tappable>
        </div>
      </div>

      <Tappable
        onClick={() => go('settings')}
        style={{ marginTop: 16, padding: 14, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: fs(15), fontWeight: 700 }}>Vérifications</div>
          <div style={{ flex: '0 0 auto', ...amount(14), color: 'var(--ink2)' }}>{done} sur 3</div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 4 }}>
          {checks.map((ok, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: ok ? 'var(--clay)' : 'var(--surf2)' }} />
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: fs(13), color: 'var(--ink2)' }}>
          E-mail · identité · certification
        </div>
      </Tappable>

      <Tappable
        onClick={() => go('payouts')}
        style={{ marginTop: 12, padding: 18, borderRadius: 18, background: 'var(--clay)', color: 'var(--onclay)' }}
      >
        <div style={{ fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase' }}>Gagné ce mois-ci</div>
        <div style={{ marginTop: 8, ...amount(40) }}>{m(412)}</div>
        <div style={{ marginTop: 8, fontSize: fs(14) }}>{m(186)} versés vendredi · 7 pièces en rotation</div>
      </Tappable>

      <button
        type="button"
        onClick={() => go('list')}
        style={{
          cursor: 'pointer',
          marginTop: 12,
          width: '100%',
          minHeight: 52,
          fontFamily: SANS,
          fontSize: fs(16),
          fontWeight: 700,
          border: '1px dashed var(--clay)',
          borderRadius: 16,
          background: 'none',
          color: 'var(--clay)',
        }}
      >
        + Mettre une pièce en location
      </button>

      <Group
        go={go}
        rows={[
          { label: 'Favoris', detail: '4 enregistrements', to: 'boards' },
          { label: 'Mes locations et prêts', detail: '2 en cours', color: 'var(--clay)', to: 'rentals' },
          { label: 'Messages', detail: '2 non lus', color: 'var(--plum)', to: 'messages' },
          { label: 'Mes notes', detail: '4,9 ★', to: 'reviews' },
        ]}
      />

      <Group
        go={go}
        rows={[
          { label: 'Gagne 15 € par parrainage', to: 'referral' },
          { label: 'Mon porte-monnaie', detail: m(state.walletBalance), to: 'wallet' },
          { label: 'Moyens de paiement', detail: state.payMethod === 'applepay' ? 'Apple Pay' : 'Configuré', to: 'payments' },
          { label: 'Versements et gains', detail: m(412), to: 'payouts' },
          { label: 'Outils de promotion', to: 'promote' },
        ]}
      />

      <Group
        go={go}
        rows={[
          { label: 'Mes préférences', detail: `Taille ${state.size}`, to: 'preferences' },
          { label: 'Réduction sur les lots', detail: state.bundlesOn ? `${state.bundlePct} %` : 'Désactivé', to: 'bundles' },
          { label: 'Mode vacances', detail: state.vacation ? 'Activé' : 'Désactivé', to: 'vacation' },
        ]}
      />

      <Group
        go={go}
        rows={[
          { label: "Centre d'aide", to: 'help' },
          { label: 'Règles de la communauté', to: 'guidelines' },
          { label: 'Frais et annulation', to: 'fees' },
        ]}
      />

      <Group go={go} rows={[{ label: 'Paramètres', to: 'settings' }]} />

      <div style={{ marginTop: 22, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Vos pièces
      </div>
      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        {closetPieces.map((c) => (
          <div
            key={c.slot}
            style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' }}
          >
            <div style={{ width: 58, height: 74, flex: '0 0 58px', borderRadius: 9, overflow: 'hidden' }}>
              <ImageSlot id={`closet-${c.slot}`} shape="rounded" radius={9} editable />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: fs(15), fontWeight: 700, lineHeight: 1.25 }}>{c.title}</div>
              <div style={{ marginTop: 3, fontSize: fs(13), color: 'var(--ink2)' }}>{c.meta}</div>
              <div style={{ marginTop: 5, fontSize: fs(11), fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TONE[c.tone] }}>
                {c.state}
              </div>
            </div>
            <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
              <div style={amount(15)}>{m(c.price)}</div>
              <div style={{ fontSize: fs(12), color: 'var(--ink3)' }}>/ jour</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
