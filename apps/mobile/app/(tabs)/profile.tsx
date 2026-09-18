import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, Card, PrimaryButton, SecondaryButton } from '../../components/ui';
import { colors } from '../../constants/theme';
import { useAuth } from '../../lib/auth';

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
});
