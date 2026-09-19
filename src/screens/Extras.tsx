import { CATEGORIES, OCCASIONS, SIZES, helpTopics } from '../data/catalog';
import { useStore } from '../state/store';
import { SANS, amount, fs, primaryButton, screen } from '../ui/styles';
import { Chip, Header, ListRow, Note, Toggle } from '../ui/widgets';

const card = {
  padding: 16,
  borderRadius: 16,
  background: 'var(--surf)',
  border: '1px solid var(--line)',
} as const;

export function Referral() {
  const { go, m } = useStore();
  const code = 'ROTA-CAMILLE-15';

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Parrainage" onBack={() => go('closet')} size={32} />
      <div style={{ ...card, marginTop: 18, background: 'var(--clay)', color: 'var(--onclay)', border: 'none' }}>
        <div style={{ fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase' }}>Vous gagnez</div>
        <div style={{ marginTop: 8, ...amount(40) }}>{m(15)}</div>
        <div style={{ marginTop: 8, fontSize: fs(13), lineHeight: 1.5 }}>
          par personne qui s'inscrit avec votre code et termine sa première location. Elle reçoit {m(10)} de réduction.
        </div>
      </div>

      <div style={{ ...card, marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: fs(12), letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
            Votre code
          </div>
          <div style={{ marginTop: 4, fontSize: fs(16), fontWeight: 700 }}>{code}</div>
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(code).catch(() => {})}
          style={{
            cursor: 'pointer',
            flex: '0 0 auto',
            minHeight: 44,
            padding: '0 16px',
            fontFamily: SANS,
            fontSize: fs(14),
            fontWeight: 700,
            borderRadius: 12,
            border: '1px solid var(--line2)',
            background: 'none',
            color: 'var(--ink)',
          }}
        >
          Copier
        </button>
      </div>

      <button type="button" style={{ ...primaryButton, marginTop: 12 }}>
        Partager mon code
      </button>

      <div style={{ marginTop: 22, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Vos filleules
      </div>
      <div style={{ marginTop: 10, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)', overflow: 'hidden' }}>
        <ListRow label="Inès D." detail={`${m(15)} crédités`} detailColor="var(--clay)" />
        <ListRow label="Manon L." detail="Location en cours" last />
      </div>
    </div>
  );
}

export function Promote() {
  const { go, m } = useStore();

  const options = [
    { title: 'Dressing à la une', body: 'Votre dressing en tête des résultats pendant 7 jours.', price: 4 },
    { title: 'Remonter une annonce', body: 'La pièce repasse en haut du fil « Près de moi ».', price: 2 },
    { title: 'Mise en avant vidéo', body: 'Votre vidéo est diffusée dans le feed des profils proches.', price: 6 },
  ];

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Outils de promotion" onBack={() => go('closet')} size={32} />
      <p style={{ margin: '10px 0 0', fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>
        Payé à l'acte, sans abonnement. Le prix est affiché avant l'achat et prélevé sur votre moyen de paiement.
      </p>
      <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
        {options.map((o) => (
          <div key={o.title} style={card}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: fs(15), fontWeight: 700 }}>{o.title}</div>
              <div style={{ flex: '0 0 auto', ...amount(15), color: 'var(--clay)' }}>{m(o.price)}</div>
            </div>
            <div style={{ marginTop: 5, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>{o.body}</div>
            <button
              type="button"
              style={{
                cursor: 'pointer',
                marginTop: 12,
                width: '100%',
                minHeight: 44,
                fontFamily: SANS,
                fontSize: fs(14),
                fontWeight: 700,
                borderRadius: 12,
                border: '1px solid var(--line2)',
                background: 'none',
                color: 'var(--ink)',
              }}
            >
              Choisir cette option
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Preferences() {
  const { state, set, go } = useStore();

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Mes préférences" onBack={() => go('closet')} size={32} />
      <p style={{ margin: '10px 0 0', fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>
        Ce que vous choisissez ici filtre le feed et les alertes. Rien n'est public.
      </p>

      <div style={{ marginTop: 20, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Vos tailles
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SIZES.map((s) => (
          <Chip key={s} label={s} on={state.size === s} onClick={() => set({ size: s })} />
        ))}
      </div>

      <div style={{ marginTop: 20, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Occasions suivies
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {OCCASIONS.map((o) => (
          <Chip key={o} label={o} tone="plum" on={state.occasion === o} onClick={() => set({ occasion: o })} />
        ))}
      </div>

      <div style={{ marginTop: 20, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Catégories préférées
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} on={state.category === c} onClick={() => set({ category: c })} />
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <Note>Vos préférences servent aussi à prévenir quand une pièce de votre taille se libère près de chez vous.</Note>
      </div>
    </div>
  );
}

export function Bundles() {
  const { state, set, go } = useStore();

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Réduction sur les lots" onBack={() => go('closet')} size={30} />
      <p style={{ margin: '10px 0 0', fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>
        Quand quelqu'un loue plusieurs de vos pièces sur les mêmes dates, la remise s'applique automatiquement et une
        seule livraison est facturée.
      </p>

      <div style={{ ...card, marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: fs(15), fontWeight: 700 }}>Activer les lots</div>
          <div style={{ marginTop: 3, fontSize: fs(13), color: 'var(--ink2)' }}>À partir de 2 pièces</div>
        </div>
        <Toggle on={state.bundlesOn} label="Réduction sur les lots" onChange={() => set((s) => ({ bundlesOn: !s.bundlesOn }))} />
      </div>

      {state.bundlesOn ? (
        <div style={{ ...card, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: fs(15), fontWeight: 700 }}>Remise appliquée</div>
              <div style={{ marginTop: 3, fontSize: fs(13), color: 'var(--ink2)' }}>Sur le total des pièces louées</div>
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                aria-label="Diminuer la remise"
                onClick={() => set((s) => ({ bundlePct: Math.max(5, s.bundlePct - 5) }))}
                style={{ cursor: 'pointer', width: 40, height: 40, borderRadius: 12, border: '1px solid var(--line2)', background: 'none', color: 'var(--ink)', fontSize: 20 }}
              >
                −
              </button>
              <div style={{ minWidth: 56, textAlign: 'center', ...amount(18) }}>{state.bundlePct} %</div>
              <button
                type="button"
                aria-label="Augmenter la remise"
                onClick={() => set((s) => ({ bundlePct: Math.min(40, s.bundlePct + 5) }))}
                style={{ cursor: 'pointer', width: 40, height: 40, borderRadius: 12, border: '1px solid var(--line2)', background: 'none', color: 'var(--ink)', fontSize: 18 }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Vacation() {
  const { state, set, go } = useStore();

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Mode vacances" onBack={() => go('closet')} size={32} />
      <p style={{ margin: '10px 0 0', fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>
        Vos annonces restent visibles mais ne peuvent plus être réservées. Les locations en cours ne sont pas affectées.
      </p>

      <div style={{ ...card, marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: fs(15), fontWeight: 700 }}>Mettre en pause</div>
          <div style={{ marginTop: 3, fontSize: fs(13), color: 'var(--ink2)' }}>
            {state.vacation ? 'Réservations suspendues' : 'Réservations ouvertes'}
          </div>
        </div>
        <Toggle on={state.vacation} label="Mode vacances" onChange={() => set((s) => ({ vacation: !s.vacation }))} />
      </div>

      {state.vacation ? (
        <div style={{ marginTop: 12 }}>
          <Note>
            Un bandeau « De retour bientôt » s'affiche sur votre dressing. Pensez à répondre aux messages sous 48 h pour
            garder votre taux de réponse.
          </Note>
        </div>
      ) : null}
    </div>
  );
}

export function Help() {
  const { set, go } = useStore();

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Centre d'aide" onBack={() => go('closet')} size={32} />

      <div style={{ marginTop: 18, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)', overflow: 'hidden' }}>
        {helpTopics.map((t, i) => (
          <ListRow key={t.label} label={t.label} detail={t.detail} onClick={() => {}} last={i === helpTopics.length - 1} />
        ))}
      </div>

      <div style={{ marginTop: 20, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Toujours bloquée ?
      </div>
      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
        <button type="button" style={{ ...primaryButton, minHeight: 50, fontSize: fs(15) }}>
          Écrire au support
        </button>
        <button
          type="button"
          onClick={() => set({ report: true, reportSent: false })}
          style={{
            cursor: 'pointer',
            width: '100%',
            minHeight: 50,
            fontFamily: SANS,
            fontSize: fs(15),
            fontWeight: 700,
            borderRadius: 14,
            border: '1px solid var(--plum)',
            background: 'none',
            color: 'var(--plum)',
          }}
        >
          Signaler un problème de sécurité
        </button>
      </div>

      <div style={{ marginTop: 20, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)', overflow: 'hidden' }}>
        <ListRow label="Règles de la communauté" onClick={() => go('guidelines')} />
        <ListRow label="Frais et annulation" onClick={() => go('fees')} />
        <ListRow label="Remise en main propre" onClick={() => go('safety')} last />
      </div>
    </div>
  );
}
