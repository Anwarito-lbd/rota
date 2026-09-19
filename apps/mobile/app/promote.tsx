import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { Share, StyleSheet, Text } from 'react-native';
import { Badge, Card, Loading, PrimaryButton, Screen, SecondaryButton, Sub, Title } from '../components/ui';
import { colors } from '../constants/theme';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Promote() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.referral().then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <Loading />;

  return (
    <Screen>
      <Title>Promouvoir</Title>
      <Sub>{data.message}</Sub>
      <Text style={styles.ownerNote}>
        Prix / jour = loyer listé ; vous recevez loyer − 10 % (frais service prêteur, bêta). Caution
        côté locataire ; payout après retour OK, pas au handover.
      </Text>
      {user?.foundingCloset || data.foundingCloset ? (
        <Badge text="★ Closet fondateur" tone="clay" />
      ) : (
        <Badge text="Badge à débloquer" tone="mute" />
      )}
      <Card style={{ marginTop: 16 }}>
        <Text style={styles.k}>Code parrainage</Text>
        <Text style={styles.code}>{data.code}</Text>
        <Text style={styles.v}>Récompense : {data.rewardEur} € de crédit</Text>
        <Text style={styles.link}>{data.shareUrl}</Text>
      </Card>
      <PrimaryButton
        title="Partager"
        onPress={() =>
          Share.share({
            message: `Loue mon closet sur Rota (Paris) ${data.shareUrl} — code ${data.code}`,
          })
        }
      />
      <SecondaryButton title="Ouvrir le lien" onPress={() => Linking.openURL(data.shareUrl)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ownerNote: { color: colors.ink3, fontSize: 12, lineHeight: 17, marginTop: 10 },
  k: { color: colors.ink3, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  code: { color: colors.ink, fontSize: 28, fontWeight: '700', marginTop: 8 },
  v: { color: colors.ink2, marginTop: 8 },
  link: { color: colors.clay, marginTop: 8 },
});
