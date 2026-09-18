import { Link } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Badge, Loading } from '../../components/ui';
import { colors } from '../../constants/theme';
import { api } from '../../lib/api';

export default function Rentals() {
  const [tab, setTab] = useState<'renting' | 'lending'>('renting');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.bookings(tab));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {(['renting', 'lending'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {t === 'renting' ? 'Je loue' : 'Je prête'}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'renting'
                ? 'Pas encore de location — explorez le feed.'
                : 'Aucune demande — mettez une pièce en location.'}
            </Text>
          }
          renderItem={({ item }) => {
            const cover = item.listingMedia?.find((m: any) => m.kind === 'image')?.url;
            return (
              <Link href={`/listing/${item.listingId}`} asChild>
                <Pressable style={styles.card}>
                  {cover ? <Image source={{ uri: cover }} style={styles.thumb} /> : <View style={styles.thumb} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.listingTitle || 'Pièce'}</Text>
                    <Text style={styles.meta}>
                      {item.startDate} → {item.endDate} · {item.delivery === 'ship' ? 'Livraison' : 'Main propre'}
                    </Text>
                    <Text style={styles.price}>{(item.totalCents / 100).toFixed(0)} €</Text>
                    <Badge text={item.status} tone="mute" />
                  </View>
                </Pressable>
              </Link>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', gap: 8, padding: 16 },
  tab: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  tabOn: { backgroundColor: colors.surf2, borderColor: colors.clay },
  tabText: { color: colors.ink3, fontWeight: '700' },
  tabTextOn: { color: colors.ink },
  empty: { color: colors.ink3, textAlign: 'center', marginTop: 40 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surf,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  thumb: { width: 72, height: 96, borderRadius: 10, backgroundColor: colors.surf2 },
  title: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.ink3, marginTop: 4, fontSize: 12 },
  price: { color: colors.clay, fontWeight: '700', marginVertical: 6 },
});
