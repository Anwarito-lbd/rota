import { myReviews, ratingTags } from '../data/catalog';
import { useStore } from '../state/store';
import { ImageSlot } from '../ui/ImageSlot';
import { fs, footerBar, primaryButton, screen } from '../ui/styles';
import { Chip, Header } from '../ui/widgets';

export function Reviews() {
  const { state, set, go, toggleFlag } = useStore();

  return (
    <>
      <div style={{ ...screen, padding: '54px 18px 130px' }}>
        <Header title="Notes réciproques" onBack={() => go('rentals')} />

        <div style={{ marginTop: 16, padding: 16, borderRadius: 18, background: 'var(--surf)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, flex: '0 0 52px', borderRadius: 999, overflow: 'hidden' }}>
              <ImageSlot id="rate-av" shape="circle" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: fs(15), fontWeight: 700 }}>Noter Léa M.</div>
              <div style={{ marginTop: 3, fontSize: fs(13), color: 'var(--ink2)' }}>Jupe midi plissée · 22–25 août</div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }} role="radiogroup" aria-label="Note sur 5">
            {[1, 2, 3, 4, 5].map((n) => {
              const on = n <= state.stars;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={state.stars === n}
                  aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                  onClick={() => set({ stars: n })}
                  style={{
                    cursor: 'pointer',
                    minWidth: 44,
                    minHeight: 44,
                    border: 'none',
                    background: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill={on ? 'var(--clay)' : 'transparent'}
                    stroke={on ? 'var(--clay)' : 'var(--ink3)'}
                    strokeWidth="1.6"
                    aria-hidden
                  >
                    <path d="M12 3.5l2.7 5.6 6.1.8-4.5 4.2 1.2 6-5.5-3-5.5 3 1.2-6L3.2 9.9l6.1-.8z" />
                  </svg>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ratingTags.map((t) => (
              <Chip key={t} label={t} on={!!state.ratingTags[t]} onClick={() => toggleFlag('ratingTags', t)} />
            ))}
          </div>

          <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: 'var(--surf2)', fontSize: fs(14), lineHeight: 1.45, color: 'var(--ink3)' }}>
            Ajouter un mot public (optionnel)…
          </div>
          <div style={{ marginTop: 12, fontSize: fs(12), lineHeight: 1.5, color: 'var(--ink3)' }}>
            Les deux notes se publient en même temps, 14 jours après le retour. Personne ne peut modifier la sienne après
            avoir lu l'autre.
          </div>
        </div>

        <div style={{ marginTop: 22, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
          Ce qu'on dit de vous
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          {myReviews.map((r) => (
            <div key={r.slot} style={{ padding: 14, borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 34, height: 34, flex: '0 0 34px', borderRadius: 999, overflow: 'hidden' }}>
                  <ImageSlot id={`rev-${r.slot}`} shape="circle" />
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: fs(14), fontWeight: 700 }}>{r.name}</div>
                <div style={{ flex: '0 0 auto', fontSize: fs(13), color: 'var(--clay)' }}>{r.stars}</div>
              </div>
              <div style={{ marginTop: 8, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>{r.body}</div>
              <div style={{ marginTop: 6, fontSize: fs(12), color: 'var(--ink3)' }}>{r.time}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={footerBar}>
        <button type="button" onClick={() => go('rentals')} style={primaryButton}>
          Envoyer la note
        </button>
      </div>
    </>
  );
}
