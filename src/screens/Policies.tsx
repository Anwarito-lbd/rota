import { FEES, rules, safetyTips } from '../data/catalog';
import { useStore } from '../state/store';
import { ImageSlot } from '../ui/ImageSlot';
import { SANS, amount, fs, primaryButton, screen } from '../ui/styles';
import { Header, Note } from '../ui/widgets';

export function Fees() {
  const { go, m } = useStore();

  const feeRows = [
    {
      label: 'Commission Rota',
      value: `${Math.round(FEES.commission * 100)}% pour la prêteuse`,
      body: 'Prélevée sur le versement, jamais ajoutée au locataire.',
    },
    {
      label: 'Nettoyage',
      value: 'Fixé par la prêteuse',
      body: `Facturé uniquement si la prêteuse préfère nettoyer la pièce elle-même (souvent ${m(FEES.cleaningSuggested)}). Sinon, vous la rendez propre, sans frais.`,
    },
    {
      label: 'Protection dommages',
      value: `${m(FEES.cover)} par location`,
      body: `Couvre jusqu'à ${m(FEES.coverCap)} après examen du dossier.`,
    },
    {
      label: 'Livraison aller-retour',
      value: m(FEES.shipping),
      body: 'Étiquette prépayée dans les deux sens. Offerte en main propre.',
    },
    {
      label: 'Caution',
      value: `${m(FEES.deposit)} bloqués`,
      body: 'Autorisation, pas un prélèvement. Libérée 48 h après le retour.',
    },
    {
      label: 'Retard',
      value: `${m(FEES.latePerDay)} par jour`,
      body: 'Plafonné à la valeur de remplacement de la pièce.',
    },
  ];

  const cancelRows = [
    { label: 'Plus de 7 jours avant', value: 'Remboursement intégral' },
    { label: '3 à 7 jours avant', value: 'Remboursement à 50%' },
    { label: 'Moins de 48 h', value: 'Frais de nettoyage et de livraison non remboursés' },
    { label: 'Annulation par la prêteuse', value: `Remboursement intégral + ${m(15)} de crédit` },
  ];

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Frais et annulation" onBack={() => go('detail')} size={32} />
      <p style={{ margin: '10px 0 0', fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>
        Tous les montants sont affichés avant paiement. Rien n'est ajouté après.
      </p>

      <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
        {feeRows.map((f) => (
          <div key={f.label} style={{ padding: 14, borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: fs(15), fontWeight: 700 }}>{f.label}</div>
              <div style={{ flex: '0 0 auto', fontSize: fs(14), fontWeight: 700, color: 'var(--clay)' }}>{f.value}</div>
            </div>
            <div style={{ marginTop: 5, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>{f.body}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
        Annulation
      </div>
      <div style={{ marginTop: 10, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)', overflow: 'hidden' }}>
        {cancelRows.map((c, i) => (
          <div
            key={c.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minHeight: 52,
              padding: '10px 15px',
              borderBottom: i === cancelRows.length - 1 ? 'none' : '1px solid var(--line)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0, fontSize: fs(14) }}>{c.label}</div>
            <div style={{ flex: '0 0 45%', textAlign: 'right', fontSize: fs(13), fontWeight: 600, color: 'var(--ink2)' }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Note>
          Rota est une place de marché : le contrat de location lie le locataire et la prêteuse. Nous encaissons,
          couvrons les dommages et arbitrons les litiges. Droit de rétractation : la location d'un bien à date fixe en
          est exclue, comme pour une réservation d'hôtel.
        </Note>
      </div>
    </div>
  );
}

export function Safety() {
  const { set, go } = useStore();

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Remise en main propre" onBack={() => go('rentals')} size={32} />

      <div style={{ marginTop: 18, padding: 18, borderRadius: 18, background: 'var(--surf)', border: '1px solid var(--clay)' }}>
        <div style={{ fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
          Votre code de remise
        </div>
        <div style={{ marginTop: 8, ...amount(44), letterSpacing: '0.16em', color: 'var(--clay)' }}>
          4 7 1 9
        </div>
        <div style={{ marginTop: 8, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>
          Montrez-le à Juliette au moment de l'échange. Elle entre le code dans l'app pour démarrer la location.
        </div>
      </div>

      <div style={{ marginTop: 12, padding: 14, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
        <div style={{ fontSize: fs(15), fontWeight: 700 }}>Point de rendez-vous suggéré</div>
        <div style={{ marginTop: 4, fontSize: fs(13), color: 'var(--ink2)' }}>
          Café de la Gare · 12 rue de Belleville · ouvert jusqu'à 23 h
        </div>
        <div style={{ marginTop: 12, height: 130, borderRadius: 12, overflow: 'hidden' }}>
          <ImageSlot id="safety-map" shape="rounded" radius={12} placeholder="Carte du point de remise" />
        </div>
        <button
          type="button"
          style={{
            cursor: 'pointer',
            marginTop: 12,
            width: '100%',
            minHeight: 46,
            fontFamily: SANS,
            fontSize: fs(14),
            fontWeight: 700,
            border: '1px solid var(--line2)',
            borderRadius: 12,
            background: 'none',
            color: 'var(--ink)',
          }}
        >
          Partager l'heure et le lieu à un proche
        </button>
      </div>

      <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
        {safetyTips.map((t) => (
          <div key={t.title} style={{ padding: 14, borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: fs(14), fontWeight: 700 }}>{t.title}</div>
            <div style={{ marginTop: 4, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink2)' }}>{t.body}</div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => set({ report: true, reportSent: false })}
        style={{
          cursor: 'pointer',
          marginTop: 14,
          width: '100%',
          minHeight: 50,
          fontFamily: SANS,
          fontSize: fs(15),
          fontWeight: 700,
          border: '1px solid var(--plum)',
          borderRadius: 14,
          background: 'none',
          color: 'var(--plum)',
        }}
      >
        Signaler un problème de sécurité
      </button>
    </div>
  );
}

export function Guidelines() {
  const { set, go } = useStore();

  return (
    <div style={{ ...screen, padding: '54px 18px 24px' }}>
      <Header title="Règles de la communauté" onBack={() => go('settings')} size={32} />
      <p style={{ margin: '10px 0 0', fontSize: fs(14), lineHeight: 1.55, color: 'var(--ink2)', maxWidth: '34ch' }}>
        Acceptées à l'inscription. Signalez tout manquement depuis le menu ••• d'une annonce, d'un profil ou d'un
        message.
      </p>

      <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
        {rules.map((r) => (
          <div key={r.title} style={{ padding: 15, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: fs(15), fontWeight: 700 }}>{r.title}</div>
            <div style={{ marginTop: 5, fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)' }}>{r.body}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Note>
          Nous examinons chaque signalement sous 24 h. Les annonces signalées sont masquées pendant l'examen. Les
          récidives entraînent la suppression définitive du compte et le remboursement des locataires concernés.
        </Note>
      </div>

      <button type="button" onClick={() => set({ report: true, reportSent: false })} style={{ ...primaryButton, marginTop: 14, minHeight: 50 }}>
        Signaler un contenu
      </button>
    </div>
  );
}
