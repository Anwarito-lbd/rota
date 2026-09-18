import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { Listing } from '@rota/shared';
import { colors } from '../constants/theme';

export function ListingCard({ listing }: { listing: Listing; large?: boolean }) {
  const router = useRouter();
  const video = listing.media.find((m) => m.kind === 'video');
  const image = listing.media.find((m) => m.kind === 'image');
  const posterUri = (video && video.poster) || (image && image.url) || undefined;

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}`)}
      style={{
        backgroundColor: colors.surf,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.line,
        marginBottom: 16,
      }}
    >
      <View style={{ height: 280, backgroundColor: colors.surf2 }}>
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={{ width: 400, height: 280 }}
            resizeMode="cover"
          />
        ) : null}
        {video ? (
          <View
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              backgroundColor: 'rgba(12,10,11,0.7)',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '700' }}>Video</Text>
          </View>
        ) : null}
        {listing.badge ? (
          <View
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              backgroundColor: colors.clay,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: colors.onClay, fontSize: 11, fontWeight: '700' }}>{listing.badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 14 }}>
        <Text style={{ color: colors.ink3, fontSize: 12 }}>{listing.brand}</Text>
        <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '700', marginTop: 4 }} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '700', marginTop: 8 }}>
          {listing.pricePerDay} EUR / jour
        </Text>
        <Text style={{ color: colors.ink2, fontSize: 13, marginTop: 4 }}>{listing.neighborhood}</Text>
        <Text style={{ color: colors.ink3, fontSize: 12, marginTop: 6 }}>
          {listing.size} · {listing.rating}
        </Text>
      </View>
    </Pressable>
  );
}
