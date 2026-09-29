import { Pressable, View } from 'react-native';
import { rangeLabel } from '../lib/dates';
import { ChevronRight } from '../ui/icons';
import { useMyRentals, type Rental, type RentalStatus } from '../data/rentals';
import { useT, type TranslationKey } from '../i18n';
import { backendConfigured, useAuth } from '../lib/auth';
import { DEMO_ME } from '../data/demo';
import { returnStatus } from '../lib/fees';
import { usePolicy } from '../lib/policy';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { Chip, Display, GhostButton, Screen, Txt } from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';

const STATUS_KEY: Record<RentalStatus, TranslationKey> = {
  booked: 'status.booked',
  in_progress: 'status.inProgress',
  due: 'status.due',
  late: 'status.late',
  non_return_review: 'status.nonReturn',
  returned: 'status.returned',
  closed: 'status.closed',
  cancelled: 'status.cancelled',
};

const GROUPS: [TranslationKey, RentalStatus[]][] = [
  ['rentals.now', ['in_progress', 'due', 'late', 'non_return_review']],
  ['rentals.upcoming', ['booked']],
  ['rentals.past', ['returned', 'closed', 'cancelled']],
];

function RentalCard({ rental, mine }: { rental: Rental; mine: boolean }) {
  const { set, go, m } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const policy = usePolicy();

  const late = returnStatus({
    returnDueAt: rental.returnDueAt,
    returnedAt: rental.returnConfirmedAt,
    perDay: rental.lateFeePerDay,
    cap: rental.lateFeeCap,
    gracePeriodHours: rental.gracePeriodHours,
    nonReturnReviewDays: rental.nonReturnReviewDays,
    policy,
  });

  const alert = late.state === 'late' || late.state === 'non_return_review';

  const tone =
    alert ? c.plum : rental.status === 'booked' ? '#3FB27F' : rental.status === 'in_progress' || rental.status === 'due' ? c.accent : c.ink3;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rental.listingTitle}
      onPress={() => {
        set({ activeRentalId: rental.id });
        go('rental');
      }}
      style={{ marginTop: 14, borderRadius: 22, overflow: 'hidden', backgroundColor: c.surf, borderWidth: alert ? 1.5 : 0, borderColor: c.plum }}
    >
      <View style={{ height: 190 }}>
        <MediaSlot id={`rental-${rental.id}`} shape="rect" remoteUri={rental.listingPhoto ?? undefined} />
        <View
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: c.bg,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: tone }} />
          <Txt size={13} weight="semi">
            {t(STATUS_KEY[rental.status])}
          </Txt>
        </View>
      </View>
      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Txt size={17} weight="bold" numberOfLines={1}>
            {rental.listingTitle}
          </Txt>
          <Txt size={14} color={c.ink2} style={{ marginTop: 3 }}>
            {rangeLabel(rental.startDate, rental.endDate, lang)} · {rental.days} {t('common.days')}
          </Txt>
          <Txt size={13} color={alert ? c.plum : c.ink3} style={{ marginTop: 3 }}>
            {rental.delivery === 'ship' ? t('checkout.byPost') : t('checkout.inPerson')}
            {late.state === 'grace' ? ` · ${t('rental.inGrace')}` : ''}
            {late.daysLate > 0 ? ` · ${late.daysLate} j · ${m(late.lateFee)}` : ''}
            {' · '}
            {mine ? m(rental.totalCharged) : `${t('rentals.payout')} ${m(rental.ownerPayout)}`}
          </Txt>
        </View>
        <ChevronRight size={15} color={c.ink3} />
      </View>
    </Pressable>
  );
}

export function Rentals() {
  const { state, set, go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session } = useAuth();
  const uid = session?.user.id ?? (backendConfigured ? undefined : DEMO_ME.id);
  const { rentals, loading, error } = useMyRentals(uid);

  const renting = rentals.filter((r) => r.renterId === uid);
  const lending = rentals.filter((r) => r.ownerId === uid);
  const shown = state.rentalTab === 'renting' ? renting : lending;

  return (
    <Screen bottomInset={120}>
      <Display size={34}>{t('rentals.title')}</Display>
      <Txt size={15} color={c.ink2} style={{ marginTop: 4 }}>
        {t('rentals.subtitle')}
      </Txt>

      <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
        <Chip
          label={`${t('rentals.renting')} · ${renting.length}`}
          on={state.rentalTab === 'renting'}
          onPress={() => set({ rentalTab: 'renting' })}
        />
        <Chip
          label={`${t('rentals.lending')} · ${lending.length}`}
          on={state.rentalTab === 'lending'}
          onPress={() => set({ rentalTab: 'lending' })}
        />
      </View>

      {loading ? (
        <Txt size={14} color={c.ink3} style={{ marginTop: 20 }}>
          {t('common.loading')}
        </Txt>
      ) : error ? (
        <Txt size={14} color={c.plum} style={{ marginTop: 20 }}>
          {error}
        </Txt>
      ) : shown.length === 0 ? (
        <View style={{ marginTop: 28 }}>
          <Txt size={17} weight="bold">
            {t('rentals.empty')}
          </Txt>
          <Txt size={14} color={c.ink2} style={{ marginTop: 6 }}>
            {t('rentals.emptyBody')}
          </Txt>
          <GhostButton label={t('feed.rent')} tone="accent" onPress={() => go('feed')} style={{ marginTop: 16 }} />
        </View>
      ) : (
        GROUPS.map(([key, statuses]) => {
          const list = shown.filter((r) => statuses.includes(r.status));
          if (!list.length) return null;
          return (
            <View key={key} style={{ marginTop: 22 }}>
              <Txt size={20} weight="bold">
                {t(key)}
              </Txt>
              {list.map((rental) => (
                <RentalCard key={rental.id} rental={rental} mine={rental.renterId === uid} />
              ))}
            </View>
          );
        })
      )}
    </Screen>
  );
}
