import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { Listing, User } from '@rota/shared';
import { ListingCard } from '../../components/ListingCard';
import { Avatar, Badge, Loading } from '../../components/ui';
import { colors } from '../../constants/theme';
import { api } from '../../lib/api';

export default function PublicProfile() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.profile(String(handle));
        setUser(data.user);
        setListings(data.listings);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [handle]);

  if (loading) return <Loading />;
  if (!user) {
    return (
      <View style={styles.root}>
        <Text style={styles.empty}>Profil introuvable</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      data={listings}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <View style={styles.hero}>
          <Avatar uri={user.avatarUrl} size={72} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.handle}>@{user.handle}</Text>
          {user.foundingCloset ? <Badge text="★ Closet fondateur" /> : null}
          {user.certified ? <Text style={styles.cert}>✓ Certifié</Text> : null}
          <Text style={styles.bio}>{user.bio}</Text>
        </View>
      }
      renderItem={({ item }) => <ListingCard listing={item} />}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { alignItems: 'center', marginBottom: 20 },
  name: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 12 },
  handle: { color: colors.ink2, marginVertical: 4 },
  cert: { color: colors.clay, marginTop: 6, fontWeight: '700' },
  bio: { color: colors.ink3, textAlign: 'center', marginTop: 8 },
  empty: { color: colors.ink3, textAlign: 'center', marginTop: 40 },
});
