import { FEES, OCCASIONS, SIZES, authenticityProofs, listSteps, marketData } from '../data/catalog';
import { useStore } from '../state/store';
import { ImageSlot } from '../ui/ImageSlot';
import { SANS, amount, footerBar, fs, pickerColors, primaryButton, screen } from '../ui/styles';
import { Chip, Note, Steps, Toggle } from '../ui/widgets';

const BIN_SHAPE = [0.26, 0.52, 0.82, 1, 0.6, 0.32];

const box = { padding: 14, borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' } as const;
const label = { fontSize: fs(11), letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)' } as const;

function Stepper({ value, onDown, onUp, label: name }: { value: string; onDown: () => void; onUp: () => void; label: string }) {
  const btn = {
    cursor: 'pointer',
    width: 40,
    height: 40,
    borderRadius: 12,
    border: '1px solid var(--line2)',
    background: 'none',
    color: 'var(--ink)',
    fontFamily: SANS,
  } as const;
  return (
    <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
      <button type="button" aria-label={`Diminuer ${name}`} onClick={onDown} style={{ ...btn, fontSize: 20 }}>
        −
      </button>
      <div style={{ minWidth: 60, textAlign: 'center', ...amount(16) }}>{value}</div>
      <button type="button" aria-label={`Augmenter ${name}`} onClick={onUp} style={{ ...btn, fontSize: 18 }}>
        +
      </button>
    </div>
  );
}

function StepMedia() {
  return (
    <>
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
        <div style={{ gridColumn: 'span 2', height: 230, borderRadius: 14, overflow: 'hidden' }}>
          <ImageSlot id="list-video" shape="rounded" radius={14} editable video placeholder="Vidéo verticale 9:16" />
        </div>
        <div style={{ height: 120, borderRadius: 12, overflow: 'hidden' }}>
          <ImageSlot id="list-photo-1" shape="rounded" radius={12} editable placeholder="Face" />
        </div>
        <div style={{ height: 120, borderRadius: 12, overflow: 'hidden' }}>
          <ImageSlot id="list-photo-2" shape="rounded" radius={12} editable placeholder="Dos / défauts" />
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <Note>
          Les annonces avec une vidéo sont louées 4× plus souvent. Filmez en lumière du jour, montrez le dos, et
          photographiez chaque défaut — c'est ce qui vous protège en cas de litige.
        </Note>
      </div>
    </>
  );
}

function StepDetails() {
  const { state, set, m } = useStore();

  const addRule = () => {
    const rule = state.listRuleDraft.trim();
    if (!rule) return;
    set((s) => ({ listRules: [...s.listRules, rule], listRuleDraft: '' }));
  };

  return (
    <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
      <div style={box}>
        <div style={label}>Titre</div>
        <div style={{ marginTop: 5, fontSize: fs(16), fontWeight: 600 }}>Nuisette en biais, ivoire</div>
      </div>
      <div style={box}>
        <div style={label}>Marque et valeur neuve</div>
        <div style={{ marginTop: 5, fontSize: fs(16), fontWeight: 600 }}>Réalisation Par · {m(340)}</div>
      </div>

      <div style={box}>
        <div style={label}>Taille et tombé</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          {SIZES.map((s) => {
            const c = pickerColors(state.size === s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={state.size === s}
                onClick={() => set({ size: s })}
                style={{
                  cursor: 'pointer',
                  flex: 1,
                  minHeight: 44,
                  fontFamily: SANS,
                  fontSize: fs(14),
                  fontWeight: 600,
                  borderRadius: 10,
                  border: `1px solid ${c.borderColor}`,
                  background: c.background,
                  color: c.color,
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div style={box}>
        <div style={label}>Occasions</div>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {OCCASIONS.map((o) => (
            <Chip key={o} label={o} tone="plum" on={state.occasion === o} onClick={() => set({ occasion: o })} />
          ))}
        </div>
      </div>

      <div style={box}>
        <div style={label}>Preuve d'authenticité</div>
        <div style={{ marginTop: 6, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>
          Obligatoire pour les marques protégées. Sans preuve, l'annonce est publiée sans le badge « Authenticité
          vérifiée » et peut être masquée après signalement.
        </div>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
          <div style={{ height: 130, borderRadius: 12, overflow: 'hidden' }}>
            <ImageSlot id="list-receipt" shape="rounded" radius={12} editable placeholder="Facture ou ticket" />
          </div>
          <div style={{ height: 130, borderRadius: 12, overflow: 'hidden' }}>
            <ImageSlot id="list-tag" shape="rounded" radius={12} editable placeholder="Étiquette de la pièce" />
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          {authenticityProofs.map((p) => (
            <div key={p.key} style={{ fontSize: fs(12), lineHeight: 1.45, color: 'var(--ink3)' }}>
              <span style={{ color: 'var(--ink2)', fontWeight: 700 }}>{p.label} : </span>
              {p.body}
            </div>
          ))}
        </div>
      </div>

      <div style={box}>
        <div style={label}>Vos règles</div>
        <div style={{ marginTop: 6, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>
          La locataire doit les accepter avant de payer.
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          {state.listRules.map((rule) => (
            <div
              key={rule}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--surf2)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, fontSize: fs(14), lineHeight: 1.4 }}>{rule}</div>
              <button
                type="button"
                aria-label={`Retirer la règle ${rule}`}
                onClick={() => set((s) => ({ listRules: s.listRules.filter((r) => r !== rule) }))}
                style={{
                  cursor: 'pointer',
                  flex: '0 0 auto',
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  border: 'none',
                  background: 'none',
                  color: 'var(--ink3)',
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <input
            value={state.listRuleDraft}
            placeholder="Ex. : pas de cigarette"
            onChange={(e) => set({ listRuleDraft: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addRule();
              }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 46,
              padding: '0 14px',
              borderRadius: 12,
              border: '1px solid var(--line2)',
              background: 'var(--surf2)',
              color: 'var(--ink)',
              fontFamily: SANS,
              fontSize: fs(14),
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={addRule}
            style={{
              cursor: 'pointer',
              flex: '0 0 auto',
              minHeight: 46,
              padding: '0 16px',
              fontFamily: SANS,
              fontSize: fs(14),
              fontWeight: 700,
              borderRadius: 12,
              border: 'none',
              background: 'var(--clay)',
              color: 'var(--onclay)',
            }}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

function StepPricing() {
  const { state, set, m } = useStore();
  const band = marketData[state.listCat] ?? marketData.Nuisette;
  const binLow = Math.max(1, Math.round(band.low * 0.6));
  const binStep = (Math.round(band.high * 1.35) - binLow) / 6;
  const netThree = Math.round(state.listPrice * 3 * (1 - FEES.commission));

  return (
    <>
      <div style={{ marginTop: 18, ...label }}>Type de pièce</div>
      <div style={{ marginTop: 8, display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
        {Object.keys(marketData).map((cat) => (
          <Chip
            key={cat}
            label={cat}
            on={state.listCat === cat}
            onClick={() =>
              set({
                listCat: cat,
                listPrice: marketData[cat].med,
                minOffer: Math.max(1, Math.round(marketData[cat].low * 1.1)),
              })
            }
          />
        ))}
      </div>

      <div style={{ marginTop: 12, padding: 16, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={label}>Votre prix par jour</div>
            <div style={{ marginTop: 6, ...amount(40), color: 'var(--clay)' }}>{m(state.listPrice)}</div>
          </div>
          <div style={{ flex: '0 0 auto', display: 'flex', gap: 8 }}>
            <button
              type="button"
              aria-label="Baisser le prix"
              onClick={() => set((s) => ({ listPrice: Math.max(1, s.listPrice - 1) }))}
              style={{ cursor: 'pointer', width: 46, height: 46, borderRadius: 14, border: '1px solid var(--line2)', background: 'none', color: 'var(--ink)', fontSize: 22, fontFamily: SANS }}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Augmenter le prix"
              onClick={() => set((s) => ({ listPrice: s.listPrice + 1 }))}
              style={{ cursor: 'pointer', width: 46, height: 46, borderRadius: 14, border: '1px solid var(--line2)', background: 'none', color: 'var(--ink)', fontSize: 20, fontFamily: SANS }}
            >
              +
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-end', gap: 5, height: 96 }}>
          {BIN_SHAPE.map((f, i) => {
            const lo = Math.round(binLow + binStep * i);
            const hi = Math.round(binLow + binStep * (i + 1));
            const on = state.listPrice >= lo && (i === BIN_SHAPE.length - 1 || state.listPrice < hi);
            return (
              <div key={lo} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: '100%',
                    height: Math.round(18 + f * 70),
                    borderRadius: '6px 6px 2px 2px',
                    background: on ? 'var(--clay)' : 'var(--surf2)',
                  }}
                />
                <div style={{ ...amount(10, 600), color: on ? 'var(--ink)' : 'var(--ink3)' }}>{m(lo)}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>
          {band.count} {band.label} en location à Paris ces 30 derniers jours · médiane {m(band.med)} / jour, le plus
          souvent entre {m(band.low)} et {m(band.high)}.
        </div>

        <button
          type="button"
          onClick={() => set({ listPrice: band.med })}
          style={{
            cursor: 'pointer',
            marginTop: 12,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--claySoft)',
            border: '1px solid var(--clay)',
            minHeight: 44,
            textAlign: 'left',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: fs(14), fontWeight: 700, color: 'var(--ink)' }}>
              Prix conseillé {m(band.med)} / jour
            </div>
            <div style={{ marginTop: 2, fontSize: fs(12), color: 'var(--ink2)' }}>Loué en moyenne sous 4 jours à ce tarif</div>
          </div>
          <div style={{ flex: '0 0 auto', fontSize: fs(13), fontWeight: 700, color: 'var(--clay)' }}>Appliquer</div>
        </button>

        <div style={{ marginTop: 10, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink3)' }}>
          Vous gardez {m(netThree)} sur 3 jours, après notre commission de {Math.round(FEES.commission * 100)} %.
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 14,
          background: 'var(--surf)',
          border: `1px solid ${state.listLenderCleans ? 'var(--clay)' : 'var(--line)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: fs(15), fontWeight: 700 }}>Je ne veux pas qu'on lave la pièce</div>
            <div style={{ marginTop: 3, fontSize: fs(13), lineHeight: 1.45, color: 'var(--ink2)' }}>
              Vous vous chargez du nettoyage et facturez des frais à la locataire. Désactivé, la pièce doit vous être
              rendue propre, sans frais.
            </div>
          </div>
          <Toggle
            on={state.listLenderCleans}
            label="Nettoyage par mes soins"
            onChange={() => set((s) => ({ listLenderCleans: !s.listLenderCleans }))}
          />
        </div>

        {state.listLenderCleans ? (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: fs(14), fontWeight: 700 }}>Frais de nettoyage</div>
              <div style={{ marginTop: 2, fontSize: fs(12), color: 'var(--ink2)' }}>
                Facturés une seule fois, affichés avant paiement · conseillé {m(FEES.cleaningSuggested)}
              </div>
            </div>
            <Stepper
              label="les frais de nettoyage"
              value={m(state.listCleaningFee)}
              onDown={() => set((s) => ({ listCleaningFee: Math.max(0, s.listCleaningFee - 1) }))}
              onUp={() => set((s) => ({ listCleaningFee: s.listCleaningFee + 1 }))}
            />
          </div>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 14,
          background: 'var(--surf)',
          border: `1px solid ${state.acceptOffers ? 'var(--clay)' : 'var(--line)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: fs(15), fontWeight: 700 }}>Accepter les propositions</div>
            <div style={{ marginTop: 3, fontSize: fs(13), lineHeight: 1.45, color: 'var(--ink2)' }}>
              Les locataires peuvent proposer un prix. Vous acceptez, refusez ou faites une contre-offre.
            </div>
          </div>
          <Toggle
            on={state.acceptOffers}
            label="Accepter les propositions"
            onChange={() => set((s) => ({ acceptOffers: !s.acceptOffers }))}
          />
        </div>

        {state.acceptOffers ? (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: fs(14), fontWeight: 700 }}>Refus automatique sous</div>
              <div style={{ marginTop: 2, fontSize: fs(12), color: 'var(--ink2)' }}>
                Les propositions plus basses ne vous sont pas notifiées
              </div>
            </div>
            <Stepper
              label="le seuil de refus"
              value={m(state.minOffer)}
              onDown={() => set((s) => ({ minOffer: Math.max(1, s.minOffer - 1) }))}
              onUp={() => set((s) => ({ minOffer: s.minOffer + 1 }))}
            />
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: fs(15), fontWeight: 700 }}>Réservation immédiate</div>
            <div style={{ fontSize: fs(13), color: 'var(--ink2)' }}>Les locataires à l'identité vérifiée réservent sans demander</div>
          </div>
          <Toggle on={state.instant} label="Réservation immédiate" onChange={() => set((s) => ({ instant: !s.instant }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: fs(15), fontWeight: 700 }}>Remise en main propre</div>
            <div style={{ fontSize: fs(13), color: 'var(--ink2)' }}>Paris 11e · dans un rayon de 5 km</div>
          </div>
          <Toggle on={state.local} label="Remise en main propre" onChange={() => set((s) => ({ local: !s.local }))} />
        </div>
      </div>
    </>
  );
}

export function ListPiece() {
  const { state, set, go } = useStore();
  const step = listSteps[state.listStep];
  const cta = ['Ajouter les détails', 'Définir le prix', 'Mettre en location'][state.listStep];

  const back = () => (state.listStep > 0 ? set({ listStep: state.listStep - 1 }) : go('closet'));
  const next = () =>
    state.listStep < 2 ? set({ listStep: state.listStep + 1 }) : set({ screen: 'closet', listStep: 0 });

  return (
    <>
      <div style={{ ...screen, padding: '54px 18px 140px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            aria-label="Étape précédente"
            onClick={back}
            style={{ cursor: 'pointer', width: 44, height: 44, flex: '0 0 44px', borderRadius: 999, border: '1px solid var(--line2)', background: 'none', fontSize: 18, color: 'var(--ink)' }}
          >
            ‹
          </button>
          <Steps current={state.listStep} />
        </div>

        <div style={{ marginTop: 18, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--clay)' }}>
          {step.label}
        </div>
        <h1 style={{ margin: '8px 0 0', fontSize: fs(28), lineHeight: 1.15, fontWeight: 700 }}>{step.title}</h1>
        <p style={{ margin: '8px 0 0', fontSize: fs(15), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>{step.body}</p>

        {state.listStep === 0 ? <StepMedia /> : null}
        {state.listStep === 1 ? <StepDetails /> : null}
        {state.listStep === 2 ? <StepPricing /> : null}
      </div>

      <div style={footerBar}>
        <button type="button" onClick={next} style={primaryButton}>
          {cta}
        </button>
      </div>
    </>
  );
}
