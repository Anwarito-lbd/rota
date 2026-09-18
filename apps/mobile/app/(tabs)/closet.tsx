import { Link, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { Listing } from '@rota/shared';
import { ListingCard } from '../../components/ListingCard';
import { Loading, PrimaryButton } from '../../components/ui';
import { colors } from '../../constants/theme';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function Closet() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setListings(await api.closet());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <Loading />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon closet</Text>
        {user?.foundingCloset ? (
          <Text style={styles.badge}>★ Closet fondateur</Text>
        ) : (
          <Text style={styles.sub}>Listez une pièce à Paris</Text>
        )}
        <PrimaryButton title="Mettre une pièce en location" onPress={() => router.push('/list-piece')} />
      </View>
      <FlatList
        data={listings}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => <ListingCard listing={item} />}
        ListEmptyComponent={<Text style={styles.empty}>Votre closet est vide pour l’instant.</Text>}
        ListFooterComponent={
          <Link href="/promote" style={{ marginTop: 8 }}>
            <Text style={{ color: colors.clay, textAlign: 'center', fontWeight: '700' }}>
              Promouvoir / parrainage →
            </Text>
          </Link>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 16, paddingBottom: 0 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '700' },
  badge: { color: colors.clay, marginTop: 4, fontWeight: '700' },
  sub: { color: colors.ink3, marginTop: 4 },
  empty: { color: colors.ink3, textAlign: 'center', marginTop: 24 },
});
