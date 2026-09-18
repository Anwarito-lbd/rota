import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Label, PrimaryButton, Screen, Sub, Title } from '../../components/ui';
import { colors } from '../../constants/theme';

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function BookingDates() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [startOffset, setStartOffset] = useState(2);
  const [endOffset, setEndOffset] = useState(4);
  const [delivery, setDelivery] = useState<'meet' | 'ship'>('meet');

  const start = addDays(today, startOffset);
  const end = addDays(today, Math.max(startOffset, endOffset));

  return (
    <Screen>
      <Title>Dates de location</Title>
      <Sub>Choisissez la période à Paris. Paiement uniquement in-app.</Sub>

      <Label>Début</Label>
      <View style={styles.row}>
        {[1, 2, 3, 5, 7].map((n) => (
          <Pressable
            key={n}
            onPress={() => {
              setStartOffset(n);
              if (endOffset < n) setEndOffset(n + 1);
            }}
            style={[styles.chip, startOffset === n && styles.chipOn]}
          >
            <Text style={[styles.chipText, startOffset === n && styles.chipTextOn]}>+{n}j</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.date}>{iso(start)}</Text>

      <Label>Fin</Label>
      <View style={styles.row}>
        {[2, 3, 4, 6, 8].map((n) => (
          <Pressable
            key={n}
            onPress={() => setEndOffset(Math.max(n, startOffset))}
            style={[styles.chip, endOffset === n && styles.chipOn]}
          >
            <Text style={[styles.chipText, endOffset === n && styles.chipTextOn]}>+{n}j</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.date}>{iso(end)}</Text>

      <Label>Remise</Label>
      <View style={styles.row}>
        <Pressable
          onPress={() => setDelivery('meet')}
          style={[styles.chip, delivery === 'meet' && styles.chipOn, { flex: 1 }]}
        >
          <Text style={[styles.chipText, delivery === 'meet' && styles.chipTextOn]}>Main propre</Text>
        </Pressable>
        <Pressable
          onPress={() => setDelivery('ship')}
          style={[styles.chip, delivery === 'ship' && styles.chipOn, { flex: 1 }]}
        >
          <Text style={[styles.chipText, delivery === 'ship' && styles.chipTextOn]}>Livraison (+9 €)</Text>
        </Pressable>
      </View>

      <PrimaryButton
        title="Continuer vers le paiement"
        onPress={() =>
          router.push({
            pathname: '/checkout/[id]',
            params: {
              id: String(id),
              start: iso(start),
              end: iso(end),
              delivery,
            },
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipOn: { backgroundColor: colors.clay, borderColor: colors.clay },
  chipText: { color: colors.ink2, fontWeight: '700' },
  chipTextOn: { color: colors.onClay },
  date: { color: colors.ink, fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 8 },
});
