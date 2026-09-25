import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useListing } from '../data/listings';
import { useUnavailableDays } from '../data/rentals';
import { addDays, daysBetween, fromISO, monthGrid, monthLabel, todayISO, weekdayLetters } from '../lib/dates';
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

/**
 * A real month view. Past days and days already booked (returned by the
 * server without saying by whom) can't be picked; the first tap sets the
 * start, the second the end.
 */
function Calendar({ taken }: { taken: (iso: string) => boolean }) {
  const { state, set } = useStore();
  const { c, fs } = useTheme();
  const { t, lang } = useT();
  const policy = usePolicy();
  const [start, end] = state.dates;
  const today = todayISO();
  const [month, setMonth] = useState(() => {
    const d = fromISO(start >= today ? start : today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [picking, setPicking] = useState<'start' | 'end'>('start');

  const shift = (n: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const current = new Date();
  const atFirstMonth = month.y === current.getFullYear() && month.m === current.getMonth();

  const choose = (iso: string) => {
    if (picking === 'start' || iso < start) {
      set({ dates: [iso, iso] });
      setPicking('end');
      return;
    }
    // A range can't jump over someone else's booking or exceed the maximum.
    for (let d = start; d <= iso; d = addDays(d, 1)) if (taken(d)) return set({ dates: [iso, iso] });
    if (daysBetween(start, iso) > policy.maxRentalDays) return;
    set({ dates: [start, iso] });
    setPicking('start');
  };

  return (
    <>
      <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => !atFirstMonth && shift(-1)} hitSlop={12} accessibilityLabel={t('booking.prevMonth')}>
          <Txt size={20} color={atFirstMonth ? c.line2 : c.ink}>
            ‹
          </Txt>
        </Pressable>
        <Txt size={16} weight="bold">
          {monthLabel(month.y, month.m, lang)}
        </Txt>
        <Pressable onPress={() => shift(1)} hitSlop={12} accessibilityLabel={t('booking.nextMonth')}>
          <Txt size={20}>›</Txt>
        </Pressable>
      </View>
      <View style={{ marginTop: 14, flexDirection: 'row' }}>
        {weekdayLetters(lang).map((d, i) => (
          <Txt key={`${d}${i}`} size={11} center color={c.ink3} style={{ width: `${100 / 7}%` }}>
            {d}
          </Txt>
        ))}
      </View>
      <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap' }}>
        {monthGrid(month.y, month.m).map((iso, i) => {
          if (!iso) return <View key={`blank-${i}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
          const past = iso < today;
          const booked = !past && taken(iso);
          const off = past || booked;
          const edge = iso === start || iso === end;
          const inRange = iso > start && iso < end;
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityState={{ disabled: off, selected: edge }}
              onPress={() => !off && choose(iso)}
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
                  color={edge ? c.onAccent : off ? c.line2 : c.ink}
                  style={{ fontSize: fs(14), textDecorationLine: booked ? 'line-through' : 'none' }}
                >
                  {fromISO(iso).getDate()}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Txt size={12} color={c.ink3} style={{ marginTop: 6 }}>
        {picking === 'end' ? t('booking.pickEnd') : t('booking.pickHelp').replace('{n}', String(policy.maxRentalDays))}
      </Txt>
    </>
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
  const taken = useUnavailableDays(listing?.id ?? null);
  const [start, end] = state.dates;
  const datesValid = start >= todayISO() && !taken(start) && !taken(end);

  if (!listing) {
    return (
      <Screen>
        <Txt color={c.ink2}>Cette annonce n'est plus disponible.</Txt>
        <GhostButton label="Retour au feed" onPress={() => go('feed')} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  const hasRules = listing.rules.length > 0;
  const canContinue = datesValid && (!hasRules || state.rulesAccepted);
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

        <Calendar taken={taken} />

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
          label={
            !datesValid
              ? t('booking.pickDates')
              : canContinue
                ? `${t('common.continue')} · ${days} ${t('common.days')}`
                : t('booking.acceptRules')
          }
          disabled={!canContinue}
          onPress={() => go('checkout')}
        />
      </FooterBar>
    </View>
  );
}
