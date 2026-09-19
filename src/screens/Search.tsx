import { CATEGORIES, OCCASIONS, SIZES, SORT_OPTIONS, searchResults } from '../data/catalog';
import { useStore } from '../state/store';
import { ImageSlot } from '../ui/ImageSlot';
import { ChevronDown, FilterIcon, HeartIcon, SearchIcon } from '../ui/icons';
import { SANS, SERIF, fs, pickerColors, primaryButton, screen } from '../ui/styles';
import { Chip, Sheet, Tappable } from '../ui/widgets';

const RESULT_COUNT = 248;

export function Search() {
  const { state, set, m, toggleFlag } = useStore();
  const results =
    state.sortIdx === 1 ? [...searchResults].sort((a, b) => a.price - b.price) : searchResults;

  return (
    <>
      <div style={{ ...screen, padding: '60px 18px 24px' }}>
        <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: 38, lineHeight: 1, fontWeight: 400 }}>Trouver une pièce</h1>

        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              minHeight: 46,
              padding: '0 14px',
              borderRadius: 14,
              background: 'var(--surf2)',
              color: 'var(--ink3)',
              fontSize: fs(15),
            }}
          >
            <SearchIcon size={17} />
            robe à sequins, taille S
          </div>
          <button
            type="button"
            aria-label="Filtres"
            onClick={() => set({ filters: true })}
            style={{
              cursor: 'pointer',
              width: 46,
              height: 46,
              borderRadius: 14,
              border: 'none',
              background: 'var(--clay)',
              color: 'var(--onclay)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FilterIcon />
          </button>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {OCCASIONS.map((label) => (
            <Chip
              key={label}
              label={label}
              tone="plum"
              on={state.occasion === label}
              onClick={() => set({ occasion: label })}
            />
          ))}
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
          {CATEGORIES.map((label) => {
            const on = state.category === label;
            return (
              <Tappable
                key={label}
                onClick={() => set({ category: label })}
                style={{ flex: '0 0 auto', width: 62, textAlign: 'center' }}
              >
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 999,
                    overflow: 'hidden',
                    background: 'var(--surf2)',
                    border: `2px solid ${on ? 'var(--clay)' : 'transparent'}`,
                    boxSizing: 'border-box',
                  }}
                >
                  <ImageSlot id={`cat-${label}`} shape="circle" />
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: fs(11),
                    fontWeight: 600,
                    color: on ? 'var(--clay)' : 'var(--ink3)',
                    lineHeight: 1.2,
                  }}
                >
                  {label}
                </div>
              </Tappable>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            paddingBottom: 12,
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ fontSize: fs(13), color: 'var(--ink3)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {RESULT_COUNT} pièces · Paris
          </div>
          <Tappable
            onClick={() => set((s) => ({ sortIdx: (s.sortIdx + 1) % SORT_OPTIONS.length }))}
            style={{
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 44,
              fontSize: fs(13),
              fontWeight: 700,
              color: 'var(--clay)',
            }}
          >
            {SORT_OPTIONS[state.sortIdx]}
            <ChevronDown />
          </Tappable>
        </div>

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
          {results.map((r) => {
            const fav = !!state.favs[r.slot];
            return (
              <div key={r.slot} style={{ minWidth: 0 }}>
                <Tappable
                  onClick={() => set({ screen: 'detail', activeId: r.id })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}
                >
                  <div style={{ width: 22, height: 22, flex: '0 0 22px', borderRadius: 999, overflow: 'hidden' }}>
                    <ImageSlot id={`rav-${r.slot}`} shape="circle" />
                  </div>
                  <div style={{ fontSize: fs(12), color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.handle}
                  </div>
                </Tappable>

                <Tappable
                  onClick={() => set({ screen: 'detail', activeId: r.id })}
                  label={r.title}
                  style={{ marginTop: 7, position: 'relative', height: 192, borderRadius: 12, overflow: 'hidden', background: 'var(--surf2)' }}
                >
                  <ImageSlot id={`res-${r.slot}`} shape="rounded" radius={12} placeholder={r.title} />
                  <button
                    type="button"
                    aria-pressed={fav}
                    aria-label="Ajouter aux favoris"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFlag('favs', r.slot);
                    }}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      cursor: 'pointer',
                      minHeight: 32,
                      padding: '0 10px',
                      borderRadius: 999,
                      border: 'none',
                      background: 'rgba(12,10,11,0.82)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <HeartIcon size={13} fill={fav ? '#E8865F' : 'none'} color={fav ? '#E8865F' : '#F6F1E9'} />
                    <span style={{ fontSize: fs(11), fontWeight: 700, color: '#F6F1E9' }}>{r.favCount}</span>
                  </button>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 7,
                      left: 7,
                      fontSize: fs(10),
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '4px 7px',
                      borderRadius: 5,
                      background: 'rgba(12,10,11,0.86)',
                      color: '#F6F1E9',
                      pointerEvents: 'none',
                    }}
                  >
                    {r.status}
                  </div>
                </Tappable>

                <Tappable onClick={() => set({ screen: 'detail', activeId: r.id })} style={{ marginTop: 8 }}>
                  <div style={{ fontSize: fs(14), fontWeight: 700, lineHeight: 1.15 }}>
                    {m(r.price)} <span style={{ fontSize: fs(12), fontWeight: 400, color: 'var(--ink3)' }}>/ jour</span>
                  </div>
                  <div style={{ marginTop: 3, fontSize: fs(12), color: 'var(--clay)', fontWeight: 600 }}>
                    {m(r.price * 3)} pour 3 jours
                  </div>
                  <div style={{ marginTop: 4, fontSize: fs(13), lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.title}
                  </div>
                  <div style={{ marginTop: 2, fontSize: fs(12), color: 'var(--ink3)' }}>
                    {r.brand} · {r.size} · {r.dist}
                  </div>
                </Tappable>
              </div>
            );
          })}
        </div>
      </div>

      {state.filters ? <FiltersSheet /> : null}
    </>
  );
}

function FiltersSheet() {
  const { state, set, m } = useStore();
  const close = () => set({ filters: false });
  const ship = state.delivery === 'ship';

  return (
    <Sheet onClose={close}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: SERIF, fontSize: 30 }}>Filtres</div>
        <button
          type="button"
          onClick={() => set({ size: 'S', delivery: 'ship', occasion: 'Soirée' })}
          style={{
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            fontFamily: SANS,
            fontSize: fs(14),
            fontWeight: 600,
            color: 'var(--plum)',
            minHeight: 44,
          }}
        >
          Réinitialiser
        </button>
      </div>

      <div style={{ marginTop: 14, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Taille
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        {SIZES.map((label) => {
          const c = pickerColors(state.size === label);
          return (
            <button
              key={label}
              type="button"
              aria-pressed={state.size === label}
              onClick={() => set({ size: label })}
              style={{
                cursor: 'pointer',
                flex: 1,
                minHeight: 46,
                fontFamily: SANS,
                fontSize: fs(15),
                fontWeight: 600,
                borderRadius: 12,
                border: `1px solid ${c.borderColor}`,
                background: c.background,
                color: c.color,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 18, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Remise
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        {([['ship', 'Livraison'], ['meet', 'Remise en main propre']] as const).map(([key, label]) => {
          const on = key === 'ship' ? ship : !ship;
          const c = pickerColors(on);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => set({ delivery: key })}
              style={{
                cursor: 'pointer',
                flex: 1,
                minHeight: 46,
                fontFamily: SANS,
                fontSize: fs(15),
                fontWeight: 600,
                borderRadius: 12,
                border: `1px solid ${c.borderColor}`,
                background: c.background,
                color: c.color,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 18, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Prix par jour · {m(60)} max
      </div>
      <div style={{ marginTop: 14, height: 4, borderRadius: 99, background: 'var(--surf2)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '62%', borderRadius: 99, background: 'var(--clay)' }} />
        <div
          style={{
            position: 'absolute',
            left: '62%',
            top: -9,
            width: 22,
            height: 22,
            borderRadius: 99,
            background: 'var(--ink)',
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      <button type="button" onClick={close} style={{ ...primaryButton, marginTop: 24 }}>
        Voir {RESULT_COUNT} pièces
      </button>
    </Sheet>
  );
}
