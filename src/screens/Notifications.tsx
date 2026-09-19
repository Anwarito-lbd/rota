import { FEES } from '../data/catalog';
import { useStore } from '../state/store';
import type { Screen } from '../state/types';
import { ImageSlot } from '../ui/ImageSlot';
import { BellIcon } from '../ui/icons';
import { SERIF, fs, screen } from '../ui/styles';
import { Header, Tappable } from '../ui/widgets';

interface Notif {
  slot: string;
  title: string;
  body: string;
  time: string;
  to: Screen;
}

export function Notifications() {
  const { go, config, m } = useStore();

  const groups: { head: string; items: Notif[] }[] = config.demoEmptyStates
    ? []
    : [
        {
          head: "Aujourd'hui",
          items: [
            { slot: 'n1', title: 'Juliette a confirmé votre location', body: 'Robe colonne à sequins · 18–21 sept.', time: '2 min', to: 'rentals' },
            { slot: 'n2', title: 'Jess veut louer votre veste en tweed', body: 'Demande expirant dans 2 h', time: '1 h', to: 'messages' },
          ],
        },
        {
          head: 'Cette semaine',
          items: [
            { slot: 'n3', title: 'Caution libérée', body: `${m(FEES.deposit)} rendus sur votre moyen de paiement`, time: 'mar.', to: 'payouts' },
            { slot: 'n4', title: 'Notez Léa', body: 'Les notes réciproques se publient après 14 jours', time: 'lun.', to: 'reviews' },
          ],
        },
      ];

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Notifications" onBack={() => go('rentals')} />

      {groups.map((g) => (
        <div key={g.head} style={{ marginTop: 20 }}>
          <div style={{ fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
            {g.head}
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {g.items.map((n) => (
              <Tappable
                key={n.slot}
                onClick={() => go(n.to)}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: 13,
                  borderRadius: 14,
                  background: 'var(--surf)',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ width: 40, height: 40, flex: '0 0 40px', borderRadius: 999, overflow: 'hidden' }}>
                  <ImageSlot id={`notif-${n.slot}`} shape="circle" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: fs(14), fontWeight: 700, lineHeight: 1.3 }}>{n.title}</div>
                  <div style={{ marginTop: 3, fontSize: fs(13), lineHeight: 1.4, color: 'var(--ink2)' }}>{n.body}</div>
                </div>
                <div style={{ flex: '0 0 auto', fontSize: fs(12), color: 'var(--ink3)' }}>{n.time}</div>
              </Tappable>
            ))}
          </div>
        </div>
      ))}

      {groups.length === 0 ? (
        <div style={{ marginTop: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 20px' }}>
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
            <BellIcon size={28} />
          </div>
          <div style={{ marginTop: 18, fontFamily: SERIF, fontSize: 28, lineHeight: 1.1 }}>Tout est à jour</div>
          <div style={{ marginTop: 8, fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '30ch' }}>
            On vous écrira pour les confirmations, les remises et les retours à rendre.
          </div>
        </div>
      ) : null}
    </div>
  );
}
