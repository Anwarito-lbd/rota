import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { Listing } from '@rota/shared';
import { ListingCard } from '../../components/ListingCard';
import { Loading } from '../../components/ui';
import { colors } from '../../constants/theme';
import { api } from '../../lib/api';

export default function Feed() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'foryou' | 'near'>('foryou');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listings();
      setListings(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading && !listings.length) return <Loading />;

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {(['foryou', 'near'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {t === 'foryou' ? 'Pour toi' : 'Près de moi'}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={listings}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <ListingCard listing={item} large />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.clay} />}
        ListHeaderComponent={
          <Text style={styles.hint}>
            TikTok × Pinterest × Vinted — {listings.filter((l) => l.media.some((m) => m.kind === 'video')).length}{' '}
            looks avec vidéo
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingTop: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.line },
  tabOn: { backgroundColor: colors.surf2, borderColor: colors.clay },
  tabText: { color: colors.ink3, fontWeight: '600' },
  tabTextOn: { color: colors.ink },
  hint: { color: colors.ink3, marginBottom: 12, fontSize: 13 },
});
