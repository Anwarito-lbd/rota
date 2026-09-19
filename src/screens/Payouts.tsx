import { FEES } from '../data/catalog';
import { useStore } from '../state/store';
import { amount, fs, screen } from '../ui/styles';
import { Header, Tappable } from '../ui/widgets';

export function Payouts() {
  const { state, go, m } = useStore();

  const txns = [
    { label: 'Maxi robe en soie · Dana P.', sub: '11–15 sept. · 4 jours', value: `+${m(104)}`, fg: 'var(--clay)' },
    { label: `Commission Rota (${Math.round(FEES.commission * 100)}%)`, sub: `sur ${m(104)}`, value: `−${m(12)}`, fg: 'var(--ink3)' },
    { label: 'Veste en tweed · Jess T.', sub: '2–4 sept. · 2 jours', value: `+${m(64)}`, fg: 'var(--clay)' },
    { label: 'Versement vers ·· FR76 4417', sub: '1 sept.', value: `−${m(186)}`, fg: 'var(--ink3)' },
  ];

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Versements" onBack={() => go('closet')} />

      <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, padding: 14, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: fs(11), letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)' }}>Solde</div>
          <div style={{ marginTop: 5, ...amount(28), color: 'var(--clay)' }}>{m(state.walletBalance)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: 14, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: fs(11), letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
            Depuis le début
          </div>
          <div style={{ marginTop: 5, ...amount(28) }}>{m(3140)}</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 16,
          background: 'var(--surf)',
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: fs(15), fontWeight: 700 }}>Virement SEPA ·· FR76 4417</div>
          <div style={{ marginTop: 3, fontSize: fs(13), color: 'var(--ink2)' }}>Prochain versement vendredi · {m(186)}</div>
        </div>
        <div style={{ flex: '0 0 auto', fontSize: fs(13), fontWeight: 700, color: 'var(--clay)' }}>Modifier</div>
      </div>

      <div style={{ marginTop: 22, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Mouvements
      </div>
      <div style={{ marginTop: 10, display: 'grid', gap: 2 }}>
        {txns.map((t) => (
          <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 2px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: fs(14), fontWeight: 600, lineHeight: 1.3 }}>{t.label}</div>
              <div style={{ marginTop: 3, fontSize: fs(12), color: 'var(--ink3)' }}>{t.sub}</div>
            </div>
            <div style={{ flex: '0 0 auto', fontSize: fs(14), fontWeight: 700, color: t.fg }}>{t.value}</div>
          </div>
        ))}
      </div>

      <Tappable
        onClick={() => go('fees')}
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 52,
          padding: '0 15px',
          borderRadius: 14,
          background: 'var(--surf2)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0, fontSize: fs(14) }}>Comment la commission est calculée</div>
        <div style={{ flex: '0 0 auto', fontSize: fs(13), fontWeight: 700, color: 'var(--clay)' }}>Voir ›</div>
      </Tappable>
    </div>
  );
}
