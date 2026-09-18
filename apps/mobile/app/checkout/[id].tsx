import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, PrimaryButton, Sub, Title } from '../../components/ui';
import { colors } from '../../constants/theme';
import { api } from '../../lib/api';
import { STRIPE_PK } from '../../lib/config';
import { LEGAL_BANNER } from '../../lib/legalContent';
import { FEES, quoteCheckout, type CheckoutQuote } from '@rota/shared';

const DRAFT_BANNER =
  'Règles brouillon pour Closets fondateurs / bêta — soumises à revue avocat ; pas des conditions juridiques finales.';

function eur(n: number) {
  return `${n.toFixed(n % 1 === 0 ? 0 : 2)} €`;
}

export default function Checkout() {
  const { id, start, end, delivery } = useLocalSearchParams<{
    id: string;
    start: string;
    end: string;
    delivery: 'ship' | 'meet';
  }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [accepted, setAccepted] = useState(false);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [title, setTitle] = useState<string>('');

  const deliveryMode = delivery === 'ship' ? 'ship' : 'meet';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listing = await api.listing(String(id));
        if (cancelled || !listing) return;
        setTitle(listing.title);
        setQuote(
          quoteCheckout({
            pricePerDay: listing.pricePerDay,
            startDate: String(start),
            endDate: String(end),
            delivery: deliveryMode,
            badge: listing.badge,
            cleaningByLender: listing.cleaningByLender,
            cleaningFee: listing.cleaningFee,
            retail: listing.retail,
          }),
        );
      } catch {
        if (!cancelled) setQuote(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, start, end, deliveryMode]);

  const lines = useMemo(() => {
    if (!quote) return [];
    const rows: { k: string; v: string; note?: string }[] = [
      {
        k: `Loyer (${quote.days} j × prix/jour)`,
        v: eur(quote.loyer),
      },
      {
        k: 'Frais de service',
        v: eur(quote.serviceFee),
        note: `${Math.round(FEES.renterServiceRate * 100)} % du loyer · côté locataire (bêta)`,
      },
      {
        k: 'Livraison',
        v: quote.shippingFree ? 'Offerte' : eur(quote.shipping),
        note:
          deliveryMode === 'meet'
            ? 'Remise en main propre'
            : quote.shippingFree
              ? 'Livraison offerte par le prêteur'
              : undefined,
      },
    ];
    if (quote.showCleaning) {
      rows.push({ k: 'Nettoyage (prêteur)', v: eur(quote.cleaning) });
    }
    return rows;
  }, [quote, deliveryMode]);

  async function pay() {
    if (!accepted) {
      Alert.alert(
        'Acceptation requise',
        'Veuillez accepter les CGU, la confidentialité, les règles communauté et la politique frais.',
      );
      return;
    }
    setBusy(true);
    try {
      const res = await api.book({
        listingId: String(id),
        startDate: String(start),
        endDate: String(end),
        delivery: deliveryMode,
      });
      setSummary(res);
      if (res?.checkout?.quote) setQuote(res.checkout.quote);
      await api.confirmCheckout(res.booking.id);
      Alert.alert('Réservation confirmée', 'Paiement Stripe test stub réussi.', [
        { text: 'Voir mes locations', onPress: () => router.replace('/(tabs)/rentals') },
      ]);
    } catch (e: any) {
      Alert.alert('Checkout', e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Title>Checkout</Title>
      <Sub>
        {title ? `${title} · ` : ''}
        {start} → {end} · {deliveryMode === 'ship' ? 'Livraison' : 'Main propre'}
      </Sub>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>{DRAFT_BANNER}</Text>
      </View>
      <Text style={styles.bannerSub}>{LEGAL_BANNER}</Text>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.k}>Récapitulatif</Text>
        {!quote ? (
          <Text style={styles.v}>Chargement du devis…</Text>
        ) : (
          <>
            {lines.map((row) => (
              <View key={row.k} style={styles.row}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.lineK}>{row.k}</Text>
                  {row.note ? <Text style={styles.lineNote}>{row.note}</Text> : null}
                </View>
                <Text style={styles.lineV}>{row.v}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.totalLabel}>Total dû maintenant</Text>
              <Text style={styles.total}>{eur(quote.totalDueNow)}</Text>
            </View>

            <View style={[styles.row, { marginTop: 10 }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.lineK}>Caution (pré-autorisation / hold)</Text>
                <Text style={styles.lineNote}>
                  Non débitée maintenant · palier {quote.depositTier}
                  {quote.deposit === FEES.deposit ? ' · défaut mid' : ''}
                </Text>
                <Text style={styles.insurance}>Assurance non incluse</Text>
              </View>
              <Text style={styles.hold}>{eur(quote.deposit)}</Text>
            </View>
          </>
        )}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.k}>Documents</Text>
        <View style={styles.links}>
          <Link href={'/legal/fees' as any} style={styles.link}>
            Frais & caution
          </Link>
          <Text style={styles.dot}>·</Text>
          <Link href={'/legal/community' as any} style={styles.link}>
            Communauté / Sécurité
          </Link>
          <Text style={styles.dot}>·</Text>
          <Link href={'/legal/cgu' as any} style={styles.link}>
            CGU
          </Link>
          <Text style={styles.dot}>·</Text>
          <Link href={'/legal/privacy' as any} style={styles.link}>
            Confidentialité
          </Link>
        </View>
      </Card>

      <Pressable
        onPress={() => setAccepted((v) => !v)}
        style={styles.checkRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
      >
        <View style={[styles.box, accepted && styles.boxOn]}>
          {accepted ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
        <Text style={styles.checkLabel}>
          J’accepte les CGU, la Politique de confidentialité, les Règles de la communauté et la
          Politique frais / caution.
        </Text>
      </Pressable>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.k}>Stripe (test)</Text>
        <Text style={styles.v}>{STRIPE_PK.slice(0, 20)}…</Text>
        <Text style={styles.note}>
          Clés via EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_SECRET_KEY. Ce MVP confirme un
          PaymentIntent stub sans SDK natif.
        </Text>
      </Card>

      {summary ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.k}>Confirmé</Text>
          <Text style={styles.total}>
            {(summary.checkout.amountCents / 100).toFixed(0)} €
          </Text>
          <Text style={styles.v}>
            Caution hold {(summary.checkout.depositCents / 100).toFixed(0)} €
          </Text>
        </Card>
      ) : null}

      <PrimaryButton
        title={busy ? 'Paiement…' : 'Payer (test)'}
        onPress={pay}
        disabled={busy || !accepted || !quote}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 48 },
  banner: {
    marginTop: 14,
    backgroundColor: 'rgba(196,164,132,0.16)',
    borderColor: 'rgba(196,164,132,0.45)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  bannerText: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  bannerSub: { color: colors.ink3, fontSize: 11, lineHeight: 16, marginTop: 8 },
  k: { color: colors.ink3, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  v: { color: colors.ink2, marginTop: 6 },
  note: { color: colors.ink3, marginTop: 10, lineHeight: 20, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 12 },
  lineK: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  lineNote: { color: colors.ink3, fontSize: 12, marginTop: 2, lineHeight: 16 },
  lineV: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.line, marginTop: 14 },
  totalLabel: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  total: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  hold: { color: colors.clay, fontSize: 18, fontWeight: '700' },
  insurance: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.2,
  },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10 },
  link: { color: colors.clay, fontWeight: '600', fontSize: 14 },
  dot: { color: colors.ink3, marginHorizontal: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, gap: 12 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: colors.surf2,
  },
  boxOn: { backgroundColor: colors.clay, borderColor: colors.clay },
  checkMark: { color: colors.onClay, fontWeight: '800', fontSize: 13 },
  checkLabel: { flex: 1, color: colors.ink2, fontSize: 14, lineHeight: 20 },
});
