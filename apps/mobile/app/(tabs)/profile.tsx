import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, Card, PrimaryButton, SecondaryButton } from '../../components/ui';
import { colors } from '../../constants/theme';
import { useAuth } from '../../lib/auth';
import { LEGAL_BANNER, LEGAL_LINKS } from '../../lib/legalContent';

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.hero}>
        <Avatar uri={user.avatarUrl} size={72} />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.handle}>@{user.handle}</Text>
        <Text style={styles.city}>{user.city}{user.foundingCloset ? ' · Closet fondateur' : ''}</Text>
        {user.certified ? <Text style={styles.cert}>✓ Compte certifié</Text> : null}
      </View>

      <Card style={{ marginTop: 16 }}>
        <Text style={styles.cardTitle}>Mon lien public</Text>
        <Text style={styles.link}>rota.app/u/{user.handle}</Text>
        <SecondaryButton title="Voir mon profil public" onPress={() => router.push(`/u/${user.handle}`)} />
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.cardTitle}>Créateurs</Text>
        <Text style={styles.body}>{user.bio || 'Partagez vos looks et gagnez en location.'}</Text>
        <SecondaryButton title="Promouvoir / referral" onPress={() => router.push('/promote')} />
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.cardTitle}>Légal & frais</Text>
        <Text style={styles.legalNote}>{LEGAL_BANNER}</Text>
        {LEGAL_LINKS.filter((l) => l.slug !== 'community').map((item) => (
          <Pressable
            key={item.slug}
            onPress={() => router.push(`/legal/${item.slug}` as any)}
            style={styles.legalRow}
          >
            <Text style={styles.legalLabel}>{item.label}</Text>
            <Text style={styles.legalChevron}>›</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => router.push('/legal/community' as any)}
          style={[styles.legalRow, { borderBottomWidth: 0 }]}
        >
          <Text style={styles.legalLabel}>Règles de la communauté</Text>
          <Text style={styles.legalChevron}>›</Text>
        </Pressable>
      </Card>

      <PrimaryButton
        title="Se déconnecter"
        onPress={async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { alignItems: 'center', paddingVertical: 20 },
  name: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 12 },
  handle: { color: colors.ink2, marginTop: 4 },
  city: { color: colors.ink3, marginTop: 4 },
  cert: { color: colors.clay, marginTop: 8, fontWeight: '700' },
  cardTitle: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  link: { color: colors.clay, marginVertical: 8 },
  body: { color: colors.ink2, marginTop: 6, marginBottom: 4 },
  legalNote: {
    color: colors.ink3,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    marginBottom: 4,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  legalLabel: { color: colors.ink, fontSize: 15 },
  legalChevron: { color: colors.clay, fontSize: 22, fontWeight: '300' },
});
