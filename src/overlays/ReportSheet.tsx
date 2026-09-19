import { reportReasons } from '../data/catalog';
import { useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { SANS, SERIF, fs, primaryButton } from '../ui/styles';
import { Sheet, Tappable } from '../ui/widgets';

export function ReportSheet() {
  const { state, set } = useStore();
  const { active } = useBooking();
  const target = `@${active.handle}`;
  const close = () => set({ report: false, reportSent: false });

  const outlineButton = {
    cursor: 'pointer',
    width: '100%',
    minHeight: 52,
    fontFamily: SANS,
    fontSize: fs(16),
    fontWeight: 700,
    borderRadius: 14,
    background: 'none',
  } as const;

  const block = () =>
    set((s) => ({
      blocked: { ...s.blocked, [active.handle]: true },
      report: false,
      reportSent: false,
      screen: 'blocked',
    }));

  return (
    <Sheet onClose={close}>
      {state.reportSent ? (
        <div style={{ padding: '6px 0 4px', textAlign: 'center' }}>
          <div
            style={{
              margin: '0 auto',
              width: 56,
              height: 56,
              borderRadius: 999,
              background: 'var(--claySoft)',
              color: 'var(--clay)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}
          >
            ✓
          </div>
          <div style={{ marginTop: 16, fontFamily: SERIF, fontSize: 30, lineHeight: 1.05 }}>Signalement envoyé</div>
          <div style={{ marginTop: 8, fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)' }}>
            Notre équipe l'examine sous 24 h. L'annonce est masquée pour vous en attendant.
          </div>
          <div style={{ marginTop: 20, display: 'grid', gap: 8 }}>
            <button type="button" onClick={block} style={{ ...outlineButton, border: '1px solid var(--plum)', color: 'var(--plum)' }}>
              Bloquer aussi {target}
            </button>
            <button type="button" onClick={close} style={{ ...primaryButton, minHeight: 52 }}>
              Terminé
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.05 }}>Signaler {target}</div>
          <div style={{ marginTop: 8, fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>
            Choisissez ce qui correspond le mieux. Les signalements sont anonymes pour la personne concernée.
          </div>

          <div style={{ marginTop: 16, display: 'grid', gap: 6 }} role="radiogroup" aria-label="Motif du signalement">
            {reportReasons.map((label, i) => {
              const on = state.reportReason === i;
              return (
                <Tappable
                  key={label}
                  onClick={() => set({ reportReason: i })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 48,
                    padding: '0 14px',
                    borderRadius: 12,
                    background: 'var(--surf2)',
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      flex: '0 0 20px',
                      borderRadius: 99,
                      border: `2px solid ${on ? 'var(--clay)' : 'var(--line2)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: 99, background: on ? 'var(--clay)' : 'transparent' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: fs(14) }}>{label}</div>
                </Tappable>
              );
            })}
          </div>

          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            <button type="button" onClick={() => set({ reportSent: true })} style={{ ...primaryButton, minHeight: 52 }}>
              Envoyer le signalement
            </button>
            <button type="button" onClick={block} style={{ ...outlineButton, border: '1px solid var(--line2)', color: 'var(--ink)' }}>
              Bloquer sans signaler
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
