import { View } from 'react-native';
import { useMyRentals, type Rental, type RentalStatus } from '../data/rentals';
import { useT, type TranslationKey } from '../i18n';
import { useAuth } from '../lib/auth';
import { returnStatus } from '../lib/fees';
import { usePolicy } from '../lib/policy';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { Amount, Card, Chip, Display, GhostButton, Screen, Txt } from '../ui/kit';
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

function RentalCard({ rental, mine }: { rental: Rental; mine: boolean }) {
  const { set, go, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
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

  return (
    <Card
      accent={alert}
      onPress={() => {
        set({ activeRentalId: rental.id });
        go('rental');
      }}
      style={{ marginTop: 10, flexDirection: 'row', gap: 12 }}
    >
      <View style={{ width: 64, height: 82, borderRadius: 10, overflow: 'hidden' }}>
        <MediaSlot id={`rental-${rental.id}`} shape="rounded" radius={10} remoteUri={rental.listingPhoto ?? undefined} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt weight="bold" numberOfLines={1}>
          {rental.listingTitle}
        </Txt>
        <Txt size={13} color={c.ink2} style={{ marginTop: 3 }}>
          {rental.startDate} → {rental.endDate} · {rental.days} j
        </Txt>
        <Txt size={13} color={alert ? c.plum : c.ink3} style={{ marginTop: 2 }}>
          {t(STATUS_KEY[rental.status])}
          {late.state === 'grace' ? ` · ${t('rental.inGrace')}` : ''}
          {late.daysLate > 0 ? ` · ${late.daysLate} j · ${m(late.lateFee)}` : ''}
        </Txt>
        <Amount size={14} color={c.accent} style={{ marginTop: 6 }}>
          {mine ? m(rental.totalCharged) : m(rental.ownerPayout)}
        </Amount>
      </View>
    </Card>
  );
}

export function Rentals() {
  const { state, set, go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session } = useAuth();
  const uid = session?.user.id;
  const { rentals, loading, error } = useMyRentals(uid);

  const renting = rentals.filter((r) => r.renterId === uid);
  const lending = rentals.filter((r) => r.ownerId === uid);
  const shown = state.rentalTab === 'renting' ? renting : lending;

  return (
    <Screen bottomInset={120}>
      <Display size={34}>{t('rentals.title')}</Display>

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
        shown.map((rental) => (
          <RentalCard key={rental.id} rental={rental} mine={rental.renterId === uid} />
        ))
      )}
    </Screen>
  );
}
