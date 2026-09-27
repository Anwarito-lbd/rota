/**
 * Native map (Apple Maps on iOS, Google Maps on Android) with photo pins.
 * Pins sit on the ~550 m grid the server stores, never on an address.
 * The web build uses AreaMap.web.tsx instead.
 */
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { BRAND_LAVENDER } from '../theme/tokens';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  image: string;
}

export interface AreaMapProps {
  center: { lat: number; lng: number };
  radiusKm: number;
  pins: MapPin[];
  selected: string | null;
  onPin: (id: string) => void;
  dark: boolean;
  showMe: boolean;
}

export function AreaMap({ center, radiusKm, pins, selected, onPin, dark, showMe }: AreaMapProps) {
  const ref = useRef<MapView>(null);
  const delta = (radiusKm / 111) * 2.4;

  useEffect(() => {
    ref.current?.animateToRegion(
      { latitude: center.lat, longitude: center.lng, latitudeDelta: delta, longitudeDelta: delta },
      350,
    );
  }, [center.lat, center.lng, delta]);

  return (
    <MapView
      ref={ref}
      style={{ flex: 1 }}
      initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: delta, longitudeDelta: delta }}
      userInterfaceStyle={dark ? 'dark' : 'light'}
      showsUserLocation={showMe}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
    >
      <Circle
        center={{ latitude: center.lat, longitude: center.lng }}
        radius={radiusKm * 1000}
        strokeColor="rgba(226,169,241,0.6)"
        fillColor="rgba(226,169,241,0.08)"
      />
      {pins.map((p) => {
        const on = p.id === selected;
        return (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} onPress={() => onPin(p.id)} tracksViewChanges={false}>
            <View
              style={{
                width: on ? 58 : 46,
                height: on ? 58 : 46,
                borderRadius: 99,
                padding: 3,
                backgroundColor: on ? BRAND_LAVENDER : '#F7F2F8',
              }}
            >
              <Image source={{ uri: p.image }} style={{ flex: 1, borderRadius: 99 }} contentFit="cover" />
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}
