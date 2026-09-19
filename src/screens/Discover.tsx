import { IDEAS, pins } from '../data/catalog';
import { useStore } from '../state/store';
import { ImageSlot } from '../ui/ImageSlot';
import { BookmarkIcon, SearchIcon } from '../ui/icons';
import { fs, screen } from '../ui/styles';
import { Chip, Tappable } from '../ui/widgets';

export function Discover() {
  const { state, set, go, m, toggleFlag } = useStore();

  return (
    <div style={{ ...screen, padding: '56px 12px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
        <Tappable
          onClick={() => go('search')}
          label="Chercher"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            minHeight: 44,
            padding: '0 15px',
            borderRadius: 999,
            background: 'var(--surf2)',
            color: 'var(--ink3)',
            fontSize: fs(14),
          }}
        >
          <SearchIcon />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Chercher des dressings à Paris
          </span>
        </Tappable>
        <button
          type="button"
          aria-label="Vos tableaux"
          onClick={() => go('boards')}
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
            color: 'var(--ink)',
          }}
        >
          <BookmarkIcon size={17} color="currentColor" />
        </button>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 7, overflowX: 'auto', padding: '0 4px 4px' }}>
        {IDEAS.map((label) => (
          <Chip key={label} label={label} tone="ink" on={state.idea === label} onClick={() => set({ idea: label })} />
        ))}
      </div>

      <div style={{ marginTop: 8, padding: '0 4px', fontSize: fs(13), color: 'var(--ink3)' }}>
        Idées pour <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{state.idea}</span> · disponibles près de vous
      </div>

      <div style={{ marginTop: 12, columnCount: 2, columnGap: 10 }}>
        {pins.map((p) => {
          const saved = !!state.pinSaves[p.id];
          return (
            <div key={p.id} style={{ breakInside: 'avoid', marginBottom: 10 }}>
              <Tappable
                onClick={() => set({ screen: 'detail', activeId: p.to })}
                label={p.title}
                style={{
                  position: 'relative',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: 'var(--surf2)',
                  height: p.h,
                }}
              >
                <ImageSlot id={`pin-${p.id}`} shape="rounded" radius={16} placeholder={p.title} />
                <button
                  type="button"
                  aria-pressed={saved}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFlag('pinSaves', p.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    cursor: 'pointer',
                    minHeight: 32,
                    padding: '0 12px',
                    borderRadius: 999,
                    border: 'none',
                    background: saved ? '#F6F1E9' : '#E8865F',
                    color: saved ? '#14100E' : '#1B1009',
                    fontSize: fs(12),
                    fontWeight: 700,
                  }}
                >
                  {saved ? 'Enregistré' : 'Enregistrer'}
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    fontSize: fs(11),
                    fontWeight: 700,
                    padding: '5px 8px',
                    borderRadius: 7,
                    background: 'rgba(12,10,11,0.86)',
                    color: '#F6F1E9',
                    pointerEvents: 'none',
                  }}
                >
                  {m(p.price)} / jour
                </div>
              </Tappable>
              <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <div style={{ width: 20, height: 20, flex: '0 0 20px', borderRadius: 999, overflow: 'hidden' }}>
                  <ImageSlot id={`pinav-${p.id}`} shape="circle" />
                </div>
                <div
                  style={{
                    fontSize: fs(12),
                    color: 'var(--ink3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.handle} · {p.size}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
