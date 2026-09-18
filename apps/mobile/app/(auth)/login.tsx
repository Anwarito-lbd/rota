import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Field, Label, PrimaryButton, Screen, SecondaryButton, Sub, Title } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { colors } from '../../constants/theme';

export default function Login() {
  const { signIn, magicLink } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('demo@rota.app');
  const [password, setPassword] = useState('rota1234');
  const [busy, setBusy] = useState(false);

  async function onLogin() {
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)/feed');
    } catch (e: any) {
      Alert.alert('Connexion', e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function onMagic() {
    setBusy(true);
    try {
      await magicLink(email.trim());
      router.replace('/(tabs)/feed');
    } catch (e: any) {
      Alert.alert('Lien magique', e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Bon retour</Title>
      <Sub>Email + mot de passe, ou lien magique (MVP simulé).</Sub>
      <Label>Email</Label>
      <Field autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Label>Mot de passe</Label>
      <Field secureTextEntry value={password} onChangeText={setPassword} />
      <PrimaryButton title={busy ? '…' : 'Se connecter'} onPress={onLogin} disabled={busy} />
      <SecondaryButton title="Recevoir un lien magique" onPress={onMagic} />
      <Link href="/(auth)/signup" style={{ marginTop: 20 }}>
        <Text style={{ color: colors.clay, textAlign: 'center' }}>Pas encore de compte ? S’inscrire</Text>
      </Link>
    </Screen>
  );
}
