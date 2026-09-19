import { boards as buildBoards, savedLooks } from '../data/catalog';
import { useStore } from '../state/store';
import { ImageSlot } from '../ui/ImageSlot';
import { SANS, SERIF, fs, screen } from '../ui/styles';
import { Header, Tappable } from '../ui/widgets';

const TAG_TONES = {
  clay: { background: 'var(--clay)', color: 'var(--onclay)' },
  plum: { background: 'var(--plum)', color: 'var(--onplum)' },
  dark: { background: 'rgba(12,10,11,0.82)', color: '#F6F1E9' },
} as const;

export function Boards() {
  const { set, go, m } = useStore();
  const boards = buildBoards(m);

  return (
    <div style={{ ...screen, padding: '60px 18px 24px' }}>
      <Header title="Vos tableaux" onBack={() => go('discover')} />
      <div style={{ marginTop: 8, fontSize: fs(14), color: 'var(--ink2)' }}>
        {savedLooks.length} enregistrements · 3 libres ce week-end
      </div>

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
        {boards.map((b) => (
          <Tappable key={b.id} onClick={() => set({ screen: 'board', board: b.id })} style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
                gridTemplateRows: 'repeat(2,66px)',
                gap: 3,
                borderRadius: 16,
                overflow: 'hidden',
                background: 'var(--surf2)',
              }}
            >
              {[1, 2, 3, 4].map((n) => (
                <div key={n} style={{ overflow: 'hidden' }}>
                  <ImageSlot id={`board-${b.id}-${n}`} shape="rect" />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 9, fontSize: fs(15), fontWeight: 700, lineHeight: 1.2 }}>{b.name}</div>
            <div style={{ marginTop: 2, fontSize: fs(12), color: 'var(--ink3)' }}>
              {b.count} enregistrements · {b.meta}
            </div>
          </Tappable>
        ))}

        <Tappable onClick={() => go('discover')} style={{ minWidth: 0 }} label="Nouveau tableau">
          <div
            style={{
              height: 135,
              borderRadius: 16,
              border: '1px dashed var(--line2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              color: 'var(--clay)',
            }}
          >
            +
          </div>
          <div style={{ marginTop: 9, fontSize: fs(15), fontWeight: 700, color: 'var(--clay)' }}>Nouveau tableau</div>
        </Tappable>
      </div>
    </div>
  );
}

export function BoardDetail() {
  const { state, set, go, m } = useStore();
  const boards = buildBoards(m);
  const board = boards.find((b) => b.id === state.board) ?? boards[0];

  return (
    <div style={{ ...screen, padding: '54px 12px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
        <button
          type="button"
          aria-label="Retour aux tableaux"
          onClick={() => go('boards')}
          style={{ cursor: 'pointer', width: 44, height: 44, flex: '0 0 44px', borderRadius: 999, border: '1px solid var(--line2)', background: 'none', fontSize: 18, color: 'var(--ink)' }}
        >
          ‹
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1.05 }}>{board.name}</div>
          <div style={{ marginTop: 3, fontSize: fs(13), color: 'var(--ink3)' }}>
            {board.count} enregistrements · {board.meta}
          </div>
        </div>
        <button
          type="button"
          onClick={() => go('search')}
          style={{
            cursor: 'pointer',
            minHeight: 40,
            padding: '0 14px',
            flex: '0 0 auto',
            fontFamily: SANS,
            fontSize: fs(13),
            fontWeight: 700,
            borderRadius: 999,
            border: 'none',
            background: 'var(--clay)',
            color: 'var(--onclay)',
          }}
        >
          Tout louer
        </button>
      </div>

      <div style={{ marginTop: 16, columnCount: 2, columnGap: 10 }}>
        {savedLooks.map((s) => (
          <div key={s.slot} style={{ breakInside: 'avoid', marginBottom: 10 }}>
            <Tappable
              onClick={() => set({ screen: 'detail', activeId: s.id })}
              label={s.title}
              style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: 'var(--surf2)', height: s.h }}
            >
              <ImageSlot id={`saved-${s.slot}`} shape="rounded" radius={16} placeholder={s.title} />
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  right: 8,
                  fontSize: fs(10),
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '5px 7px',
                  borderRadius: 6,
                  pointerEvents: 'none',
                  ...TAG_TONES[s.tagTone],
                }}
              >
                {s.tag}
              </div>
            </Tappable>
            <div style={{ marginTop: 7, fontSize: fs(14), fontWeight: 600, lineHeight: 1.25 }}>{s.title}</div>
            <div style={{ marginTop: 2, fontSize: fs(13), color: 'var(--ink3)' }}>{m(s.price)} / jour</div>
          </div>
        ))}
      </div>
    </div>
  );
}
