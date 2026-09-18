import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
      setListings(tab === 'near' ? [...data].sort((a, b) => a.neighborhood.localeCompare(b.neighborhood)) : data);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading && !listings.length) return <Loading />;

  const videoCount = listings.filter((l) => l.media.some((m) => m.kind === 'video')).length;

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {(['foryou', 'near'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={tab === t ? [styles.tab, styles.tabOn] : styles.tab}
          >
            <Text style={tab === t ? [styles.tabText, styles.tabTextOn] : styles.tabText}>
              {t === 'foryou' ? 'Pour toi' : 'Près de moi'}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.clay} />}
      >
        <Text style={styles.hint}>
          TikTok × Pinterest × Vinted — {videoCount} looks avec vidéo
        </Text>
        {listings.map((item) => (
          <ListingCard key={item.id} listing={item} large />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 8,
  },
  tabOn: { backgroundColor: colors.surf2, borderColor: colors.clay },
  tabText: { color: colors.ink3, fontWeight: '600' },
  tabTextOn: { color: colors.ink },
  hint: { color: colors.ink3, marginBottom: 12, fontSize: 13 },
  list: { padding: 16, paddingBottom: 40 },
});
