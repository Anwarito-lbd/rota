import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES, OCCASIONS, type Listing } from '@rota/shared';
import { ListingCard } from '../../components/ListingCard';
import { Field, Label, Loading } from '../../components/ui';
import { colors } from '../../constants/theme';
import { api } from '../../lib/api';

export default function Discover() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [occasion, setOccasion] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.listings({
          q: q || undefined,
          category: category || undefined,
          occasion: occasion || undefined,
        });
        if (!cancelled) setListings(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, category, occasion]);

  return (
    <View style={styles.root}>
      <View style={{ padding: 16 }}>
        <Field placeholder="Rechercher une pièce, marque, quartier…" value={q} onChangeText={setQ} />
        <Label>Catégories</Label>
        <View style={styles.chips}>
          <Chip label="Toutes" on={category === ''} onPress={() => setCategory('')} />
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} on={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
        <Label>Occasion</Label>
        <View style={styles.chips}>
          <Chip label="Toutes" on={occasion === ''} onPress={() => setOccasion('')} />
          {OCCASIONS.map((o) => (
            <Chip key={o} label={o} on={occasion === o} onPress={() => setOccasion(o)} />
          ))}
        </View>
      </View>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ListingCard listing={item} />
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Aucune pièce — essayez un autre filtre.</Text>}
          ListFooterComponent={
            <Pressable onPress={() => router.push('/promote')} style={styles.promo}>
              <Text style={styles.promoText}>Promouvoir mon closet →</Text>
            </Pressable>
          }
        />
      )}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: colors.clay, borderColor: colors.clay },
  chipText: { color: colors.ink2, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: colors.onClay },
  empty: { color: colors.ink3, textAlign: 'center', marginTop: 40 },
  promo: { margin: 16, padding: 16, borderRadius: 14, backgroundColor: colors.surf, borderWidth: 1, borderColor: colors.line },
  promoText: { color: colors.clay, fontWeight: '700', textAlign: 'center' },
});
