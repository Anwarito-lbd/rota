import { BOOKED_DAYS, FEES } from '../data/catalog';
import { useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { SERIF, amount, footerBar, fs, primaryButton, screen } from '../ui/styles';
import { Header, Tappable } from '../ui/widgets';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAYS_IN_MONTH = 30;
/** The demo month starts mid-month; earlier days read as past. */
const FIRST_SELECTABLE = 13;

function Calendar() {
  const { state, set } = useStore();
  const [start, end] = state.dates;

  return (
    <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
      <div />
      {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map((day) => {
        const past = day < FIRST_SELECTABLE;
        const booked = BOOKED_DAYS.includes(day);
        const disabled = past || booked;
        const inRange = day > start && day < end;
        const edge = day === start || day === end;

        return (
          <button
            key={day}
            type="button"
            disabled={disabled}
            aria-pressed={edge}
            onClick={() => set({ dates: [day, day + 3] })}
            style={{
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              border: 'none',
              fontSize: fs(14),
              fontWeight: 600,
              cursor: disabled ? 'default' : 'pointer',
              background: edge ? 'var(--clay)' : inRange ? 'var(--claySoft)' : 'transparent',
              color: edge ? 'var(--onclay)' : disabled ? 'var(--ink3)' : 'var(--ink)',
              textDecoration: booked ? 'line-through' : 'none',
            }}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}

function HandoverOption({
  selected,
  onSelect,
  title,
  body,
  price,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  body: string;
  price: string;
}) {
  return (
    <Tappable
      onClick={onSelect}
      label={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 14,
        border: `1px solid ${selected ? 'var(--clay)' : 'var(--line2)'}`,
        background: 'var(--surf)',
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          flex: '0 0 20px',
          borderRadius: 99,
          border: `2px solid ${selected ? 'var(--clay)' : 'var(--ink3)'}`,
          background: selected ? 'var(--clay)' : 'transparent',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: fs(15), fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: fs(13), color: 'var(--ink2)' }}>{body}</div>
      </div>
      <div style={{ fontSize: fs(14), fontWeight: 700, flex: '0 0 auto' }}>{price}</div>
    </Tappable>
  );
}

export function Booking() {
  const { state, set, go, m } = useStore();
  const { active, nights, breakdown, total, cleaningFee } = useBooking();

  return (
    <>
      <div style={{ ...screen, padding: '54px 18px 140px' }}>
        <Header title="" onBack={() => go('detail')} />
        <h1 style={{ margin: '14px 0 0', fontFamily: SERIF, fontSize: 36, lineHeight: 1.02, fontWeight: 400 }}>
          Choisir les dates
        </h1>
        <div style={{ marginTop: 6, fontSize: fs(14), color: 'var(--ink2)' }}>
          {active.title} · taille {state.size}
        </div>

        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: fs(16), fontWeight: 700 }}>Septembre 2026</div>
          <div style={{ fontSize: fs(13), color: 'var(--ink3)' }}>3 jours minimum</div>
        </div>
        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(7,1fr)',
            gap: 4,
            fontSize: fs(11),
            color: 'var(--ink3)',
            textAlign: 'center',
          }}
        >
          {WEEKDAYS.map((d, i) => (
            <div key={`${d}${i}`}>{d}</div>
          ))}
        </div>
        <Calendar />

        <div style={{ marginTop: 22, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
          Remise
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <HandoverOption
            selected={state.delivery === 'ship'}
            onSelect={() => set({ delivery: 'ship' })}
            title="Livraison · prépayée aller-retour"
            body="Arrive jeu. 17 sept. · étiquette retour dans le colis"
            price={m(FEES.shipping)}
          />
          <HandoverOption
            selected={state.delivery === 'meet'}
            onSelect={() => set({ delivery: 'meet' })}
            title="Remise en main propre"
            body="Paris 9e · 2,4 km · jeudi soir"
            price="Offert"
          />
        </div>

        <div
          style={{
            marginTop: 8,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: '13px 14px',
            borderRadius: 14,
            background: 'var(--claySoft)',
            border: '1px solid var(--line)',
          }}
        >
          <div style={{ width: 7, height: 7, flex: '0 0 7px', marginTop: 6, borderRadius: 99, background: 'var(--clay)' }} />
          <div style={{ flex: 1, minWidth: 0, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink)' }}>
            Les deux modes sont possibles sur cette pièce. Vous choisissez ici, {active.name} confirme dans la
            conversation — la location ne démarre que si vous êtes d'accord tous les deux.
          </div>
        </div>

        <Tappable
          onClick={() => go('safety')}
          style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '13px 14px',
            borderRadius: 14,
            background: 'var(--surf2)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, fontSize: fs(13), lineHeight: 1.45, color: 'var(--ink2)' }}>
            Conseils de remise en main propre et code à 4 chiffres
          </div>
          <div style={{ flex: '0 0 auto', fontSize: fs(13), fontWeight: 700, color: 'var(--clay)' }}>Lire ›</div>
        </Tappable>

        <div style={{ marginTop: 22, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
          Règles de {active.name}
        </div>
        <Tappable
          onClick={() => set((s) => ({ rulesAccepted: !s.rulesAccepted }))}
          label="Accepter les règles de la prêteuse"
          style={{ marginTop: 10, padding: 15, borderRadius: 16, background: 'var(--surf)', border: `1px solid ${state.rulesAccepted ? 'var(--clay)' : 'var(--line)'}` }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            {active.rules.map((rule) => (
              <div key={rule} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, flex: '0 0 6px', marginTop: 7, borderRadius: 99, background: 'var(--plum)' }} />
                <div style={{ fontSize: fs(14), lineHeight: 1.45 }}>{rule}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 24,
                height: 24,
                flex: '0 0 24px',
                borderRadius: 7,
                border: `2px solid ${state.rulesAccepted ? 'var(--clay)' : 'var(--line2)'}`,
                background: state.rulesAccepted ? 'var(--clay)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--onclay)',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {state.rulesAccepted ? '✓' : ''}
            </div>
            <div style={{ fontSize: fs(14), lineHeight: 1.45, color: 'var(--ink)' }}>
              J'ai lu et j'accepte ces règles
              {cleaningFee ? `, dont le nettoyage par ${active.name} facturé ${m(cleaningFee)}` : ''}.
            </div>
          </div>
        </Tappable>

        <div style={{ marginTop: 22, padding: 16, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
          {breakdown.map((b) => (
            <div
              key={b.label}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: fs(14), padding: '5px 0', color: 'var(--ink2)' }}
            >
              <span>{b.label}</span>
              <span style={{ flex: '0 0 auto' }}>{b.value}</span>
            </div>
          ))}
          <div
            style={{
              marginTop: 10,
              paddingTop: 12,
              borderTop: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 10,
            }}
          >
            <span style={{ fontSize: fs(13), letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
              Total
            </span>
            <span style={{ ...amount(28), color: 'var(--clay)' }}>{m(total)}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: fs(12), lineHeight: 1.5, color: 'var(--ink3)' }}>
            Caution de {m(FEES.deposit)} bloquée, libérée au retour. Annulation gratuite jusqu'à 7 jours avant.
          </div>
        </div>
      </div>

      <div style={footerBar}>
        <button
          type="button"
          onClick={() => state.rulesAccepted && go('checkout')}
          aria-disabled={!state.rulesAccepted}
          style={{
            ...primaryButton,
            background: state.rulesAccepted ? 'var(--clay)' : 'var(--surf2)',
            color: state.rulesAccepted ? 'var(--onclay)' : 'var(--ink3)',
          }}
        >
          {state.rulesAccepted ? `Continuer · ${nights} jours` : 'Acceptez les règles pour continuer'}
        </button>
      </div>
    </>
  );
}
