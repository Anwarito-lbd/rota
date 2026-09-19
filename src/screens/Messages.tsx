import { FEES, bubbles, threads } from '../data/catalog';
import { OFFER_TIERS, useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { ImageSlot } from '../ui/ImageSlot';
import { DotsIcon } from '../ui/icons';
import { SANS, SERIF, amount, fs, screen } from '../ui/styles';
import { Tappable } from '../ui/widgets';

function OfferCard() {
  const { state, set, m } = useStore();
  const { active, nights } = useBooking();
  const perDay = Math.round(active.price * OFFER_TIERS[state.offerIdx]);
  const offerTotal = perDay * nights;

  if (state.offerStatus === 'accepted') {
    return (
      <div style={{ margin: '0 16px 12px', padding: 14, borderRadius: 16, background: 'var(--claySoft)', border: '1px solid var(--clay)' }}>
        <div style={{ fontSize: fs(14), fontWeight: 700, color: 'var(--ink)' }}>
          Proposition acceptée · {m(perDay)} / jour
        </div>
        <div style={{ marginTop: 4, fontSize: fs(13), lineHeight: 1.45, color: 'var(--ink2)' }}>
          Le prix est verrouillé 24 h. {active.name} finalise le paiement dans l'app.
        </div>
      </div>
    );
  }

  if (state.offerStatus === 'declined') {
    return (
      <div style={{ margin: '0 16px 12px', padding: 14, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
        <div style={{ fontSize: fs(14), fontWeight: 700, color: 'var(--ink2)' }}>Proposition refusée</div>
        <div style={{ marginTop: 4, fontSize: fs(13), lineHeight: 1.45, color: 'var(--ink3)' }}>
          Elle peut proposer un autre montant, ou réserver au prix affiché.
        </div>
      </div>
    );
  }

  const ghost = {
    cursor: 'pointer',
    flex: '0 0 auto',
    minHeight: 46,
    padding: '0 16px',
    fontFamily: SANS,
    fontSize: fs(14),
    fontWeight: 700,
    border: '1px solid var(--line2)',
    borderRadius: 12,
    background: 'none',
    color: 'var(--ink)',
  } as const;

  return (
    <div style={{ margin: '0 16px 12px', padding: 14, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--clay)' }}>
      <div style={{ fontSize: fs(11), fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--clay)' }}>
        Proposition · expire dans 11 h
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={amount(30)}>{m(perDay)}</div>
        <div style={{ fontSize: fs(13), color: 'var(--ink3)' }}>/ jour · au lieu de {m(active.price)}</div>
      </div>
      <div style={{ marginTop: 6, fontSize: fs(13), color: 'var(--ink2)' }}>
        {nights} jours · total {m(offerTotal)} · vous gardez {m(Math.round(offerTotal * (1 - FEES.commission)))}
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => set({ offerStatus: 'declined' })} style={ghost}>
          Refuser
        </button>
        <button
          type="button"
          onClick={() => set({ offerStatus: 'pending', screen: 'detail', offer: true })}
          style={ghost}
        >
          Contre-offre
        </button>
        <button
          type="button"
          onClick={() => set({ offerStatus: 'accepted' })}
          style={{
            cursor: 'pointer',
            flex: 1,
            minWidth: 0,
            minHeight: 46,
            fontFamily: SANS,
            fontSize: fs(14),
            fontWeight: 700,
            border: 'none',
            borderRadius: 12,
            background: 'var(--clay)',
            color: 'var(--onclay)',
          }}
        >
          Accepter
        </button>
      </div>
    </div>
  );
}

function Thread() {
  const { set } = useStore();
  const { active } = useBooking();

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'rotaIn .22s ease' }}>
      <div style={{ padding: '54px 14px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line)' }}>
        <button
          type="button"
          aria-label="Retour aux messages"
          onClick={() => set({ thread: null })}
          style={{ cursor: 'pointer', width: 44, height: 44, flex: '0 0 44px', borderRadius: 999, border: '1px solid var(--line2)', background: 'none', fontSize: 17, color: 'var(--ink)' }}
        >
          ‹
        </button>
        <div style={{ width: 38, height: 38, flex: '0 0 38px', borderRadius: 999, overflow: 'hidden' }}>
          <ImageSlot id="thread-av" shape="circle" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: fs(15), fontWeight: 700 }}>{active.name}</div>
          <div style={{ fontSize: fs(12), color: 'var(--ink3)' }}>Location · 18–21 sept.</div>
        </div>
        <button
          type="button"
          aria-label="Signaler la conversation"
          onClick={() => set({ report: true, reportSent: false })}
          style={{ cursor: 'pointer', width: 44, height: 44, flex: '0 0 44px', borderRadius: 999, border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink2)' }}
        >
          <DotsIcon size={18} color="currentColor" />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bubbles.map((b, i) => (
          <div
            key={i}
            style={{
              maxWidth: '78%',
              alignSelf: b.me ? 'flex-end' : 'flex-start',
              padding: '11px 14px',
              borderRadius: b.me ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: b.me ? 'var(--clay)' : 'var(--surf2)',
              color: b.me ? 'var(--onclay)' : 'var(--ink)',
              fontSize: fs(14),
              lineHeight: 1.45,
            }}
          >
            {b.text}
          </div>
        ))}
        <div
          style={{
            alignSelf: 'center',
            marginTop: 6,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'var(--surf)',
            border: '1px solid var(--line)',
            fontSize: fs(12),
            lineHeight: 1.45,
            color: 'var(--ink2)',
            textAlign: 'center',
            maxWidth: '82%',
          }}
        >
          Gardez le paiement sur Rota — la protection ne couvre que les réservations dans l'app.
        </div>
      </div>

      <OfferCard />

      <div style={{ padding: '12px 16px 30px', display: 'flex', gap: 10, borderTop: '1px solid var(--line)' }}>
        <div
          style={{
            flex: 1,
            minHeight: 46,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            borderRadius: 14,
            background: 'var(--surf2)',
            color: 'var(--ink3)',
            fontSize: fs(14),
          }}
        >
          Écrire à {active.name}…
        </div>
        <div
          aria-hidden
          style={{
            width: 46,
            height: 46,
            flex: '0 0 46px',
            borderRadius: 14,
            background: 'var(--clay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--onclay)',
            fontSize: 18,
          }}
        >
          ↑
        </div>
      </div>
    </div>
  );
}

export function Messages() {
  const { state, set } = useStore();
  if (state.thread) return <Thread />;

  return (
    <div style={{ ...screen, padding: '60px 18px 24px' }}>
      <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: 38, lineHeight: 1, fontWeight: 400 }}>Messages</h1>
      <div style={{ marginTop: 16, display: 'grid', gap: 4 }}>
        {threads.map((t) => (
          <Tappable
            key={t.id}
            onClick={() => set({ thread: t.id })}
            style={{
              minWidth: 0,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              padding: 12,
              borderRadius: 14,
              background: t.unread ? 'var(--surf)' : 'transparent',
            }}
          >
            <div style={{ width: 46, height: 46, flex: '0 0 46px', borderRadius: 999, overflow: 'hidden' }}>
              <ImageSlot id={`thread-${t.id}`} shape="circle" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: fs(15), fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: fs(12), color: 'var(--ink3)', flex: '0 0 auto' }}>{t.time}</div>
              </div>
              <div style={{ marginTop: 3, fontSize: fs(13), color: 'var(--ink2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.preview}
              </div>
            </div>
            <div style={{ width: 8, height: 8, flex: '0 0 8px', borderRadius: 99, background: t.unread ? 'var(--plum)' : 'transparent' }} />
          </Tappable>
        ))}
      </div>
    </div>
  );
}
