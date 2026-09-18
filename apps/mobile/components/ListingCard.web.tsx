import { Link } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Listing } from '@rota/shared';
import { colors } from '../constants/theme';
import { Badge, Price } from './ui';

export function ListingCard({ listing, large }: { listing: Listing; large?: boolean }) {
  const video = listing.media.find((m) => m.kind === 'video');
  const image = listing.media.find((m) => m.kind === 'image');
  const posterUri = video?.poster || image?.url;

  return (
    <Link href={`/listing/${listing.id}`} asChild>
      <Pressable style={large ? [styles.card, styles.large] : styles.card}>
        <View style={styles.media}>
          <Image source={{ uri: posterUri || image?.url }} style={styles.fill} />
          {video ? (
            <View style={styles.playPill}>
              <Text style={styles.playText}>▶ Vidéo</Text>
            </View>
          ) : null}
          {listing.badge ? (
            <View style={styles.badgeWrap}>
              <Badge text={listing.badge} />
            </View>
          ) : null}
        </View>
        <View style={styles.meta}>
          <Text style={styles.brand}>{listing.brand}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {listing.title}
          </Text>
          <View style={styles.row}>
            <Price value={listing.pricePerDay} />
            <Text style={styles.city}>{listing.neighborhood}</Text>
          </View>
          <Text style={styles.handle}>
            {listing.size} · ★ {listing.rating}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surf,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  large: { minHeight: 420 },
  media: { height: 280, backgroundColor: colors.surf2, position: 'relative' },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  playPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(12,10,11,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  playText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  badgeWrap: { position: 'absolute', top: 12, left: 12 },
  meta: { padding: 14 },
  brand: { color: colors.ink3, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '700', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  city: { color: colors.ink2, fontSize: 13 },
  handle: { color: colors.ink3, fontSize: 12, marginTop: 6 },
});
