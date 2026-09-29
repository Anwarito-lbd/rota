import { useState } from 'react';
import { Image } from 'expo-image';
import { Platform, Pressable, ScrollView, Share, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListing } from '../data/listings';
import { makeOffer, sendMessage, startConversation } from '../data/messages';
import { useSocial } from '../data/social';
import { BRAND } from '../lib/config';
import { useT, type TranslationKey } from '../i18n';
import { friendlyError } from '../lib/errors';
import { FEES } from '../lib/fees';
import { OFFER_TIERS, useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { OVER_INK, OVER_SCRIM } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import {
  BookmarkIcon,
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  DotsIcon,
  ImagesIcon,
  PinIcon,
  ShareIcon,
  ShieldCheckIcon,
  SparkleIcon,
  WalletIcon,
} from '../ui/icons';
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
  const { width } = useWindowDimensions();
  const [photo, setPhoto] = useState(0);
  // Offers are priced by the server once accepted (migration 026).
  const offersOpen = !!listing?.acceptOffers && listing.ownerId !== social.meId && !listing.owner.vacation;

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
  const photos = listing.photos.length ? listing.photos : listing.video ? [listing.video] : [];
  const heroH = Math.round(Math.min(width, 720) * 1.2);
  const area = listing.city ?? 'Paris';

  const share = () => {
    const url = `${BRAND.site}/l/${listing.id}`;
    Share.share(Platform.OS === 'ios' ? { url, message: listing.title } : { message: `${listing.title} · ${url}` }).catch(() => undefined);
  };

  // What matters before renting, each with an icon (like Airbnb's highlights).
  const highlights: { Icon: (p: { size?: number; color?: string }) => React.ReactElement; title: string; body: string }[] = [
    {
      Icon: ShieldCheckIcon,
      title: listing.authenticity === 'verified' ? t('detail.hl.authentic') : t('detail.hl.notAuthentic'),
      body: listing.authenticity === 'verified' ? t('detail.hl.authenticBody') : t('detail.hl.notAuthenticBody'),
    },
    {
      Icon: SparkleIcon,
      title: listing.cleaning.byLender ? `${t('detail.hl.cleaningLender')} · ${m(listing.cleaning.fee)}` : t('detail.hl.cleaningYou'),
      body: listing.cleaning.byLender ? t('detail.hl.cleaningLenderBody') : t('detail.hl.cleaningYouBody'),
    },
    {
      Icon: PinIcon,
      title: policy.flagRotaDelivery ? t('detail.hl.delivery') : `${t('detail.hl.handover')} · ${area}`,
      body: policy.flagRotaDelivery ? `${t('detail.hl.deliveryBody')} ${m(FEES.shipping)}.` : t('detail.hl.handoverBody'),
    },
    {
      Icon: WalletIcon,
      title: quote.hold.required ? `${t('protect.holdOn')} ${m(quote.hold.amount)}` : t('protect.noDepositShort'),
      body: `${quote.hold.required ? t('protect.holdWhy') : t('protect.noDeposit')} ${t('protect.maxLiability')} : ${
        quote.maxLiability > 0 ? m(quote.maxLiability) : t('protect.valuePending')
      }.`,
    },
  ];

  const Divider = () => <View style={{ height: 1, backgroundColor: c.line, marginVertical: 20 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        {/* Photos, swipe through them */}
        <View style={{ height: heroH, backgroundColor: c.surf2 }}>
          {photos.length ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setPhoto(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, e.nativeEvent.layoutMeasurement.width)))}
            >
              {photos.map((uri) => (
                <Image key={uri} source={{ uri }} style={{ width: Math.min(width, 720), height: heroH }} contentFit="cover" />
              ))}
            </ScrollView>
          ) : (
            <MediaSlot id={`detail-${listing.id}`} shape="rect" tone="media" placeholder={listing.title} />
          )}
          <View style={{ position: 'absolute', top: insets.top + 6, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
            <RoundOverlayButton onPress={() => go('feed')} label={t('common.back')}>
              <ChevronLeft color={OVER_INK} />
            </RoundOverlayButton>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <RoundOverlayButton onPress={share} label={t('profile.share')}>
                <ShareIcon size={18} />
              </RoundOverlayButton>
              <RoundOverlayButton onPress={() => toggleFlag('wish', listing.id)} label="Enregistrer">
                <BookmarkIcon size={17} fill={wished ? c.accent : 'none'} color={wished ? c.accent : OVER_INK} />
              </RoundOverlayButton>
              <RoundOverlayButton onPress={() => set({ report: true, reportSent: false })} label="Signaler">
                <DotsIcon size={18} />
              </RoundOverlayButton>
            </View>
          </View>
          {photos.length > 1 ? (
            <View
              style={{
                position: 'absolute',
                right: 14,
                bottom: 40,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: OVER_SCRIM,
              }}
            >
              <ImagesIcon size={14} color={OVER_INK} />
              <Txt size={12} weight="semi" color={OVER_INK}>
                {photo + 1}/{photos.length}
              </Txt>
            </View>
          ) : null}
        </View>

        {/* The sheet slides over the photo */}
        <View style={{ marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: c.bg, paddingHorizontal: 18, paddingTop: 22 }}>
          {listing.occasion ? (
            <Txt size={11} weight="bold" upper color={c.accent}>
              {listing.occasion}
            </Txt>
          ) : null}
          <Display size={30} style={{ marginTop: 6 }}>
            {listing.title}
          </Display>
          <Txt size={15} color={c.ink2} style={{ marginTop: 6 }}>
            {[listing.brand, area].filter(Boolean).join(' · ')}
          </Txt>
          <Txt size={14} color={c.ink3} style={{ marginTop: 4 }}>
            {[
              `${manySizes ? t('detail.sizesOffered') : t('detail.sizeOffered')} ${listing.sizes.join(', ') || '—'}`,
              listing.sizeFit !== null ? t(`fit.${listing.sizeFit}` as TranslationKey) : null,
              listing.retail ? `${t('detail.retail')} ${m(listing.retail)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Txt>

          {listing.owner.vacation ? (
            <View style={{ marginTop: 12 }}>
              <Note>{t('detail.onVacation')}</Note>
            </View>
          ) : null}

          {offersOpen ? (
            <View
              style={{
                marginTop: 12,
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: c.accentSoft,
              }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: c.accent }} />
              <Txt size={13} weight="bold" color={c.accent}>
                {listing.minOffer ? `Propositions acceptées · min ${m(listing.minOffer)} ${t('common.perDay')}` : 'Propositions acceptées'}
              </Txt>
            </View>
          ) : null}

          <Divider />

          {/* Lender */}
          <Pressable
            accessibilityRole="button"
            onPress={() => set({ screen: 'user', profileId: listing.ownerId })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            <View style={{ width: 56, height: 56, borderRadius: 999, padding: 2, borderWidth: 2, borderColor: c.accent }}>
              <View style={{ flex: 1, borderRadius: 999, overflow: 'hidden' }}>
                <MediaSlot id={`lender-${listing.id}`} shape="circle" remoteUri={listing.owner.avatar ?? undefined} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Txt size={16} weight="bold">
                  {t('detail.lentBy')} @{listing.owner.username}
                </Txt>
                {listing.owner.certified ? <CertifiedMark /> : null}
              </View>
              <Txt size={13} color={c.ink2}>
                {listing.owner.identityVerified ? t('detail.idVerified') : t('detail.idNotVerified')}
              </Txt>
            </View>
            <ChevronRight size={15} color={c.ink3} />
          </Pressable>
          <MessageButton memberId={listing.ownerId} listingId={listing.id} label={t('msg.ask')} style={{ marginTop: 14 }} />

          <Divider />

          {/* Highlights */}
          <View style={{ gap: 18 }}>
            {highlights.map(({ Icon, title, body }) => (
              <View key={title} style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ width: 26, paddingTop: 1 }}>
                  <Icon size={24} color={c.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={15} weight="semi">
                    {title}
                  </Txt>
                  <Txt size={13} color={c.ink2} style={{ marginTop: 2 }}>
                    {body}
                  </Txt>
                </View>
              </View>
            ))}
          </View>

          {/* Virtual try-on */}
          <PressScale
            haptic="light"
            onPress={() => set({ screen: 'tryon', tryOnListingId: listing.id })}
            accessibilityLabel={t('tryon.title')}
            style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: c.accentSoft }}
          >
            <SparkleIcon size={24} color={c.accent} />
            <View style={{ flex: 1 }}>
              <Txt weight="bold">{t('tryon.title')}</Txt>
              <Txt size={13} color={c.ink2}>
                {t('tryon.subtitle')}
              </Txt>
            </View>
            <ChevronRight size={15} color={c.accent} />
          </PressScale>

          {manySizes ? (
            <>
              <Divider />
              <Txt size={18} weight="bold">
                {t('detail.sizesOffered')}
              </Txt>
              <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {listing.sizes.map((s) => (
                  <Chip key={s} label={s} on={selectedSize === s} onPress={() => set({ size: s })} />
                ))}
              </View>
            </>
          ) : null}

          {listing.description ? (
            <>
              <Divider />
              <Txt size={18} weight="bold">
                {t('detail.about')}
              </Txt>
              <Txt size={15} color={c.ink2} style={{ marginTop: 8 }}>
                {listing.description}
              </Txt>
            </>
          ) : null}

          {listing.rules.length ? (
            <>
              <Divider />
              <Txt size={18} weight="bold">
                {t('detail.rules')}
              </Txt>
              <View style={{ marginTop: 12, gap: 12 }}>
                {listing.rules.map((rule) => (
                  <View key={rule} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                    <CheckIcon size={20} color={c.ink} />
                    <Txt size={15} style={{ flex: 1 }}>
                      {rule}
                    </Txt>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Where the handover happens: an area, never an address */}
          <Divider />
          <Txt size={18} weight="bold">
            {t('detail.where')}
          </Txt>
          <Txt size={14} color={c.ink2} style={{ marginTop: 4 }}>
            {area}
          </Txt>
          <AreaMap label={area} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <ShieldCheckIcon size={16} color={c.ink3} />
            <Txt size={13} color={c.ink3} style={{ flex: 1 }}>
              {t('detail.whereNote')}
            </Txt>
          </View>

          <View style={{ marginTop: 20 }}>
            <Note tone="accent">{t('detail.allShown')}</Note>
          </View>
        </View>
      </ScrollView>

      {/* Price and actions */}
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
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View style={{ flexShrink: 0, maxWidth: 120 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Amount size={22}>{m(listing.price)}</Amount>
            <Txt size={14} color={c.ink2}>
              / {t('common.day')}
            </Txt>
          </View>
          <Txt size={12} color={c.ink3} numberOfLines={1}>
            {t('detail.feesShown')}
          </Txt>
        </View>
        {offersOpen ? (
          <GhostButton label={t('detail.offer')} tone="accent" onPress={() => set({ offer: true })} style={{ minHeight: 52 }} />
        ) : null}
        <PrimaryButton
          label={t('detail.viewDates')}
          disabled={!!listing.owner.vacation}
          onPress={() => {
            // Booking from the listing is at the listed price; an accepted offer books from its message.
            set({ agreedOffer: null });
            go('booking');
          }}
          style={{ flex: 1, minHeight: 52, paddingHorizontal: 14 }}
        />
      </View>

      <OfferSheet days={days} />
    </View>
  );
}

/**
 * A drawn map of the area, no tiles and no coordinates: the handover spot is
 * a public place picked in messages, so there is nothing more precise to show.
 */
function AreaMap({ label }: { label: string }) {
  const { c, dark } = useTheme();
  const land = dark ? '#221E26' : '#EEF1EC';
  const park = dark ? '#243026' : '#D9E8D3';
  const water = dark ? '#1D2A36' : '#CFE2F3';
  const road = dark ? '#2F2A34' : '#FFFFFF';
  return (
    <View style={{ marginTop: 14, height: 190, borderRadius: 20, overflow: 'hidden', backgroundColor: land }}>
      <View style={{ position: 'absolute', left: -30, top: 10, width: 200, height: 90, borderRadius: 60, backgroundColor: water, transform: [{ rotate: '-8deg' }] }} />
      <View style={{ position: 'absolute', right: -20, top: -10, width: 140, height: 80, borderRadius: 18, backgroundColor: park }} />
      <View style={{ position: 'absolute', left: 0, bottom: -10, width: 150, height: 70, borderRadius: 18, backgroundColor: park }} />
      <View style={{ position: 'absolute', left: -20, right: -20, top: 105, height: 8, backgroundColor: road, transform: [{ rotate: '-6deg' }] }} />
      <View style={{ position: 'absolute', top: -20, bottom: -20, left: '58%', width: 8, backgroundColor: road, transform: [{ rotate: '12deg' }] }} />
      <View style={{ position: 'absolute', top: -20, bottom: -20, left: '30%', width: 6, backgroundColor: road, transform: [{ rotate: '-18deg' }] }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 120, height: 120, borderRadius: 99, backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 99, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <PinIcon size={20} color={c.onAccent} />
          </View>
        </View>
      </View>
      <View
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 999,
          backgroundColor: c.bg,
        }}
      >
        <PinIcon size={14} color={c.accent} />
        <Txt size={13} weight="semi">
          {label}
        </Txt>
      </View>
    </View>
  );
}


function OfferSheet({ days }: { days: number }) {
  const { state, set, m } = useStore();
  const { t } = useT();
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
      const offerId = await makeOffer(listing.id, perDay, days);
      const id = await startConversation(listing.ownerId, listing.id);
      await sendMessage(id, `Offre : ${m(perDay)} / jour pour ${days} ${dayWord}`, 'offer', {
        listingId: listing.id,
        perDay,
        days,
        ...(offerId ? { offerId } : {}),
      });
      tap('success');
      set({ offer: false, screen: 'messages', thread: id });
    } catch (e) {
      setError(friendlyError(e, t));
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
