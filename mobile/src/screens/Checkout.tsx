import { Pressable, View } from 'react-native';
import { payMethods } from '../data/catalog';
import { useListing } from '../data/listings';
import { useT } from '../i18n';
import { FEES } from '../lib/fees';
import { useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { AppleIcon } from '../ui/icons';
import {
  Amount,
  BackButton,
  Card,
  Display,
  FooterBar,
  GhostButton,
  PrimaryButton,
  Radio,
  Screen,
  Txt,
} from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';

function Confirmation() {
  const { go, m } = useStore();
  const { c } = useTheme();

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
        La prêteuse a 24 h pour confirmer la remise. Vous recevrez un message dès sa réponse. Poster une vidéo après la
        location vous donne {m(10)} de crédit.
      </Txt>
      <PrimaryButton label="Retour au feed" onPress={() => go('feed')} style={{ marginTop: 26, alignSelf: 'stretch' }} />
    </View>
  );
}

export function Checkout() {
  const { state, set, go, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const listing = useListing(state.activeId);
  const { days, ship, total, deposit } = useBooking(listing);

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

        <Txt size={12} color={c.ink3} style={{ marginTop: 10 }}>
          Le paiement en espèces n'est pas accepté : hors application, ni la protection dommages ni la caution ne
          s'appliquent.
        </Txt>

        <Card style={{ marginTop: 22 }}>
          <Txt size={14} weight="bold">
            Ce qui est compris
          </Txt>
          <Txt size={13} color={c.ink2} style={{ marginTop: 8 }}>
            Protection dommages jusqu'à {m(1500)}
            {listing.cleaning.byLender
              ? ` et nettoyage par la prêteuse (${m(listing.cleaning.fee)})`
              : ' ; la pièce est rendue propre par vos soins'}
            . Une autorisation de {m(deposit)} est placée sur votre moyen de paiement et libérée 48 h après le retour.
            Retard : {m(FEES.latePerDay)} par jour.
          </Txt>
        </Card>

        <Txt size={12} color={c.ink3} style={{ marginTop: 12 }}>
          En payant, vous acceptez les conditions de location et la politique d'annulation. Rota est une place de marché
          : le contrat de location vous lie à @{listing.owner.username}.
        </Txt>
      </Screen>

      <FooterBar>
        <PrimaryButton label={`Payer ${m(total)}`} onPress={() => set({ confirmed: true })} />
      </FooterBar>
    </View>
  );
}
