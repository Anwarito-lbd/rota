import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Field, Label, PrimaryButton, Screen, Sub, Title } from '../../components/ui';
import { colors } from '../../constants/theme';
import { useAuth } from '../../lib/auth';

export default function Signup() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!accepted) {
      Alert.alert(
        'Acceptation requise',
        'Veuillez accepter les CGU, la confidentialité, les règles communauté et la politique frais.',
      );
      return;
    }
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

      <Pressable
        onPress={() => setAccepted((v) => !v)}
        style={styles.checkRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
      >
        <View style={[styles.box, accepted && styles.boxOn]}>
          {accepted ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
        <Text style={styles.checkLabel}>
          J’accepte les{' '}
          <Link href={'/legal/cgu' as any} style={styles.link}>
            CGU
          </Link>
          , la{' '}
          <Link href={'/legal/privacy' as any} style={styles.link}>
            Confidentialité
          </Link>
          , les{' '}
          <Link href={'/legal/community' as any} style={styles.link}>
            Règles communauté
          </Link>{' '}
          et la{' '}
          <Link href={'/legal/fees' as any} style={styles.link}>
            Politique frais
          </Link>
          .
        </Text>
      </Pressable>

      <PrimaryButton
        title={busy ? '…' : 'Créer mon compte'}
        onPress={onSubmit}
        disabled={busy || !accepted}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, marginBottom: 8, gap: 12 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: colors.surf2,
  },
  boxOn: { backgroundColor: colors.clay, borderColor: colors.clay },
  checkMark: { color: colors.onClay, fontWeight: '800', fontSize: 13 },
  checkLabel: { flex: 1, color: colors.ink2, fontSize: 14, lineHeight: 20 },
  link: { color: colors.clay, fontWeight: '700' },
});
