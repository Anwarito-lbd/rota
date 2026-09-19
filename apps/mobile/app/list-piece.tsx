import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Field, Label, PrimaryButton, Sub, Title } from '../components/ui';
import { colors } from '../constants/theme';
import { api } from '../lib/api';

export default function ListPiece() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('25');
  const [size, setSize] = useState('S');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const listing = await api.createListing({
        title,
        brand,
        pricePerDay: Number(price) || 20,
        size,
        description,
        category: 'Robes',
        occasion: 'Soirée',
        media: [
          {
            url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80',
            kind: 'image',
          },
        ],
      });
      Alert.alert('Publié', 'Votre pièce est en ligne.', [
        { text: 'Voir', onPress: () => router.replace(`/listing/${listing.id}`) },
      ]);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de publier');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Title>Mettre en location</Title>
      <Sub>Photos URL OK pour le MVP. Paiements in-app uniquement.</Sub>
      <Label>Titre</Label>
      <Field value={title} onChangeText={setTitle} placeholder="Robe colonne…" />
      <Label>Marque</Label>
      <Field value={brand} onChangeText={setBrand} placeholder="Rasario" />
      <Label>Prix / jour (€)</Label>
      <Field keyboardType="numeric" value={price} onChangeText={setPrice} />
      <Text style={styles.hint}>
        Le prix / jour = le loyer listé. Vous recevez loyer − 10 % (frais service prêteur, bêta).
        Caution à la charge du locataire ; payout après retour OK, pas au handover.
      </Text>
      <Label>Taille</Label>
      <Field value={size} onChangeText={setSize} />
      <Label>Description</Label>
      <Field value={description} onChangeText={setDescription} multiline style={{ minHeight: 90 }} />
      <PrimaryButton title={busy ? '…' : 'Publier'} onPress={submit} disabled={busy || !title || !brand} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hint: { color: colors.ink3, fontSize: 12, lineHeight: 17, marginTop: 8, marginBottom: 4 },
});
