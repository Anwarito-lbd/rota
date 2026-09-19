import { Pressable, View } from 'react-native';
import { BOOKED_DAYS, FEES } from '../data/catalog';
import { useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import {
  Amount,
  BackButton,
  Card,
  Check,
  Display,
  FooterBar,
  PrimaryButton,
  Radio,
  Screen,
  Txt,
} from '../ui/kit';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAYS_IN_MONTH = 30;
/** The demo month starts mid-month; earlier days read as past. */
const FIRST_SELECTABLE = 13;

function Calendar() {
  const { state, set } = useStore();
  const { c, fs } = useTheme();
  const [start, end] = state.dates;

  return (
    <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap' }}>
      <View style={{ width: `${100 / 7}%`, height: 44 }} />
      {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map((day) => {
        const past = day < FIRST_SELECTABLE;
        const booked = BOOKED_DAYS.includes(day);
        const disabled = past || booked;
        const inRange = day > start && day < end;
        const edge = day === start || day === end;

        return (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected: edge }}
            onPress={() => !disabled && set({ dates: [day, day + 3] })}
            style={{
              width: `${100 / 7}%`,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: '90%',
                height: 40,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: edge ? c.clay : inRange ? c.claySoft : 'transparent',
              }}
            >
              <Txt
                size={14}
                weight="semi"
                color={edge ? c.onclay : disabled ? c.ink3 : c.ink}
                style={{
                  fontSize: fs(14),
                  textDecorationLine: booked ? 'line-through' : 'none',
                }}
              >
                {day}
              </Txt>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function HandoverOption({
  selected,
  onPress,
  title,
  body,
  price,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  body: string;
  price: string;
}) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} accent={selected} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Radio on={selected} />
      <View style={{ flex: 1 }}>
        <Txt weight="bold">{title}</Txt>
        <Txt size={13} color={c.ink2}>
          {body}
        </Txt>
      </View>
      <Amount size={14}>{price}</Amount>
    </Card>
  );
}

export function Booking() {
  const { state, set, go, m } = useStore();
  const { c } = useTheme();
  const { active, nights, breakdown, total, cleaningFee } = useBooking();

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={140}>
        <BackButton onPress={() => go('detail')} />
        <Display size={34} style={{ marginTop: 14 }}>
          Choisir les dates
        </Display>
        <Txt size={14} color={c.ink2} style={{ marginTop: 6 }}>
          {active.title} · taille {state.size}
        </Txt>

        <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt size={16} weight="bold">
            Septembre 2026
          </Txt>
          <Txt size={13} color={c.ink3}>
            3 jours minimum
          </Txt>
        </View>

        <View style={{ marginTop: 14, flexDirection: 'row' }}>
          {WEEKDAYS.map((d, i) => (
            <Txt key={`${d}${i}`} size={11} center color={c.ink3} style={{ width: `${100 / 7}%` }}>
              {d}
            </Txt>
          ))}
        </View>
        <Calendar />

        <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 22 }}>
          Remise
        </Txt>
        <View style={{ marginTop: 10, gap: 8 }}>
          <HandoverOption
            selected={state.delivery === 'ship'}
            onPress={() => set({ delivery: 'ship' })}
            title="Livraison · prépayée aller-retour"
            body="Arrive jeu. 17 sept. · étiquette retour dans le colis"
            price={m(FEES.shipping)}
          />
          <HandoverOption
            selected={state.delivery === 'meet'}
            onPress={() => set({ delivery: 'meet' })}
            title="Remise en main propre"
            body="Paris 9e · 2,4 km · jeudi soir"
            price="Offert"
          />
        </View>

        <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 22 }}>
          Règles de {active.name}
        </Txt>
        <Card
          accent={state.rulesAccepted}
          onPress={() => set((s) => ({ rulesAccepted: !s.rulesAccepted }))}
          style={{ marginTop: 10 }}
        >
          <View style={{ gap: 8 }}>
            {active.rules.map((rule) => (
              <View key={rule} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 6, height: 6, marginTop: 8, borderRadius: 99, backgroundColor: c.plum }} />
                <Txt size={14} style={{ flex: 1 }}>
                  {rule}
                </Txt>
              </View>
            ))}
          </View>
          <View
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: c.line,
              flexDirection: 'row',
              gap: 12,
            }}
          >
            <Check on={state.rulesAccepted} />
            <Txt size={14} style={{ flex: 1 }}>
              J'ai lu et j'accepte ces règles
              {cleaningFee ? `, dont le nettoyage par ${active.name} facturé ${m(cleaningFee)}` : ''}.
            </Txt>
          </View>
        </Card>

        <Card style={{ marginTop: 22 }}>
          {breakdown.map((b) => (
            <View key={b.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5 }}>
              <Txt size={14} color={c.ink2} style={{ flex: 1 }}>
                {b.label}
              </Txt>
              <Txt size={14} color={c.ink2}>
                {b.value}
              </Txt>
            </View>
          ))}
          <View
            style={{
              marginTop: 10,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: c.line,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Txt size={13} weight="semi" upper color={c.ink3}>
              Total
            </Txt>
            <Amount size={26} color={c.clay}>
              {m(total)}
            </Amount>
          </View>
          <Txt size={12} color={c.ink3} style={{ marginTop: 8 }}>
            Caution de {m(FEES.deposit)} bloquée, libérée au retour. Annulation gratuite jusqu'à 7 jours avant.
          </Txt>
        </Card>
      </Screen>

      <FooterBar>
        <PrimaryButton
          label={state.rulesAccepted ? `Continuer · ${nights} jours` : 'Acceptez les règles pour continuer'}
          disabled={!state.rulesAccepted}
          onPress={() => go('checkout')}
        />
      </FooterBar>
    </View>
  );
}
