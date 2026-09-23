import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListing } from '../data/listings';
import { useT } from '../i18n';
import { FEES } from '../lib/fees';
import { OFFER_TIERS, useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { OVER_INK, OVER_SCRIM } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { BookmarkIcon, DotsIcon } from '../ui/icons';
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
  const { days, deposit } = useBooking(listing);

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
      title: `Dommages couverts jusqu'à ${m(1500)}`,
      body: 'Inclus dans chaque location. À signaler dans les 24 h après le retour.',
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
                <BookmarkIcon size={17} fill={wished ? c.clay : 'none'} color={wished ? c.clay : OVER_INK} />
              </RoundOverlayButton>
              <RoundOverlayButton onPress={() => set({ report: true, reportSent: false })} label="Signaler">
                <DotsIcon size={18} />
              </RoundOverlayButton>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, paddingTop: 20 }}>
          {listing.occasion ? (
            <Txt size={11} weight="bold" upper color={c.clay}>
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

          {listing.acceptOffers ? (
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
                backgroundColor: c.claySoft,
                borderWidth: 1,
                borderColor: c.clay,
              }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: c.clay }} />
              <Txt size={13} weight="bold" color={c.clay}>
                {listing.minOffer
                  ? `Propositions acceptées · min ${m(listing.minOffer)} ${t('common.perDay')}`
                  : 'Propositions acceptées'}
              </Txt>
            </View>
          ) : null}

          <Card onPress={() => go('profile')} style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 999, padding: 2, backgroundColor: c.clay }}>
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
                <View style={{ width: 8, height: 8, marginTop: 7, borderRadius: 99, backgroundColor: c.clay }} />
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
            <Note tone="clay">
              {listing.cleaning.byLender ? `Nettoyage ${m(listing.cleaning.fee)}` : 'Nettoyage à votre charge'} ·
              livraison {m(FEES.shipping)} · caution {m(deposit)}. Tout est affiché avant paiement.
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
        {listing.acceptOffers ? (
          <GhostButton label={t('detail.offer')} tone="clay" onPress={() => set({ offer: true })} style={{ minHeight: 54 }} />
        ) : null}
        <PrimaryButton label={t('detail.viewDates')} onPress={() => go('booking')} style={{ flex: 1 }} />
      </View>

      <OfferSheet days={days} />
    </View>
  );
}

function OfferSheet({ days }: { days: number }) {
  const { state, set, m } = useStore();
  const { c } = useTheme();
  const listing = useListing(state.activeId);
  const [idx, setIdx] = useState(state.offerIdx);
  if (!listing) return null;
  const perDay = Math.round(listing.price * OFFER_TIERS[idx]);

  return (
    <Sheet visible={state.offer} onClose={() => set({ offer: false })}>
      <Display size={28}>Faire une proposition</Display>
      <Txt size={14} color={c.ink2} style={{ marginTop: 8 }}>
        @{listing.owner.username} a 12 h pour accepter. Elle demande {m(listing.price)} / jour pour {days} jours.
      </Txt>

      <View style={{ marginTop: 18, flexDirection: 'row', gap: 8 }}>
        {OFFER_TIERS.map((pct, i) => {
          const on = idx === i;
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
                borderColor: on ? c.clay : c.line2,
                backgroundColor: on ? c.clay : 'transparent',
              }}
            >
              <Amount size={17} color={on ? c.onclay : c.ink}>
                {m(Math.round(listing.price * pct))}
              </Amount>
              <Txt size={11} color={on ? c.onclay : c.ink2} style={{ marginTop: 3 }}>
                {Math.round((1 - pct) * 100)} % / jour
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton
        label={`Envoyer · ${m(perDay * days)}`}
        tone="plum"
        onPress={() => set({ offer: false })}
        style={{ marginTop: 18 }}
      />
    </Sheet>
  );
}
