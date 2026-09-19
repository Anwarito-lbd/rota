import { useVideoPlayer, VideoView } from 'expo-video';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

/** Paused video with native controls — replacement for expo-av Video on listing detail. */
export function ListingVideo({
  uri,
  style,
  muted = false,
  nativeControls = true,
}: {
  uri: string;
  style?: ViewStyle;
  muted?: boolean;
  nativeControls?: boolean;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = muted;
    p.pause();
  });

  return (
    <VideoView
      style={style ?? StyleSheet.absoluteFill}
      player={player}
      contentFit="cover"
      nativeControls={nativeControls}
    />
  );
}
