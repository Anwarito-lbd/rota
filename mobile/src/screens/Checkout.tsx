import { useMemo, useState, type ReactNode } from 'react';
import { CheckIcon, ChevronLeft } from '../ui/icons';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListing } from '../data/listings';
import { useSocial } from '../data/social';
import { paymentsConfigured, usePayRental } from '../data/payments';
import { bookRental, findPendingRental } from '../data/rentals';
import { useT } from '../i18n';
import { backendConfigured, useAuth } from '../lib/auth';
import { IdentityGate } from './Verify';
import { rangeLabel } from '../lib/dates';
import { friendlyError } from '../lib/errors';
import { usePolicy } from '../lib/policy';
import { useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { Amount, Check, Display, GhostButton, PrimaryButton, Screen, Txt } from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';
import { FadeIn } from '../ui/motion';

/** A bordered block, like the cards of Airbnb's "Confirm and pay". */
function Block({ children, style }: { children: ReactNode; style?: object }) {
  const { c } = useTheme();
  return <View style={[{ borderRadius: 18, borderWidth: 1, borderColor: c.line2, padding: 16 }, style]}>{children}</View>;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Txt size={19} weight="bold" style={{ marginTop: 24, marginBottom: 10 }}>
      {children}
    </Txt>
  );
}

/** A small rounded "Modifier" / "Détails" button on the right of a row. */
function MiniButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={6} style={{ paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: c.surf2, justifyContent: 'center' }}>
      <Txt size={13} weight="semi">
        {label}
      </Txt>
    </Pressable>
  );
}

function Confirmation() {
  const { state, go, m } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const listing = useListing(state.activeId);
  const { total } = useBooking(listing);
  const [startDate, endDate] = state.dates;
  // The rental id is the reference; the demo makes one up for the session.
  const code = useMemo(
    () => (state.activeRentalId ?? Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 8).toUpperCase(),
    [state.activeRentalId],
  );

  return (
    <Screen bottomInset={40}>
      <FadeIn style={{ alignItems: 'center', marginTop: 40 }}>
        <View style={{ width: 112, height: 112, borderRadius: 999, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 80, height: 80, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <CheckIcon size={38} color={c.onAccent} />
          </View>
        </View>
        <Display size={34} style={{ marginTop: 22, textAlign: 'center' }}>
          {t('checkout.confirmedTitle')}
        </Display>
        <Txt size={15} center color={c.ink2} style={{ marginTop: 10, paddingHorizontal: 12 }}>
          {t('checkout.confirmedBody')}
        </Txt>
      </FadeIn>

      {listing ? (
        <View style={{ marginTop: 26, borderRadius: 20, borderWidth: 1, borderColor: c.line2, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 110, height: 120 }}>
              <MediaSlot id={`confirmed-${listing.id}`} shape="rect" remoteUri={listing.photos[0] ?? undefined} />
            </View>
            <View style={{ flex: 1, padding: 14, justifyContent: 'center', gap: 3 }}>
              <Txt weight="bold" numberOfLines={2}>
                {listing.title}
              </Txt>
              <Txt size={13} color={c.ink2}>
                {rangeLabel(startDate, endDate, lang)}
              </Txt>
              <Txt size={13} color={c.ink2}>
                {t('detail.lentBy')} @{listing.owner.username}
              </Txt>
            </View>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: c.line, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt size={14} color={c.ink2}>
                {t('checkout.code')}
              </Txt>
              <Txt size={14} weight="bold">
                {code}
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt size={14} color={c.ink2}>
                {t('checkout.handover')}
              </Txt>
              <Txt size={14} weight="semi">
                {state.delivery === 'ship' ? t('checkout.byPost') : t('checkout.inPerson')}
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt size={14} color={c.ink2}>
                {t('checkout.total')}
              </Txt>
              <Amount size={15}>{m(total)}</Amount>
            </View>
          </View>
        </View>
      ) : null}

      <PrimaryButton label={t('checkout.viewRental')} onPress={() => go('rentals')} style={{ marginTop: 26 }} />
      <GhostButton label={t('checkout.keepExploring')} onPress={() => go('discover')} style={{ marginTop: 10 }} />
    </Screen>
  );
}

/** One line of the pre-payment disclosure. Visible, never buried in Terms. */
function Disclosure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 }}>
      <Txt size={strong ? 16 : 14} weight={strong ? 'bold' : 'reg'} color={strong ? c.ink : c.ink2} style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt size={strong ? 16 : 14} weight={strong ? 'bold' : 'semi'} color={strong ? c.ink : c.ink2}>
        {value}
      </Txt>
    </View>
  );
}

export function Checkout() {
  const { state, set, go, m } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const policy = usePolicy();
  const listing = useListing(state.activeId);
  const { days, ship, total, quote } = useBooking(listing);
  const payRental = usePayRental();
  const social = useSocial();
  const verified = social.identity === 'verified';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unpaidRental, setUnpaidRental] = useState<string | null>(null);

  if (state.confirmed) return <Confirmation />;

  if (!listing) {
    return (
      <Screen>
        <Txt color={c.ink2}>{t('report.gone')}</Txt>
        <GhostButton label={t('common.backToFeed')} onPress={() => go('feed')} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  const size = listing.sizes.includes(state.size) ? state.size : listing.sizes[0];
  const [startDate, endDate] = state.dates;

  // The exact wording the renter agrees to. It is saved verbatim on the rental
  // with its version, so a later edit to this text cannot be applied backwards.
  const consentText = [
    t('consent.body'),
    `${t('protect.maxLiability')} : ${m(quote.maxLiability)}.`,
    quote.hold.required
      ? `${t('protect.holdOn')} ${m(quote.hold.amount)}.`
      : `${t('protect.noDepositShort')}.`,
    `${t('protect.lateRules')} : ${policy.gracePeriodHours} h, ${m(quote.lateFeePerDay)}/j, max ${m(quote.lateFeeCap)}.`,
  ].join(' ');

  const pay = async () => {
    if (!state.payConsent) return setError(t('consent.required'));
    // The demo has no payments: show what a paid booking looks like.
    if (!backendConfigured) return set({ confirmed: true, activeRentalId: null, payConsent: false, agreedOffer: null });
    if (!session) return setError(t('checkout.signIn'));
    if (!paymentsConfigured) return setError(t('error.paymentsUnavailable'));
    setBusy(true);
    setError(null);
    try {
      // Coming back after closing the sheet: pay the booking already holding
      // these dates rather than trying to book them a second time.
      const rentalId =
        (await findPendingRental(listing.id, startDate, endDate, session.user.id)) ??
        (
          await bookRental({
            // Postgres computes and freezes the snapshot (money, approved value,
            // maximum liability, policy + consent version). See migration 002.
            listingId: listing.id,
            startDate,
            endDate,
            delivery: state.delivery,
            consentText,
            methodLabel: 'stripe',
            offerId: state.agreedOffer?.listingId === listing.id ? (state.agreedOffer.offerId ?? null) : null,
          })
        ).id;
      const outcome = await payRental(rentalId, session.user.email);
      if (outcome === 'paid') {
        set({ confirmed: true, activeRentalId: rentalId, payConsent: false, agreedOffer: null });
      } else {
        // The dates stay held for the payment window; the rental page can finish it.
        setUnpaidRental(rentalId);
        set({ activeRentalId: rentalId });
      }
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={150}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => go('booking')} hitSlop={8} style={{ width: 36, height: 40, justifyContent: 'center' }}>
            <ChevronLeft color={c.ink} />
          </Pressable>
          <Txt size={22} weight="bold">
            {t('checkout.title')}
          </Txt>
        </View>

        {/* The piece */}
        <Block style={{ marginTop: 16, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{ width: 76, height: 92, borderRadius: 12, overflow: 'hidden' }}>
            <MediaSlot id={`checkout-${listing.id}`} shape="rounded" radius={12} remoteUri={listing.photos[0] ?? undefined} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            {listing.occasion ? (
              <Txt size={12} color={c.ink3}>
                {listing.occasion}
              </Txt>
            ) : null}
            <Txt weight="bold" numberOfLines={2}>
              {listing.title}
            </Txt>
            <Txt size={13} color={c.ink2}>
              {t('detail.lentBy')} @{listing.owner.username}
            </Txt>
          </View>
        </Block>

        {/* Your rental */}
        <SectionTitle>{t('checkout.yourRental')}</SectionTitle>
        <Block style={{ paddingVertical: 4 }}>
          {(
            [
              [t('checkout.dates'), `${rangeLabel(startDate, endDate, lang)} · ${days} ${t('common.days')}`, () => go('booking')],
              [t('common.size'), size ?? '—', null],
              [t('checkout.handover'), ship ? t('checkout.byPost') : t('checkout.inPerson'), () => go('booking')],
            ] as [string, string, (() => void) | null][]
          ).map(([label, value, edit], i) => (
            <View
              key={label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}
            >
              <Txt size={14} color={c.ink3} style={{ width: 70 }}>
                {label}
              </Txt>
              <Txt size={15} weight="semi" style={{ flex: 1 }}>
                {value}
              </Txt>
              {edit ? <MiniButton label={t('checkout.change')} onPress={edit} /> : null}
            </View>
          ))}
        </Block>

        {/* Price details */}
        <SectionTitle>{t('checkout.priceDetails')}</SectionTitle>
        <Block>
          <Disclosure label={t('checkout.rentLine')} value={m(quote.loyer)} />
          <Disclosure label={t('checkout.protectionFee')} value={m(quote.serviceFeeBuyer)} />
          {quote.shipping > 0 ? <Disclosure label={t('checkout.shipping')} value={m(quote.shipping)} /> : null}
          {quote.showCleaning ? <Disclosure label={t('checkout.cleaning')} value={m(quote.cleaning)} /> : null}
          <View style={{ height: 1, backgroundColor: c.line, marginVertical: 8 }} />
          <Disclosure label={t('checkout.chargedNow')} value={m(total)} strong />
        </Block>

        {/* Protection: everything that matters is here, before the pay button. */}
        <SectionTitle>{t('checkout.beforePaying')}</SectionTitle>
        <Block>
          <Disclosure label={t('protect.returnBy')} value={t('protect.returnByValue').replace('{d}', String(days))} />
          <Disclosure label={t('protect.deposit')} value={quote.hold.required ? `${m(quote.hold.amount)}` : t('protect.noDepositShort')} />
          <Disclosure label={t('protect.maxLiability')} value={quote.maxLiability > 0 ? m(quote.maxLiability) : t('protect.valuePending')} />
          <Disclosure
            label={t('protect.lateRules')}
            value={`${policy.gracePeriodHours} h · ${m(quote.lateFeePerDay)}/j · max ${m(quote.lateFeeCap)}`}
          />
          <Txt size={12} color={c.ink3} style={{ marginTop: 8 }}>
            {quote.hold.required ? t('protect.holdWhy') : t('protect.noDeposit')} {t('protect.maxLiabilityBody')}
          </Txt>
        </Block>

        {/* Pay with */}
        <SectionTitle>{t('checkout.payWith')}</SectionTitle>
        <Block style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt size={15} weight="bold">
              {t('checkout.stripeTitle')}
            </Txt>
            <Txt size={13} color={c.ink2} style={{ marginTop: 2 }}>
              {t('checkout.stripeBody')}
            </Txt>
          </View>
          <MiniButton label={t('checkout.change')} onPress={() => go('set.payments')} />
        </Block>

        {/* Explicit, separate consent to keeping the method on file. */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: state.payConsent }}
          onPress={() => set((s) => ({ payConsent: !s.payConsent }))}
          style={{ marginTop: 14, flexDirection: 'row', gap: 12, padding: 16, borderRadius: 18, backgroundColor: state.payConsent ? c.accentSoft : c.surf }}
        >
          <Check on={state.payConsent} />
          <View style={{ flex: 1 }}>
            <Txt size={14} weight="bold">
              {t('consent.title')}
            </Txt>
            <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
              {t('consent.body')}
            </Txt>
          </View>
        </Pressable>

        <Txt size={12} color={c.ink3} style={{ marginTop: 12 }}>
          {t('checkout.noCash')}
        </Txt>
        <Txt size={12} color={c.ink3} style={{ marginTop: 8 }}>
          {t('checkout.terms').replace('{owner}', listing.owner.username).replace('{v}', policy.policyVersion)}
        </Txt>

        {unpaidRental ? (
          <Block style={{ marginTop: 14 }}>
            <Txt size={14} weight="bold">
              {t('checkout.notFinishedTitle')}
            </Txt>
            <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
              {t('checkout.notFinishedBody').replace('{n}', String(policy.paymentWindowMinutes))}
            </Txt>
          </Block>
        ) : null}

        {error ? (
          <View style={{ marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: c.plumSoft, borderWidth: 1, borderColor: c.plum }}>
            <Txt size={13}>{error}</Txt>
          </View>
        ) : null}
      </Screen>

      {/* Total and pay, always visible */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 18,
          paddingTop: 12,
          paddingBottom: Math.max(16, insets.bottom),
          backgroundColor: c.bg,
          borderTopWidth: 1,
          borderTopColor: c.line,
          flexDirection: verified ? 'row' : 'column',
          alignItems: verified ? 'center' : 'stretch',
          gap: 12,
        }}
      >
        <View style={verified ? { flex: 1 } : { flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Amount size={22}>{m(total)}</Amount>
          <Txt size={12} color={c.ink3}>
            {t('checkout.dueToday')}
          </Txt>
        </View>
        <View style={verified ? { flex: 1.3 } : undefined}>
          <IdentityGate reason="rent" returnTo="checkout">
            <PrimaryButton label={busy ? t('checkout.paying') : t('checkout.confirmPay')} disabled={busy || !state.payConsent} onPress={pay} />
          </IdentityGate>
        </View>
      </View>
    </View>
  );
}
