import { FEES, payMethods } from '../data/catalog';
import { useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { ImageSlot } from '../ui/ImageSlot';
import { AppleIcon } from '../ui/icons';
import { SERIF, footerBar, fs, primaryButton, screen } from '../ui/styles';
import { Header, Tappable } from '../ui/widgets';

export function Checkout() {
  const { state, set, go, m } = useStore();
  const { active, nights, ship, total } = useBooking();

  if (state.confirmed) return <Confirmation />;

  return (
    <>
      <div style={{ ...screen, padding: '54px 18px 140px' }}>
        <Header title="" onBack={() => go('booking')} />
        <h1 style={{ margin: '14px 0 0', fontFamily: SERIF, fontSize: 36, lineHeight: 1.02, fontWeight: 400 }}>
          Confirmer la location
        </h1>

        <div style={{ marginTop: 20, display: 'flex', gap: 12, padding: 12, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
          <div style={{ width: 76, height: 96, flex: '0 0 76px', borderRadius: 10, overflow: 'hidden' }}>
            <ImageSlot id={`checkout-${active.id}`} shape="rounded" radius={10} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: fs(15), fontWeight: 700, lineHeight: 1.25 }}>{active.title}</div>
            <div style={{ marginTop: 4, fontSize: fs(13), color: 'var(--ink2)' }}>
              Taille {state.size} · {nights} jours
            </div>
            <div style={{ marginTop: 4, fontSize: fs(13), color: 'var(--ink2)' }}>
              {state.dates[0]}–{state.dates[1]} sept. · {ship ? 'livraison' : 'main propre'}
            </div>
            <div style={{ marginTop: 8, fontSize: fs(14), fontWeight: 700, color: 'var(--clay)' }}>{m(total)}</div>
          </div>
        </div>

        <div style={{ marginTop: 22, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
          Payer avec
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }} role="radiogroup" aria-label="Moyen de paiement">
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
                  minHeight: 56,
                  padding: '0 16px',
                  borderRadius: 14,
                  border: `1px solid ${on ? 'var(--clay)' : 'var(--line)'}`,
                  background: on ? 'var(--surf)' : 'none',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    flex: '0 0 20px',
                    borderRadius: 99,
                    border: `2px solid ${on ? 'var(--clay)' : 'var(--ink3)'}`,
                    background: on ? 'var(--clay)' : 'transparent',
                  }}
                />
                {p.key === 'applepay' ? <AppleIcon color="var(--ink)" /> : null}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: fs(15), fontWeight: on ? 700 : 600, color: 'var(--ink)' }}>
                    {p.label}
                  </span>
                  <span style={{ display: 'block', fontSize: fs(12), color: 'var(--ink3)' }}>{detail}</span>
                </span>
              </button>
            );
          })}
        </div>
        <Tappable
          onClick={() => go('payments')}
          style={{ marginTop: 10, minHeight: 44, display: 'flex', alignItems: 'center', fontSize: fs(13), fontWeight: 700, color: 'var(--clay)' }}
        >
          Gérer mes moyens de paiement ›
        </Tappable>
        <div style={{ marginTop: 4, fontSize: fs(12), lineHeight: 1.5, color: 'var(--ink3)' }}>
          Le paiement en espèces n'est pas accepté : hors application, ni la protection dommages ni la caution ne
          s'appliquent.
        </div>

        <div style={{ marginTop: 22, padding: 16, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: fs(14), fontWeight: 700 }}>Ce qui est compris</div>
          <div style={{ marginTop: 8, fontSize: fs(13), lineHeight: 1.6, color: 'var(--ink2)' }}>
            Protection dommages jusqu'à {m(FEES.coverCap)}
            {active.cleaning.byLender
              ? ` et nettoyage par ${active.name} (${m(active.cleaning.fee)})`
              : ' ; la pièce est rendue propre par vos soins'}
            . Une autorisation de{' '}
            {m(FEES.deposit)} est placée sur votre moyen de paiement et libérée 48 h après le scan du retour. Retard :{' '}
            {m(FEES.latePerDay)} par jour.
          </div>
          <Tappable
            onClick={() => go('fees')}
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              minHeight: 44,
              paddingTop: 12,
              borderTop: '1px solid var(--line)',
            }}
          >
            <div style={{ fontSize: fs(13), color: 'var(--ink2)' }}>Frais, annulation et remboursements</div>
            <div style={{ fontSize: fs(13), fontWeight: 700, color: 'var(--clay)', flex: '0 0 auto' }}>Voir ›</div>
          </Tappable>
        </div>

        <p style={{ margin: '12px 0 0', fontSize: fs(12), lineHeight: 1.55, color: 'var(--ink3)' }}>
          En payant, vous acceptez les conditions de location et la politique d'annulation. Rota est une place de marché :
          le contrat de location vous lie à {active.name}.
        </p>
      </div>

      <div style={footerBar}>
        <button type="button" onClick={() => set({ confirmed: true })} style={primaryButton}>
          Payer {m(total)}
        </button>
      </div>
    </>
  );
}

function Confirmation() {
  const { go, m } = useStore();
  const { active } = useBooking();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 36,
        textAlign: 'center',
        animation: 'rotaIn .25s ease',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          background: 'var(--clay)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          color: 'var(--onclay)',
        }}
      >
        ✓
      </div>
      <div style={{ marginTop: 20, fontFamily: SERIF, fontSize: 40, lineHeight: 1.02 }}>C'est réservé.</div>
      <div style={{ marginTop: 12, fontSize: fs(15), lineHeight: 1.55, color: 'var(--ink2)' }}>
        {active.name} a 24 h pour confirmer la remise. On vous rappellera de poster une vidéo — elle vous donne{' '}
        {m(FEES.videoCredit)} sur la prochaine location.
      </div>
      <button type="button" onClick={() => go('rentals')} style={{ ...primaryButton, marginTop: 26 }}>
        Voir mes locations
      </button>
    </div>
  );
}
