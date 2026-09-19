import { useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import type { Screen } from '../state/types';
import { ImageSlot } from '../ui/ImageSlot';
import { BagIcon, BellIcon } from '../ui/icons';
import { SANS, SERIF, fs, primaryButton, screen } from '../ui/styles';

interface Order {
  slot: string;
  status: string;
  statusFg: string;
  title: string;
  who: string;
  dates: string;
  amount: string;
  cta: string;
  act: Screen;
}

export function Rentals() {
  const { state, set, go, config, m } = useStore();
  const { total } = useBooking();

  const renting: Order[] = [
    { slot: 'o1', status: 'Arrive jeudi', statusFg: 'var(--clay)', title: 'Robe colonne à sequins', who: 'de Juliette M.', dates: '18–21 sept.', amount: m(total), cta: 'Suivre le colis', act: 'safety' },
    { slot: 'o2', status: 'Retour avant lundi', statusFg: 'var(--plum)', title: 'Trench en cuir vintage', who: 'de Yasmine K.', dates: '5–9 sept.', amount: m(136), cta: 'Signaler un problème', act: 'claim' },
    { slot: 'o3', status: 'Terminé · à noter', statusFg: 'var(--ink3)', title: 'Jupe midi plissée', who: 'de Léa M.', dates: '22–25 août', amount: m(78), cta: 'Laisser une note', act: 'reviews' },
  ];

  const lending: Order[] = [
    { slot: 'l1', status: 'Demande · 2 h restantes', statusFg: 'var(--plum)', title: 'Veste en tweed courte', who: 'Jess T. la veut', dates: '26–29 sept.', amount: `+${m(96)}`, cta: 'Accepter la demande', act: 'messages' },
    { slot: 'l2', status: 'Chez la locataire', statusFg: 'var(--clay)', title: 'Maxi robe en soie, olive', who: 'avec Dana P.', dates: '11–15 sept.', amount: `+${m(104)}`, cta: 'Confirmer le retour', act: 'claim' },
  ];

  const orders = config.demoEmptyStates ? [] : state.rentalTab === 'renting' ? renting : lending;

  return (
    <div style={{ ...screen, padding: '60px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: 38, lineHeight: 1, fontWeight: 400 }}>Locations</h1>
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => go('notifs')}
          style={{
            cursor: 'pointer',
            width: 44,
            height: 44,
            flex: '0 0 44px',
            borderRadius: 999,
            border: '1px solid var(--line2)',
            background: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            color: 'var(--ink)',
          }}
        >
          <BellIcon />
          <span style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 99, background: 'var(--plum)' }} />
        </button>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 6, padding: 4, borderRadius: 12, background: 'var(--surf)' }}>
        {([['renting', 'Je loue'], ['lending', 'Je prête']] as const).map(([key, label]) => {
          const on = state.rentalTab === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => set({ rentalTab: key })}
              style={{
                cursor: 'pointer',
                flex: 1,
                minHeight: 40,
                fontFamily: SANS,
                fontSize: fs(14),
                fontWeight: 700,
                border: 'none',
                borderRadius: 9,
                background: on ? 'var(--clay)' : 'transparent',
                color: on ? 'var(--onclay)' : 'var(--ink)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {orders.map((o) => (
          <div key={o.slot} style={{ padding: 12, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 72, height: 92, flex: '0 0 72px', borderRadius: 10, overflow: 'hidden' }}>
                <ImageSlot id={`order-${o.slot}`} shape="rounded" radius={10} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: fs(11), fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: o.statusFg }}>
                  {o.status}
                </div>
                <div style={{ marginTop: 5, fontSize: fs(15), fontWeight: 700, lineHeight: 1.25 }}>{o.title}</div>
                <div style={{ marginTop: 4, fontSize: fs(13), color: 'var(--ink2)' }}>
                  {o.who} · {o.dates}
                </div>
                <div style={{ marginTop: 4, fontSize: fs(13), fontWeight: 700 }}>{o.amount}</div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => go(o.act)}
                style={{
                  cursor: 'pointer',
                  flex: 1,
                  minWidth: 0,
                  minHeight: 44,
                  fontFamily: SANS,
                  fontSize: fs(14),
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 11,
                  background: 'var(--clay)',
                  color: 'var(--onclay)',
                }}
              >
                {o.cta}
              </button>
              <button
                type="button"
                onClick={() => go('messages')}
                style={{
                  cursor: 'pointer',
                  flex: '0 0 auto',
                  minHeight: 44,
                  padding: '0 16px',
                  fontFamily: SANS,
                  fontSize: fs(14),
                  fontWeight: 700,
                  border: '1px solid var(--line2)',
                  borderRadius: 11,
                  background: 'none',
                  color: 'var(--ink)',
                }}
              >
                Message
              </button>
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 20px' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'var(--surf)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink3)',
            }}
          >
            <BagIcon />
          </div>
          <div style={{ marginTop: 18, fontFamily: SERIF, fontSize: 28, lineHeight: 1.1 }}>Rien en cours</div>
          <div style={{ marginTop: 8, fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '30ch' }}>
            Vos locations et vos prêts apparaîtront ici, avec les dates et les étiquettes de retour.
          </div>
          <button type="button" onClick={() => go('feed')} style={{ ...primaryButton, marginTop: 20, width: 'auto', padding: '0 22px', minHeight: 48 }}>
            Découvrir des pièces
          </button>
        </div>
      ) : null}
    </div>
  );
}
