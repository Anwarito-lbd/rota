import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Card, PrimaryButton, Screen, Sub, Title } from '../../components/ui';
import { colors } from '../../constants/theme';
import { api } from '../../lib/api';
import { STRIPE_PK } from '../../lib/config';

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

  async function pay() {
    setBusy(true);
    try {
      const res = await api.book({
        listingId: String(id),
        startDate: String(start),
        endDate: String(end),
        delivery: delivery === 'ship' ? 'ship' : 'meet',
      });
      setSummary(res);
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
    <Screen>
      <Title>Checkout</Title>
      <Sub>
        {start} → {end} · {delivery === 'ship' ? 'Livraison' : 'Main propre'}
      </Sub>
      <Card style={{ marginTop: 16 }}>
        <Text style={styles.k}>Stripe (test)</Text>
        <Text style={styles.v}>{STRIPE_PK.slice(0, 20)}…</Text>
        <Text style={styles.note}>
          Clés via EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_SECRET_KEY. Ce MVP confirme un
          PaymentIntent stub sans SDK natif.
        </Text>
      </Card>
      {summary ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.k}>Total</Text>
          <Text style={styles.total}>{(summary.checkout.amountCents / 100).toFixed(0)} €</Text>
          <Text style={styles.v}>Caution {(summary.checkout.depositCents / 100).toFixed(0)} €</Text>
        </Card>
      ) : null}
      <PrimaryButton title={busy ? 'Paiement…' : 'Payer (test)'} onPress={pay} disabled={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  k: { color: colors.ink3, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  v: { color: colors.ink2, marginTop: 6 },
  note: { color: colors.ink3, marginTop: 10, lineHeight: 20, fontSize: 13 },
  total: { color: colors.ink, fontSize: 28, fontWeight: '700', marginTop: 6 },
});
