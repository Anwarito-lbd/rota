import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Listing } from '@rota/shared';
import { Avatar, Badge, Loading, PrimaryButton } from '../../components/ui';
import { colors } from '../../constants/theme';
import { api } from '../../lib/api';

const W = Dimensions.get('window').width;

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<(Listing & { owner?: any }) | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        setListing(await api.listing(String(id)));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading || !listing) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {listing.media.map((m, idx) => (
            <View key={idx} style={{ width: W, height: W * 1.15, backgroundColor: colors.surf2 }}>
              <Image
                  source={{ uri: m.kind === 'video' ? m.poster || m.url : m.url }}
                  style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' }}
                />
              {m.kind === 'video' ? (
                <View style={styles.videoTag}>
                  <Text style={styles.videoTagText}>Vidéo {idx + 1}/{listing.media.length}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>

        <View style={styles.body}>
          {listing.badge ? <Badge text={listing.badge} /> : null}
          <Text style={styles.brand}>{listing.brand}</Text>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>
            {listing.pricePerDay} € <Text style={styles.per}>/ jour</Text>
            <Text style={styles.retail}> · neuf {listing.retail} €</Text>
          </Text>
          <Text style={styles.meta}>
            Taille {listing.size} · {listing.neighborhood} · ★ {listing.rating} · louée {listing.wornCount}×
          </Text>

          {listing.owner ? (
            <View style={styles.owner}>
              <Avatar uri={listing.owner.avatarUrl} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.ownerName}>
                  {listing.owner.name} {listing.owner.certified ? '✓' : ''}
                </Text>
                <Text style={styles.ownerHandle}>@{listing.owner.handle}</Text>
              </View>
              {listing.owner.foundingCloset ? <Badge text="Fondateur" tone="plum" /> : null}
            </View>
          ) : null}

          <Text style={styles.section}>Description</Text>
          <Text style={styles.desc}>{listing.description}</Text>

          <Text style={styles.section}>Règles du prêteur</Text>
          {listing.rules.map((r) => (
            <Text key={r} style={styles.rule}>
              • {r}
            </Text>
          ))}

          {listing.cleaningByLender ? (
            <Text style={styles.clean}>Nettoyage prêteur : +{listing.cleaningFee} €</Text>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton title="Choisir les dates" onPress={() => router.push(`/booking/${listing.id}`)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 120 },
  brand: { color: colors.ink3, marginTop: 12, letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '700', marginTop: 4 },
  price: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 10 },
  per: { color: colors.ink3, fontSize: 14, fontWeight: '500' },
  retail: { color: colors.ink3, fontSize: 14, fontWeight: '400' },
  meta: { color: colors.ink2, marginTop: 8 },
  owner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surf,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ownerName: { color: colors.ink, fontWeight: '700' },
  ownerHandle: { color: colors.ink3, fontSize: 12 },
  section: { color: colors.ink3, letterSpacing: 1.4, textTransform: 'uppercase', fontSize: 11, marginTop: 22, marginBottom: 8 },
  desc: { color: colors.ink2, lineHeight: 22 },
  rule: { color: colors.ink2, marginBottom: 4 },
  clean: { color: colors.clay, marginTop: 12, fontWeight: '600' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  videoTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(12,10,11,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  videoTagText: { color: colors.ink, fontWeight: '700', fontSize: 12 },
});
