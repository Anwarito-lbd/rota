import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FEES, SIZES, itemReviews, photoFor, ratingBars } from '../data/catalog';
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
  const { state, set, go, config, m, toggleFlag } = useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { active, days, nego, deposit } = useBooking();
  const wished = !!state.wish[active.id];
  const certified = active.certified || !!state.certifies[active.handle];

  const trust = [
    {
      title: `Dommages couverts jusqu'à ${m(FEES.coverCap)}`,
      body: 'Inclus dans chaque location. À signaler dans les 24 h après le retour.',
    },
    active.cleaning.byLender
      ? {
          title: `Nettoyage par la prêteuse · ${m(active.cleaning.fee)}`,
          body: 'Elle ne souhaite pas que la pièce soit lavée : le nettoyage est fait par ses soins et facturé une fois.',
        }
      : {
          title: 'Nettoyage à votre charge',
          body: 'Aucun frais de nettoyage : vous rendez la pièce propre, en suivant les règles de la prêteuse.',
        },
    {
      title:
        active.authenticity === 'receipt'
          ? 'Authenticité vérifiée · facture'
          : active.authenticity === 'tag'
            ? 'Authenticité vérifiée · étiquette'
            : 'Authenticité non vérifiée',
      body:
        active.authenticity === null
          ? "La prêteuse n'a pas encore fourni de preuve d'achat. Demandez-la avant de réserver."
          : 'Notre équipe a contrôlé la preuve fournie : facture, étiquette et numéro de série.',
    },
    {
      title: config.instantBook ? 'Réservation immédiate' : 'Demande de réservation',
      body: config.instantBook
        ? 'Les locataires à l’identité vérifiée confirment tout de suite.'
        : 'La prêteuse répond en 12 h en moyenne.',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 430, backgroundColor: c.surf2 }}>
          <MediaSlot id={`detail-${active.id}`} shape="rect" tone="media" placeholder={active.title} />
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
            <RoundOverlayButton onPress={() => go('feed')} label="Retour">
              <Txt size={20} color={OVER_INK}>
                ‹
              </Txt>
            </RoundOverlayButton>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <RoundOverlayButton onPress={() => toggleFlag('wish', active.id)} label="Enregistrer">
                <BookmarkIcon size={17} fill={wished ? c.clay : 'none'} color={wished ? c.clay : OVER_INK} />
              </RoundOverlayButton>
              <RoundOverlayButton onPress={() => set({ report: true, reportSent: false })} label="Signaler">
                <DotsIcon size={18} />
              </RoundOverlayButton>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, paddingTop: 20 }}>
          <Txt size={11} weight="bold" upper color={c.clay}>
            {active.occasion} · {active.badge}
          </Txt>
          <Display size={34} style={{ marginTop: 8 }}>
            {active.title}
          </Display>
          <Txt size={15} color={c.ink2} style={{ marginTop: 6 }}>
            {active.brand} · valeur neuve {m(active.retail)}
          </Txt>

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
              backgroundColor: nego.nego ? c.claySoft : 'transparent',
              borderWidth: 1,
              borderColor: nego.nego ? c.clay : c.line2,
            }}
          >
            <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: nego.nego ? c.clay : c.ink3 }} />
            <Txt size={13} weight="bold" color={nego.nego ? c.clay : c.ink2}>
              {nego.nego ? `Propositions acceptées · min ${m(nego.min)} / jour` : 'Prix fixe · pas de négociation'}
            </Txt>
          </View>

          <Card onPress={() => go('profile')} style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 999, padding: 2, backgroundColor: c.clay }}>
              <View style={{ flex: 1, borderRadius: 999, overflow: 'hidden' }}>
                <MediaSlot id={`lender-${active.id}`} shape="circle" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Txt weight="bold">{active.name}</Txt>
                {certified ? <CertifiedMark /> : null}
              </View>
              <Txt size={13} color={c.ink2}>
                {active.rating} ★ · 68 locations · identité vérifiée
              </Txt>
            </View>
            <Txt size={18} color={c.ink3}>
              ›
            </Txt>
          </Card>

          <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 24 }}>
            Taille et tombé
          </Txt>
          <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
            {SIZES.map((s) => (
              <View key={s} style={{ flex: 1 }}>
                <Chip label={s} on={state.size === s} onPress={() => set({ size: s })} />
              </View>
            ))}
          </View>

          <Card style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt size={13} color={c.ink2}>
                Taille petit
              </Txt>
              <Txt size={13} color={c.ink2}>
                Taille juste
              </Txt>
              <Txt size={13} color={c.ink2}>
                Taille grand
              </Txt>
            </View>
            <View style={{ marginTop: 12, height: 4, borderRadius: 99, backgroundColor: c.surf2 }}>
              <View
                style={{
                  position: 'absolute',
                  left: '41%',
                  top: -7,
                  width: 18,
                  height: 18,
                  borderRadius: 99,
                  backgroundColor: c.clay,
                }}
              />
            </View>
            <Txt size={14} color={c.ink2} style={{ marginTop: 14 }}>
              {active.name.split(' ')[0]} mesure 1,70 m et porte du {active.size}. Poitrine 86 cm · taille 68 cm ·
              longueur 142 cm. Stretch minimal.
            </Txt>
          </Card>

          <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 24 }}>
            Portée par des locataires
          </Txt>
          <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3].map((n) => (
              <View key={n} style={{ flex: 1, height: 120, borderRadius: 12, overflow: 'hidden' }}>
                <MediaSlot
                  id={`fit-${n}`}
                  shape="rounded"
                  radius={12}
                  remoteUri={photoFor(`fit-${active.id}-${n}`)}
                  placeholder="Photo portée"
                />
              </View>
            ))}
          </View>

          <View style={{ marginTop: 24, gap: 8 }}>
            {trust.map((t) => (
              <Card key={t.title} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 8, height: 8, marginTop: 7, borderRadius: 99, backgroundColor: c.clay }} />
                <View style={{ flex: 1 }}>
                  <Txt size={14} weight="bold">
                    {t.title}
                  </Txt>
                  <Txt size={13} color={c.ink2} style={{ marginTop: 3 }}>
                    {t.body}
                  </Txt>
                </View>
              </Card>
            ))}
          </View>

          <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 24 }}>
            Règles de la prêteuse
          </Txt>
          <Card style={{ marginTop: 10 }}>
            <View style={{ gap: 9 }}>
              {active.rules.map((rule) => (
                <View key={rule} style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 6, height: 6, marginTop: 8, borderRadius: 99, backgroundColor: c.plum }} />
                  <Txt size={14} style={{ flex: 1 }}>
                    {rule}
                  </Txt>
                </View>
              ))}
            </View>
            <Txt size={13} color={c.ink3} style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
              Vous les acceptez au moment de la réservation. Une règle non respectée peut donner lieu à un signalement.
            </Txt>
          </Card>

          <Pressable onPress={() => go('fees')} style={{ marginTop: 12 }}>
            <Note tone="clay">
              {active.cleaning.byLender ? `Nettoyage ${m(active.cleaning.fee)}` : 'Nettoyage à votre charge'} ·
              protection {m(FEES.coverCap)} · livraison {m(FEES.shipping)} · caution {m(deposit)}. Tout est affiché
              avant paiement.
            </Note>
          </Pressable>

          <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 24 }}>
            Avis après location
          </Txt>
          <Card style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Amount size={34} color={c.clay}>
                4,9
              </Amount>
              <View style={{ flex: 1 }}>
                <Txt size={14} weight="bold">
                  ★★★★★
                </Txt>
                <Txt size={13} color={c.ink2}>
                  24 avis de locataires vérifiés
                </Txt>
              </View>
            </View>
            <View style={{ marginTop: 14, gap: 9 }}>
              {ratingBars.map((b) => (
                <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Txt size={13} color={c.ink2} style={{ width: '42%' }}>
                    {b.label}
                  </Txt>
                  <View style={{ flex: 1, height: 5, borderRadius: 99, backgroundColor: c.surf2 }}>
                    <View style={{ width: b.w as `${number}%`, height: 5, borderRadius: 99, backgroundColor: c.clay }} />
                  </View>
                  <Amount size={13}>{b.value}</Amount>
                </View>
              ))}
            </View>
          </Card>

          <View style={{ marginTop: 10, gap: 8 }}>
            {itemReviews.map((r) => (
              <Card key={r.slot}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 999, overflow: 'hidden' }}>
                    <MediaSlot id={`irv-${r.slot}`} shape="circle" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="bold">
                      {r.name}
                    </Txt>
                    <Txt size={12} color={c.ink3}>
                      {r.meta}
                    </Txt>
                  </View>
                  <Txt size={13} color={c.clay}>
                    {r.stars}
                  </Txt>
                </View>
                <Txt size={14} color={c.ink2} style={{ marginTop: 9 }}>
                  {r.body}
                </Txt>
              </Card>
            ))}
          </View>

          <GhostButton label="Voir les 24 avis" onPress={() => go('reviews')} style={{ marginTop: 10 }} />
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
          <Amount size={22}>{m(active.price)}</Amount>
          <Txt size={12} color={c.ink3}>
            par jour
          </Txt>
        </View>
        {nego.nego ? (
          <GhostButton label="Proposer" tone="clay" onPress={() => set({ offer: true })} style={{ minHeight: 54 }} />
        ) : null}
        <PrimaryButton
          label={config.instantBook ? 'Voir les dates' : 'Demander ces dates'}
          onPress={() => go('booking')}
          style={{ flex: 1 }}
        />
      </View>

      <OfferSheet days={days} />
    </View>
  );
}

function OfferSheet({ days }: { days: number }) {
  const { state, set, m } = useStore();
  const { c } = useTheme();
  const { active, nego } = useBooking();
  const [idx, setIdx] = useState(state.offerIdx);
  const perDay = Math.round(active.price * OFFER_TIERS[idx]);

  return (
    <Sheet visible={state.offer} onClose={() => set({ offer: false })}>
      <Display size={28}>Faire une proposition</Display>
      <Txt size={14} color={c.ink2} style={{ marginTop: 8 }}>
        {active.name} a 12 h pour accepter. Elle demande {m(active.price)} / jour pour {days} jours.
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
                {m(Math.round(active.price * pct))}
              </Amount>
              <Txt size={11} color={on ? c.onclay : c.ink2} style={{ marginTop: 3 }}>
                {Math.round((1 - pct) * 100)} % / jour
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: c.surf2, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <Txt size={13} color={c.ink2} style={{ flex: 1 }}>
            Minimum accepté par {active.name}
          </Txt>
          <Amount size={13}>{`${m(nego.min)} / jour`}</Amount>
        </View>
        <Txt size={13} color={c.ink3}>
          Les propositions sur 3 jours ou plus sont acceptées dans environ 70 % des cas. Nettoyage et protection restent
          inclus.
        </Txt>
      </View>

      <PrimaryButton
        label={`Envoyer · ${m(perDay * days)}`}
        tone="plum"
        onPress={() => set({ offer: false, screen: 'messages', thread: 't1', offerStatus: 'pending' })}
        style={{ marginTop: 18 }}
      />
    </Sheet>
  );
}
