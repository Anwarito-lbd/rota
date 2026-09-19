import { useStore } from '../state/store';
import { SANS, SERIF, fs, primaryButton } from '../ui/styles';
import { Sheet } from '../ui/widgets';

export function DeleteAccount() {
  const { state, set, m } = useStore();
  const close = () => set({ deleteStep: 0 });

  if (state.deleteStep === 2) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 80,
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 36,
          textAlign: 'center',
          animation: 'rotaIn .22s ease',
        }}
      >
        <div style={{ fontFamily: SERIF, fontSize: 36, lineHeight: 1.05 }}>Compte supprimé</div>
        <div style={{ marginTop: 12, fontSize: fs(15), lineHeight: 1.55, color: 'var(--ink2)' }}>
          Vos données sont effacées sous 30 jours. Un e-mail de confirmation part maintenant. Vous pouvez revenir quand
          vous voulez.
        </div>
        <button
          type="button"
          onClick={close}
          style={{
            cursor: 'pointer',
            marginTop: 24,
            minHeight: 52,
            padding: '0 24px',
            fontFamily: SANS,
            fontSize: fs(16),
            fontWeight: 700,
            border: '1px solid var(--line2)',
            borderRadius: 14,
            background: 'none',
            color: 'var(--ink)',
          }}
        >
          Fermer
        </button>
      </div>
    );
  }

  return (
    <Sheet onClose={close}>
      <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.05 }}>Supprimer votre compte</div>
      <div style={{ marginTop: 10, fontSize: fs(14), lineHeight: 1.55, color: 'var(--ink2)' }}>
        Ceci supprime votre profil, vos 7 annonces, vos tableaux et vos messages. Deux locations sont en cours : elles
        doivent être rendues avant la suppression.
      </div>
      <div style={{ marginTop: 14, display: 'grid', gap: 6 }}>
        {[
          `Solde de ${m(226)} versé avant la fermeture`,
          'Factures conservées le temps légal, puis effacées',
        ].map((line) => (
          <div
            key={line}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              minHeight: 44,
              padding: '0 14px',
              borderRadius: 12,
              background: 'var(--surf2)',
              fontSize: fs(13),
              color: 'var(--ink2)',
            }}
          >
            {line}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
        <button
          type="button"
          onClick={() => set({ deleteStep: 2 })}
          style={{ ...primaryButton, minHeight: 52, background: 'var(--plum)', color: 'var(--onplum)' }}
        >
          Supprimer définitivement
        </button>
        <button
          type="button"
          onClick={close}
          style={{
            cursor: 'pointer',
            width: '100%',
            minHeight: 52,
            fontFamily: SANS,
            fontSize: fs(16),
            fontWeight: 700,
            border: '1px solid var(--line2)',
            borderRadius: 14,
            background: 'none',
            color: 'var(--ink)',
          }}
        >
          Annuler
        </button>
      </div>
    </Sheet>
  );
}
