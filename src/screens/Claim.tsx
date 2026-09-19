import { FEES, claimKinds, claimSteps } from '../data/catalog';
import { useStore } from '../state/store';
import { ImageSlot } from '../ui/ImageSlot';
import { SERIF, footerBar, fs, primaryButton, screen } from '../ui/styles';
import { Note, Steps } from '../ui/widgets';

export function Claim() {
  const { state, set, go, m } = useStore();
  const step = claimSteps[state.claimStep];
  const cta = ['Ajouter des photos', 'Envoyer le signalement', 'Retour aux locations'][state.claimStep];

  const back = () => (state.claimStep > 0 ? set({ claimStep: state.claimStep - 1 }) : go('rentals'));
  const next = () =>
    state.claimStep < 2 ? set({ claimStep: state.claimStep + 1 }) : set({ screen: 'rentals', claimStep: 0 });

  const outcomes = [
    { title: 'Sous 48 h', body: 'Un humain examine les photos et les messages des deux côtés.' },
    {
      title: 'Caution bloquée, pas prélevée',
      body: `Les ${m(FEES.deposit)} restent en autorisation. Aucun prélèvement sans décision écrite.`,
    },
    {
      title: `Couverture jusqu'à ${m(FEES.coverCap)}`,
      body: "Réparation d'abord, remplacement si la pièce est perdue.",
    },
  ];

  return (
    <>
      <div style={{ ...screen, padding: '54px 18px 130px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            aria-label="Étape précédente"
            onClick={back}
            style={{ cursor: 'pointer', width: 44, height: 44, flex: '0 0 44px', borderRadius: 999, border: '1px solid var(--line2)', background: 'none', fontSize: 18, color: 'var(--ink)' }}
          >
            ‹
          </button>
          <Steps current={state.claimStep} />
        </div>

        <div style={{ marginTop: 18, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--plum)' }}>
          {step.label}
        </div>
        <h1 style={{ margin: '8px 0 0', fontFamily: SERIF, fontSize: 34, lineHeight: 1.05, fontWeight: 400 }}>{step.title}</h1>
        <p style={{ margin: '8px 0 0', fontSize: fs(15), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>{step.body}</p>

        {state.claimStep === 0 ? (
          <>
            <div style={{ marginTop: 20, display: 'grid', gap: 8 }} role="radiogroup" aria-label="Type de dommage">
              {claimKinds.map((k, i) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={state.claimKind === i}
                  onClick={() => set({ claimKind: i })}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 56,
                    padding: '0 15px',
                    borderRadius: 14,
                    background: 'var(--surf)',
                    border: `1px solid ${state.claimKind === i ? 'var(--clay)' : 'var(--line)'}`,
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      flex: '0 0 20px',
                      borderRadius: 99,
                      border: `2px solid ${state.claimKind === i ? 'var(--clay)' : 'var(--line2)'}`,
                      background: state.claimKind === i ? 'var(--clay)' : 'transparent',
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0, fontSize: fs(15), color: 'var(--ink)' }}>{k}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <Note>Le nettoyage normal n'est jamais un dommage — il est déjà payé dans la location.</Note>
            </div>
          </>
        ) : null}

        {state.claimStep === 1 ? (
          <>
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              <div style={{ height: 150, borderRadius: 12, overflow: 'hidden' }}>
                <ImageSlot id="claim-1" shape="rounded" radius={12} placeholder="Photo large" />
              </div>
              <div style={{ height: 150, borderRadius: 12, overflow: 'hidden' }}>
                <ImageSlot id="claim-2" shape="rounded" radius={12} placeholder="Gros plan" />
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: 14,
                borderRadius: 14,
                background: 'var(--surf)',
                border: '1px solid var(--line)',
                fontSize: fs(14),
                lineHeight: 1.5,
                color: 'var(--ink3)',
              }}
            >
              Décrire ce qui s'est passé…
            </div>
            <div style={{ marginTop: 10 }}>
              <Note>La prêteuse voit votre signalement et peut répondre avant toute décision.</Note>
            </div>
          </>
        ) : null}

        {state.claimStep === 2 ? (
          <div style={{ marginTop: 20, display: 'grid', gap: 8 }}>
            {outcomes.map((o) => (
              <div key={o.title} style={{ padding: 15, borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: fs(14), fontWeight: 700 }}>{o.title}</div>
                <div style={{ marginTop: 4, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>{o.body}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={footerBar}>
        <button type="button" onClick={next} style={primaryButton}>
          {cta}
        </button>
      </div>
    </>
  );
}
