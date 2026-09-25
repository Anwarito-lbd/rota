import { Pressable, View } from 'react-native';
import { useListing } from '../data/listings';
import { useT } from '../i18n';
import { usePolicy } from '../lib/policy';
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
  GhostButton,
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
        const inRange = day > start && day < end;
        const edge = day === start || day === end;

        return (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityState={{ disabled: past, selected: edge }}
            onPress={() => !past && set({ dates: [day, day + 3] })}
            style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <View
              style={{
                width: '90%',
                height: 40,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: edge ? c.accent : inRange ? c.accentSoft : 'transparent',
              }}
            >
              <Txt
                size={14}
                weight="semi"
                color={edge ? c.onAccent : past ? c.ink3 : c.ink}
                style={{ fontSize: fs(14) }}
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
  const { t } = useT();
  const policy = usePolicy();
  const listing = useListing(state.activeId);
  const { days, breakdown, total, cleaningFee, quote } = useBooking(listing);

  if (!listing) {
    return (
      <Screen>
        <Txt color={c.ink2}>Cette annonce n'est plus disponible.</Txt>
        <GhostButton label="Retour au feed" onPress={() => go('feed')} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  const hasRules = listing.rules.length > 0;
  const canContinue = !hasRules || state.rulesAccepted;
  const size = listing.sizes.includes(state.size) ? state.size : listing.sizes[0];

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={140}>
        <BackButton onPress={() => go('detail')} />
        <Display size={34} style={{ marginTop: 14 }}>
          Choisir les dates
        </Display>
        <Txt size={14} color={c.ink2} style={{ marginTop: 6 }}>
          {listing.title}
          {size ? ` · ${t('common.size')} ${size}` : ''}
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
            body="Étiquette retour incluse dans le colis"
            price={m(policy.shippingFee)}
          />
          <HandoverOption
            selected={state.delivery === 'meet'}
            onPress={() => set({ delivery: 'meet' })}
            title="Remise en main propre"
            body={listing.city ?? 'À convenir avec la prêteuse'}
            price="Offert"
          />
        </View>

        {hasRules ? (
          <>
            <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 22 }}>
              {t('detail.rules')}
            </Txt>
            <Card
              accent={state.rulesAccepted}
              onPress={() => set((s) => ({ rulesAccepted: !s.rulesAccepted }))}
              style={{ marginTop: 10 }}
            >
              <View style={{ gap: 8 }}>
                {listing.rules.map((rule) => (
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
                  {cleaningFee ? `, dont le nettoyage facturé ${m(cleaningFee)}` : ''}.
                </Txt>
              </View>
            </Card>
          </>
        ) : null}

        <Card style={{ marginTop: 22 }}>
          {breakdown.map((b) => (
            <View
              key={b.label}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5 }}
            >
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
            <Amount size={26} color={c.accent}>
              {m(total)}
            </Amount>
          </View>
          <Txt size={12} color={c.ink3} style={{ marginTop: 8 }}>
            {quote.hold.required
              ? `${t('protect.holdOn')} ${m(quote.hold.amount)}. ${t('protect.holdWhy')}`
              : t('protect.noDeposit')}{' '}
            {t('protect.cancel')}
          </Txt>
        </Card>
      </Screen>

      <FooterBar>
        <PrimaryButton
          label={canContinue ? `${t('common.continue')} · ${days} jours` : 'Acceptez les règles pour continuer'}
          disabled={!canContinue}
          onPress={() => go('checkout')}
        />
      </FooterBar>
    </View>
  );
}
