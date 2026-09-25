import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { payMethods } from '../data/catalog';
import { useListing } from '../data/listings';
import { bookRental } from '../data/rentals';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { usePolicy } from '../lib/policy';
import { useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { AppleIcon } from '../ui/icons';
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
import { MediaSlot } from '../ui/MediaSlot';

/** The demo calendar sits in September 2026. */
const isoDay = (day: number) => `2026-09-${String(day).padStart(2, '0')}`;

function Confirmation() {
  const { go } = useStore();
  const { c } = useTheme();
  const { t } = useT();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Txt size={26} weight="bold" color={c.onAccent}>
          ✓
        </Txt>
      </View>
      <Display size={38} style={{ marginTop: 20, textAlign: 'center' }}>
        C'est réservé.
      </Display>
      <Txt size={15} center color={c.ink2} style={{ marginTop: 12 }}>
        {t('checkout.confirmedBody')}
      </Txt>
      <PrimaryButton
        label={t('rentals.title')}
        onPress={() => go('rentals')}
        style={{ marginTop: 26, alignSelf: 'stretch' }}
      />
      <GhostButton label="Retour au feed" onPress={() => go('feed')} style={{ marginTop: 10, alignSelf: 'stretch' }} />
    </View>
  );
}

/** One line of the pre-payment disclosure. Visible, never buried in Terms. */
function Disclosure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 }}>
      <Txt size={14} color={c.ink2} style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt size={14} weight={strong ? 'bold' : 'semi'} color={strong ? c.ink : c.ink2}>
        {value}
      </Txt>
    </View>
  );
}

export function Checkout() {
  const { state, set, go, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session } = useAuth();
  const policy = usePolicy();
  const listing = useListing(state.activeId);
  const { days, ship, total, quote } = useBooking(listing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.confirmed) return <Confirmation />;

  if (!listing) {
    return (
      <Screen>
        <Txt color={c.ink2}>Cette annonce n'est plus disponible.</Txt>
        <GhostButton label="Retour au feed" onPress={() => go('feed')} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  const size = listing.sizes.includes(state.size) ? state.size : listing.sizes[0];
  const method = payMethods.find((p) => p.key === state.payMethod);

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
    if (!session) return setError('Connectez-vous pour réserver.');
    if (!state.payConsent) return setError(t('consent.required'));
    setBusy(true);
    setError(null);
    try {
      // Postgres computes and freezes the snapshot (money, approved value,
      // maximum liability, policy + consent version). See migration 002.
      const rental = await bookRental({
        listingId: listing.id,
        startDate: isoDay(state.dates[0]),
        endDate: isoDay(state.dates[1]),
        delivery: state.delivery,
        consentText,
        methodLabel: method?.label ?? null,
      });
      // SEAM — no payment provider is integrated yet. This is where the saved
      // payment method is charged (and, when a hold is required, where the
      // hold is placed). Until a PSP is wired, nothing is actually debited.
      set({ confirmed: true, activeRentalId: rental.id, payConsent: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La réservation a échoué.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={140}>
        <BackButton onPress={() => go('booking')} />
        <Display size={34} style={{ marginTop: 14 }}>
          Confirmer la location
        </Display>

        <Card style={{ marginTop: 20, flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 76, height: 96, borderRadius: 10, overflow: 'hidden' }}>
            <MediaSlot
              id={`checkout-${listing.id}`}
              shape="rounded"
              radius={10}
              remoteUri={listing.photos[0] ?? undefined}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Txt weight="bold">{listing.title}</Txt>
            <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
              {size ? `${t('common.size')} ${size} · ` : ''}
              {days} jours
            </Txt>
            <Txt size={13} color={c.ink2}>
              {state.dates[0]}–{state.dates[1]} sept. · {ship ? 'livraison' : 'main propre'}
            </Txt>
            <Amount size={15} color={c.accent} style={{ marginTop: 8 }}>
              {m(total)}
            </Amount>
          </View>
        </Card>

        {/* Everything that matters is here, before the pay button. */}
        <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 22 }}>
          {t('checkout.beforePaying')}
        </Txt>
        <Card style={{ marginTop: 10 }}>
          <Disclosure label={t('checkout.rentLine')} value={m(quote.loyer)} />
          <Disclosure label={t('checkout.protectionFee')} value={m(quote.serviceFeeBuyer)} />
          {quote.shipping > 0 ? <Disclosure label={t('checkout.shipping')} value={m(quote.shipping)} /> : null}
          {quote.showCleaning ? <Disclosure label={t('checkout.cleaning')} value={m(quote.cleaning)} /> : null}
          <Disclosure label={t('checkout.chargedNow')} value={m(total)} strong />

          <View style={{ height: 1, backgroundColor: c.line, marginVertical: 10 }} />

          <Disclosure label={t('protect.returnBy')} value={t('protect.returnByValue').replace('{d}', String(days))} />
          <Disclosure
            label={t('protect.deposit')}
            value={quote.hold.required ? `${m(quote.hold.amount)}` : t('protect.noDepositShort')}
          />
          <Disclosure
            label={t('protect.maxLiability')}
            value={quote.maxLiability > 0 ? m(quote.maxLiability) : t('protect.valuePending')}
            strong
          />
          <Disclosure
            label={t('protect.lateRules')}
            value={`${policy.gracePeriodHours} h · ${m(quote.lateFeePerDay)}/j · max ${m(quote.lateFeeCap)}`}
          />
          <Txt size={12} color={c.ink3} style={{ marginTop: 8 }}>
            {quote.hold.required ? t('protect.holdWhy') : t('protect.noDeposit')} {t('protect.maxLiabilityBody')}
          </Txt>
        </Card>

        <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 22 }}>
          Payer avec
        </Txt>
        <View style={{ marginTop: 10, gap: 8 }}>
          {payMethods.map((p) => {
            const on = state.payMethod === p.key;
            const detail =
              p.key === 'wallet'
                ? `Solde ${m(state.walletBalance)}`
                : p.key === 'card'
                  ? state.cards.map((card) => `${card.brand} ·· ${card.last4}`).join(' · ')
                  : p.detail;
            return (
              <Pressable
                key={p.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => set({ payMethod: p.key })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 56,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: on ? c.accent : c.line,
                  backgroundColor: on ? c.surf : 'transparent',
                }}
              >
                <Radio on={on} />
                {p.key === 'applepay' ? <AppleIcon color={c.ink} /> : null}
                <View style={{ flex: 1 }}>
                  <Txt weight={on ? 'bold' : 'semi'}>{p.label}</Txt>
                  <Txt size={12} color={c.ink3}>
                    {detail}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Explicit, separate consent to keeping the method on file. */}
        <Card
          accent={state.payConsent}
          onPress={() => set((s) => ({ payConsent: !s.payConsent }))}
          style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}
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
        </Card>

        <Txt size={12} color={c.ink3} style={{ marginTop: 10 }}>
          Le paiement en espèces n'est pas accepté : hors application, la protection Rota ne s'applique pas.
        </Txt>

        <Txt size={12} color={c.ink3} style={{ marginTop: 12 }}>
          En payant, vous acceptez les conditions de location et la politique d'annulation. Rota est une place de marché
          : le contrat de location vous lie à @{listing.owner.username}. Version de politique {policy.policyVersion}.
        </Txt>

        {error ? (
          <View
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              backgroundColor: c.plumSoft,
              borderWidth: 1,
              borderColor: c.plum,
            }}
          >
            <Txt size={13}>{error}</Txt>
          </View>
        ) : null}
      </Screen>

      <FooterBar>
        <PrimaryButton
          label={busy ? t('checkout.paying') : `Payer ${m(total)}`}
          disabled={busy || !state.payConsent}
          onPress={pay}
        />
      </FooterBar>
    </View>
  );
}
