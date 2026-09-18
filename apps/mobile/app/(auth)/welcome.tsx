import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, Screen, SecondaryButton, Sub, Title } from '../../components/ui';
import { colors } from '../../constants/theme';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen style={styles.wrap}>
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 40 }}>
        <Text style={styles.brand}>ROTA</Text>
        <Title>Louez le look,{'\n'}pas la pièce.</Title>
        <Sub>
          Peer-to-peer outfit rental · Paris. Découvrez une tenue, louez les pièces à celle qui les
          porte.
        </Sub>
        <PrimaryButton title="Se connecter" onPress={() => router.push('/(auth)/login')} />
        <SecondaryButton title="Créer un compte" onPress={() => router.push('/(auth)/signup')} />
        <Text style={styles.demo}>Démo : demo@rota.app / rota1234</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'flex-end' },
  brand: {
    color: colors.clay,
    letterSpacing: 6,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
  },
  demo: { color: colors.ink3, textAlign: 'center', marginTop: 18, fontSize: 12 },
});
