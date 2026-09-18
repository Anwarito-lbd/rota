import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Field, Label, PrimaryButton, Screen, Sub, Title } from '../../components/ui';
import { useAuth } from '../../lib/auth';

export default function Signup() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    try {
      await signUp({ email: email.trim(), password, name: name.trim(), handle: handle.trim() });
      router.replace('/(tabs)/feed');
    } catch (e: any) {
      Alert.alert('Inscription', e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Rejoindre Rota</Title>
      <Sub>Paris-first · French-first. Votre closet peut commencer à gagner.</Sub>
      <Label>Prénom</Label>
      <Field value={name} onChangeText={setName} placeholder="Camille" />
      <Label>Handle</Label>
      <Field autoCapitalize="none" value={handle} onChangeText={setHandle} placeholder="camille.b" />
      <Label>Email</Label>
      <Field autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Label>Mot de passe</Label>
      <Field secureTextEntry value={password} onChangeText={setPassword} />
      <PrimaryButton title={busy ? '…' : 'Créer mon compte'} onPress={onSubmit} disabled={busy} />
    </Screen>
  );
}
