import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListing } from '../data/listings';
import { sendMessage, startConversation } from '../data/messages';
import { useSocial } from '../data/social';
import { backendConfigured } from '../lib/auth';
import { useT, type TranslationKey } from '../i18n';
import { FEES } from '../lib/fees';
import { OFFER_TIERS, useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { OVER_INK, OVER_SCRIM } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { BookmarkIcon, DotsIcon, SparkleIcon } from '../ui/icons';
import {
  Amount,
  Card,
  CertifiedMark,
  Chip,
  Display,
  GhostButton,
  Note,
  PrimaryButton,
  Sheet,
  Txt,
} from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';
import { usePolicy } from '../lib/policy';
import { MessageButton } from '../ui/MessageButton';
import { PressScale, tap } from '../ui/motion';

function RoundOverlayButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 999,
        backgroundColor: OVER_SCRIM,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Pressable>
  );
}

export function Detail() {
  const { state, set, go, m, toggleFlag } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const listing = useListing(state.activeId);
  const { days, quote } = useBooking(listing);
  const policy = usePolicy();
  const social = useSocial();
  // Offers run in the demo only for now: the server still prices a rental from
  // the listing, so an accepted offer could not be honoured at payment yet.
  const offersOpen = !!listing?.acceptOffers && !backendConfigured && listing.ownerId !== social.meId;

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Txt center color={c.ink2}>
          Cette annonce n'est plus disponible.
        </Txt>
        <GhostButton label="Retour au feed" onPress={() => go('feed')} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const wished = !!state.wish[listing.id];
  const manySizes = listing.sizes.length > 1;
  const selectedSize = manySizes && listing.sizes.includes(state.size) ? state.size : listing.sizes[0];

  const trust = [
    {
      title: quote.hold.required
        ? `${t('protect.holdOn')} ${m(quote.hold.amount)}`
        : t('protect.noDepositShort'),
      body: quote.hold.required ? t('protect.holdWhy') : t('protect.noDeposit'),
    },
    {
      title: `${t('protect.maxLiability')} · ${
        quote.maxLiability > 0 ? m(quote.maxLiability) : t('protect.valuePending')
      }`,
      body: t('protect.maxLiabilityBody'),
    },
    listing.cleaning.byLender
      ? {
          title: `Nettoyage par la prêteuse · ${m(listing.cleaning.fee)}`,
          body: 'Elle ne souhaite pas que la pièce soit lavée : le nettoyage est fait par ses soins et facturé une fois.',
        }
      : {
          title: 'Nettoyage à votre charge',
          body: 'Aucun frais de nettoyage : vous rendez la pièce propre, en suivant les règles de la prêteuse.',
        },
    {
      title:
        listing.authenticity === 'verified' ? 'Authenticité vérifiée' : 'Authenticité non vérifiée',
      body:
        listing.authenticity === 'verified'
          ? 'Notre équipe a contrôlé la preuve fournie par la prêteuse.'
          : "La preuve d'achat n'a pas encore été validée. Demandez-la avant de réserver.",
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 430, backgroundColor: c.surf2 }}>
          <MediaSlot
            id={`detail-${listing.id}`}
            shape="rect"
            tone="media"
            remoteUri={listing.photos[0] ?? listing.video ?? undefined}
            placeholder={listing.title}
          />
          <View
            style={{
              position: 'absolute',
              top: insets.top + 6,
              left: 14,
              right: 14,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <RoundOverlayButton onPress={() => go('feed')} label={t('common.back')}>
              <Txt size={20} color={OVER_INK}>
                ‹
              </Txt>
            </RoundOverlayButton>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <RoundOverlayButton onPress={() => toggleFlag('wish', listing.id)} label="Enregistrer">
                <BookmarkIcon size={17} fill={wished ? c.accent : 'none'} color={wished ? c.accent : OVER_INK} />
              </RoundOverlayButton>
              <RoundOverlayButton onPress={() => set({ report: true, reportSent: false })} label="Signaler">
                <DotsIcon size={18} />
              </RoundOverlayButton>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, paddingTop: 20 }}>
          {listing.occasion ? (
            <Txt size={11} weight="bold" upper color={c.accent}>
              {listing.occasion}
            </Txt>
          ) : null}
          <Display size={34} style={{ marginTop: 8 }}>
            {listing.title}
          </Display>
          <Txt size={15} color={c.ink2} style={{ marginTop: 6 }}>
            {[listing.brand, listing.retail ? `valeur neuve ${m(listing.retail)}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Txt>

          {offersOpen ? (
            <View
              style={{
                marginTop: 10,
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: c.accentSoft,
                borderWidth: 1,
                borderColor: c.accent,
              }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: c.accent }} />
              <Txt size={13} weight="bold" color={c.accent}>
                {listing.minOffer
                  ? `Propositions acceptées · min ${m(listing.minOffer)} ${t('common.perDay')}`
                  : 'Propositions acceptées'}
              </Txt>
            </View>
          ) : null}

          <PressScale
            haptic="light"
            onPress={() => set({ screen: 'tryon', tryOnListingId: listing.id })}
            accessibilityLabel={t('tryon.title')}
            style={{
              marginTop: 18,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderRadius: 18,
              backgroundColor: c.accentSoft,
              borderWidth: 1,
              borderColor: c.accent,
            }}
          >
            <SparkleIcon size={26} color={c.accent} />
            <View style={{ flex: 1 }}>
              <Txt weight="bold">{t('tryon.title')}</Txt>
              <Txt size={13} color={c.ink2}>
                {t('tryon.subtitle')}
              </Txt>
            </View>
            <Txt size={20} color={c.accent}>
              ›
            </Txt>
          </PressScale>

          <MessageButton memberId={listing.ownerId} listingId={listing.id} label={t('msg.ask')} style={{ marginTop: 12 }} />

          <Card
            onPress={() => set({ screen: 'user', profileId: listing.ownerId })}
            style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 999, padding: 2, backgroundColor: c.accent }}>
              <View style={{ flex: 1, borderRadius: 999, overflow: 'hidden' }}>
                <MediaSlot id={`lender-${listing.id}`} shape="circle" remoteUri={listing.owner.avatar ?? undefined} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Txt weight="bold">@{listing.owner.username}</Txt>
                {listing.owner.certified ? <CertifiedMark /> : null}
              </View>
              <Txt size={13} color={c.ink2}>
                {listing.owner.identityVerified ? 'Identité vérifiée' : 'Identité non vérifiée'}
                {listing.city ? ` · ${listing.city}` : ''}
              </Txt>
            </View>
            <Txt size={18} color={c.ink3}>
              ›
            </Txt>
          </Card>

          <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 24 }}>
            {manySizes ? t('detail.sizesOffered') : t('detail.sizeOffered')}
          </Txt>
          {manySizes ? (
            <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {listing.sizes.map((s) => (
                <Chip key={s} label={s} on={selectedSize === s} onPress={() => set({ size: s })} />
              ))}
            </View>
          ) : (
            <Txt size={16} weight="bold" style={{ marginTop: 8 }}>
              {listing.sizes[0] ?? '—'}
            </Txt>
          )}
          {listing.sizeFit !== null ? (
            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[-2, -1, 0, 1, 2].map((s) => (
                  <View
                    key={s}
                    style={{
                      width: s === listing.sizeFit ? 12 : 8,
                      height: s === listing.sizeFit ? 12 : 8,
                      borderRadius: 99,
                      alignSelf: 'center',
                      backgroundColor: s === listing.sizeFit ? c.accent : c.surf2,
                    }}
                  />
                ))}
              </View>
              <Txt size={14} color={c.ink2}>
                {t(`fit.${listing.sizeFit}` as TranslationKey)}
              </Txt>
            </View>
          ) : null}

          {listing.photos.length > 1 ? (
            <>
              <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 24 }}>
                Photos
              </Txt>
              <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
                {listing.photos.slice(1, 4).map((uri, i) => (
                  <View key={uri} style={{ flex: 1, height: 120, borderRadius: 12, overflow: 'hidden' }}>
                    <MediaSlot id={`photo-${listing.id}-${i}`} shape="rounded" radius={12} remoteUri={uri} />
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <View style={{ marginTop: 24, gap: 8 }}>
            {trust.map((item) => (
              <Card key={item.title} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 8, height: 8, marginTop: 7, borderRadius: 99, backgroundColor: c.accent }} />
                <View style={{ flex: 1 }}>
                  <Txt size={14} weight="bold">
                    {item.title}
                  </Txt>
                  <Txt size={13} color={c.ink2} style={{ marginTop: 3 }}>
                    {item.body}
                  </Txt>
                </View>
              </Card>
            ))}
          </View>

          {listing.rules.length ? (
            <>
              <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 24 }}>
                {t('detail.rules')}
              </Txt>
              <Card style={{ marginTop: 10 }}>
                <View style={{ gap: 9 }}>
                  {listing.rules.map((rule) => (
                    <View key={rule} style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ width: 6, height: 6, marginTop: 8, borderRadius: 99, backgroundColor: c.plum }} />
                      <Txt size={14} style={{ flex: 1 }}>
                        {rule}
                      </Txt>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          ) : null}

          <View style={{ marginTop: 12 }}>
            <Note tone="accent">
              {listing.cleaning.byLender ? `Nettoyage ${m(listing.cleaning.fee)}` : 'Nettoyage à votre charge'} ·
              {policy.flagRotaDelivery ? `livraison ${m(FEES.shipping)} · ` : 'remise en main propre offerte · '}
              {quote.hold.required ? `caution ${m(quote.hold.amount)}` : t('protect.noDepositShort').toLowerCase()}.
              Tout est affiché avant paiement.
            </Note>
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 18,
          paddingTop: 12,
          paddingBottom: 16,
          backgroundColor: c.bg,
          borderTopWidth: 1,
          borderTopColor: c.line,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View>
          <Amount size={22}>{m(listing.price)}</Amount>
          <Txt size={12} color={c.ink3}>
            par {t('common.day')}
          </Txt>
        </View>
        {offersOpen ? (
          <GhostButton label={t('detail.offer')} tone="accent" onPress={() => set({ offer: true })} style={{ minHeight: 54 }} />
        ) : null}
        <PrimaryButton
          label={t('detail.viewDates')}
          onPress={() => {
            // Booking from the listing is at the listed price; an accepted offer books from its message.
            set({ agreedOffer: null });
            go('booking');
          }}
          style={{ flex: 1 }}
        />
      </View>

      <OfferSheet days={days} />
    </View>
  );
}

function OfferSheet({ days }: { days: number }) {
  const { state, set, m } = useStore();
  const { c, amount } = useTheme();
  const listing = useListing(state.activeId);
  const [idx, setIdx] = useState<number | 'custom'>(state.offerIdx);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!listing) return null;

  // The lender's minimum is shown on the listing; without one, half the price.
  // At or above the asking price there is nothing to negotiate: just book.
  const floor = listing.minOffer ?? Math.ceil(listing.price / 2);
  const tiers = OFFER_TIERS.map((pct, i) => ({ i, pct, amount: Math.round(listing.price * pct) })).filter(
    (tier) => tier.amount >= floor && tier.amount < listing.price,
  );
  const sel = idx === 'custom' || tiers.some((tier) => tier.i === idx) ? idx : (tiers[0]?.i ?? 'custom');
  const perDay = sel === 'custom' ? Number(custom.replace(',', '.')) || 0 : Math.round(listing.price * OFFER_TIERS[sel]);
  const invalid = perDay < floor || perDay >= listing.price;
  const dayWord = days > 1 ? 'jours' : 'jour';

  const sendOffer = async () => {
    if (busy || invalid) return;
    setBusy(true);
    setError(null);
    try {
      const id = await startConversation(listing.ownerId, listing.id);
      await sendMessage(id, `Offre : ${m(perDay)} / jour pour ${days} ${dayWord}`, 'offer', {
        listingId: listing.id,
        perDay,
        days,
      });
      tap('success');
      set({ offer: false, screen: 'messages', thread: id });
    } catch {
      setError("L'offre n'est pas partie. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={state.offer} onClose={() => set({ offer: false })}>
      <Display size={28}>Faire une offre</Display>
      <Txt size={14} color={c.ink2} style={{ marginTop: 8 }}>
        @{listing.owner.username} demande {m(listing.price)} / jour. Votre offre arrive dans vos messages, et vous
        pouvez louer à ce prix dès qu'elle est acceptée.
      </Txt>

      <View style={{ marginTop: 18, flexDirection: 'row', gap: 8 }}>
        {tiers.map(({ i, pct }) => {
          const on = sel === i;
          return (
            <Pressable
              key={pct}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setIdx(i);
                set({ offerIdx: i });
              }}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: on ? c.accent : c.line2,
                backgroundColor: on ? c.accent : 'transparent',
              }}
            >
              <Amount size={17} color={on ? c.onAccent : c.ink}>
                {m(Math.round(listing.price * pct))}
              </Amount>
              <Txt size={11} color={on ? c.onAccent : c.ink2} style={{ marginTop: 3 }}>
                -{Math.round((1 - pct) * 100)} %
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: sel === 'custom' }}
        onPress={() => setIdx('custom')}
        style={{
          marginTop: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          minHeight: 54,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: sel === 'custom' ? c.accent : c.line2,
        }}
      >
        <Txt size={15} weight="semi" style={{ flex: 1 }}>
          Autre montant
        </Txt>
        <TextInput
          value={custom}
          onFocus={() => setIdx('custom')}
          onChangeText={(v) => {
            setIdx('custom');
            setCustom(v.replace(/[^\d,.]/g, '').slice(0, 5));
          }}
          keyboardType="decimal-pad"
          placeholder={String(floor)}
          placeholderTextColor={c.ink3}
          accessibilityLabel="Montant par jour"
          style={[amount(20), { minWidth: 60, textAlign: 'right', color: c.ink, outlineWidth: 0 } as object]}
        />
        <Txt size={15} color={c.ink2}>
          € / jour
        </Txt>
      </Pressable>

      <Txt size={13} color={sel === 'custom' && custom && invalid ? c.plum : c.ink3} style={{ marginTop: 10 }}>
        {sel === 'custom' && custom && invalid
          ? `La prêteuse accepte entre ${m(floor)} et ${m(listing.price - 1)} par jour.`
          : `Total du loyer : ${m(perDay * days)} pour ${days} ${dayWord}. Les frais s'ajoutent au paiement.`}
      </Txt>
      {error ? (
        <Txt size={13} color={c.plum} style={{ marginTop: 6 }}>
          {error}
        </Txt>
      ) : null}

      <PrimaryButton
        label={busy ? 'Envoi…' : invalid ? 'Envoyer' : `Envoyer · ${m(perDay)} / jour`}
        tone="plum"
        disabled={busy || invalid}
        onPress={sendOffer}
        style={{ marginTop: 16 }}
      />
    </Sheet>
  );
}
