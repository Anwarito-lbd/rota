import { useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { ImageSlot } from '../ui/ImageSlot';
import { DotsIcon } from '../ui/icons';
import { OVER_SCRIM, SANS, SERIF, amount, fs, screen } from '../ui/styles';
import { Tappable } from '../ui/widgets';

const STATS = [
  { value: '4,96', label: 'Note' },
  { value: '68', label: 'Locations' },
  { value: '2,1k', label: 'Abonnés' },
];

const BADGES = ['Identité vérifiée', 'Expédie le jour même', 'Top 5% des prêteuses', 'Nettoyage inclus'];

const GRID = [
  { slot: 'g1', price: 58, id: 'f3' },
  { slot: 'g2', price: 34, id: 'f3' },
  { slot: 'g3', price: 27, id: 'f2' },
  { slot: 'g4', price: 19, id: 'f1' },
  { slot: 'g5', price: 44, id: 'f3' },
  { slot: 'g6', price: 22, id: 'f1' },
];

export function Profile() {
  const { state, set, go, m } = useStore();
  const { active } = useBooking();

  return (
    <div style={{ ...screen, padding: 0 }}>
      <div style={{ position: 'relative', height: 200, background: 'var(--surf2)' }}>
        <ImageSlot id="profile-cover" shape="rect" placeholder="Couverture" />
        <button
          type="button"
          aria-label="Retour"
          onClick={() => go('feed')}
          style={{ position: 'absolute', top: 54, left: 14, cursor: 'pointer', width: 44, height: 44, borderRadius: 999, border: 'none', background: OVER_SCRIM, color: '#F6F1E9', fontSize: 18 }}
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Signaler ce profil"
          onClick={() => set({ report: true, reportSent: false })}
          style={{
            position: 'absolute',
            top: 54,
            right: 14,
            cursor: 'pointer',
            width: 44,
            height: 44,
            borderRadius: 999,
            border: 'none',
            background: OVER_SCRIM,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DotsIcon size={18} />
        </button>
      </div>

      <div style={{ padding: '0 18px 24px' }}>
        <div style={{ marginTop: -38, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 88, height: 88, flex: '0 0 88px', borderRadius: 999, padding: 3, boxSizing: 'border-box', background: 'var(--clay)' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden', border: '2px solid var(--bg)', boxSizing: 'border-box' }}>
              <ImageSlot id={`profile-av-${active.id}`} shape="circle" />
            </div>
          </div>
          <button
            type="button"
            aria-pressed={state.follow}
            onClick={() => set((s) => ({ follow: !s.follow }))}
            style={{
              cursor: 'pointer',
              marginBottom: 6,
              minHeight: 44,
              padding: '0 22px',
              fontFamily: SANS,
              fontSize: fs(15),
              fontWeight: 700,
              border: `1px solid ${state.follow ? 'var(--line2)' : 'var(--clay)'}`,
              borderRadius: 12,
              background: state.follow ? 'transparent' : 'var(--clay)',
              color: state.follow ? 'var(--ink)' : 'var(--onclay)',
            }}
          >
            {state.follow ? 'Suivi' : 'Suivre'}
          </button>
          <button
            type="button"
            onClick={() => go('messages')}
            style={{
              cursor: 'pointer',
              marginBottom: 6,
              minHeight: 44,
              padding: '0 16px',
              fontFamily: SANS,
              fontSize: fs(15),
              fontWeight: 700,
              border: '1px solid var(--line2)',
              borderRadius: 12,
              background: 'none',
              color: 'var(--ink)',
            }}
          >
            Écrire
          </button>
        </div>

        <h1 style={{ margin: '14px 0 0', fontFamily: SERIF, fontSize: 32, lineHeight: 1, fontWeight: 400 }}>{active.name}</h1>
        <div style={{ marginTop: 4, fontSize: fs(14), color: 'var(--ink3)' }}>
          @{active.handle} · {active.city}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: fs(15), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '36ch' }}>
          Collectionneuse d'archives. 40 pièces en rotation, surtout du tailoring 90s et des robes de soirée. Tout est
          défroissé à la vapeur entre deux locataires.
        </p>

        <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
          {STATS.map((st) => (
            <div key={st.label} style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' }}>
              <div style={{ ...amount(24), color: 'var(--clay)' }}>{st.value}</div>
              <div style={{ marginTop: 4, fontSize: fs(11), letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
                {st.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {BADGES.map((b) => (
            <div key={b} style={{ fontSize: fs(12), fontWeight: 600, padding: '8px 11px', borderRadius: 999, background: 'var(--surf2)', color: 'var(--ink)' }}>
              {b}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
          En rotation
        </div>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
          {GRID.map((g) => (
            <Tappable
              key={g.slot}
              onClick={() => set({ screen: 'detail', activeId: g.id })}
              style={{ position: 'relative', height: 150, borderRadius: 10, overflow: 'hidden', background: 'var(--surf2)' }}
            >
              <ImageSlot id={`grid-${g.slot}`} shape="rounded" radius={10} />
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 6,
                  fontSize: fs(10),
                  fontWeight: 700,
                  padding: '4px 6px',
                  borderRadius: 5,
                  background: 'rgba(12,10,11,0.84)',
                  color: '#F6F1E9',
                  pointerEvents: 'none',
                }}
              >
                {m(g.price)}
              </div>
            </Tappable>
          ))}
        </div>
      </div>
    </div>
  );
}
