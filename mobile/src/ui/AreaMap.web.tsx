/**
 * Web map: raster tiles laid out by hand (Web Mercator), photo pins on top.
 * Same props as the native AreaMap. Tiles © OpenStreetMap contributors;
 * fine for a preview, but production traffic needs a tile provider with a
 * key (OSM's own servers are not meant for app traffic).
 */
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BRAND_LAVENDER } from '../theme/tokens';
import { Txt } from './kit';

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

const TILE = 256;

function project(lat: number, lng: number, z: number) {
  const scale = TILE * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
  };
}

function zoomFor(radiusKm: number) {
  if (radiusKm <= 1.5) return 15;
  if (radiusKm <= 3) return 14;
  if (radiusKm <= 6) return 13;
  return 12;
}

export function AreaMap({ center, radiusKm, pins, selected, onPin, dark, showMe }: AreaMapProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [dz, setDz] = useState(0);
  const z = Math.max(11, Math.min(17, zoomFor(radiusKm) + dz));
  const c = project(center.lat, center.lng, z);

  const tiles = useMemo(() => {
    if (!size.w) return [];
    const x0 = Math.floor((c.x - size.w / 2) / TILE);
    const x1 = Math.floor((c.x + size.w / 2) / TILE);
    const y0 = Math.floor((c.y - size.h / 2) / TILE);
    const y1 = Math.floor((c.y + size.h / 2) / TILE);
    const out: { key: string; uri: string; left: number; top: number }[] = [];
    for (let tx = x0; tx <= x1; tx++) {
      for (let ty = y0; ty <= y1; ty++) {
        out.push({
          key: `${z}-${tx}-${ty}`,
          uri: `https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`,
          left: tx * TILE - (c.x - size.w / 2),
          top: ty * TILE - (c.y - size.h / 2),
        });
      }
    }
    return out;
  }, [size, c.x, c.y, z]);

  const place = (lat: number, lng: number) => {
    const p = project(lat, lng, z);
    return { left: p.x - (c.x - size.w / 2), top: p.y - (c.y - size.h / 2) };
  };

  const metersPerPx = (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / 2 ** z;
  const radiusPx = (radiusKm * 1000) / metersPerPx;
  const me = place(center.lat, center.lng);

  return (
    <View
      style={{ flex: 1, overflow: 'hidden', backgroundColor: dark ? '#1b1a1d' : '#ece8ef' }}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {tiles.map((tile) => (
        <Image
          key={tile.key}
          source={{ uri: tile.uri }}
          style={{ position: 'absolute', left: tile.left, top: tile.top, width: TILE, height: TILE }}
          transition={150}
        />
      ))}

      {dark ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(18,16,19,0.55)' }} />
      ) : null}

      {size.w ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: me.left - radiusPx,
            top: me.top - radiusPx,
            width: radiusPx * 2,
            height: radiusPx * 2,
            borderRadius: 9999,
            borderWidth: 1.5,
            borderColor: 'rgba(226,169,241,0.7)',
            backgroundColor: 'rgba(226,169,241,0.08)',
          }}
        />
      ) : null}

      {showMe && size.w ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: me.left - 9,
            top: me.top - 9,
            width: 18,
            height: 18,
            borderRadius: 99,
            backgroundColor: '#5B8CFF',
            borderWidth: 3,
            borderColor: '#fff',
          }}
        />
      ) : null}

      {size.w
        ? pins.map((p) => {
            const on = p.id === selected;
            const d = on ? 60 : 46;
            const pos = place(p.lat, p.lng);
            return (
              <Pressable
                key={p.id}
                onPress={() => onPin(p.id)}
                accessibilityRole="button"
                style={{
                  position: 'absolute',
                  left: pos.left - d / 2,
                  top: pos.top - d / 2,
                  width: d,
                  height: d,
                  borderRadius: 99,
                  padding: 3,
                  backgroundColor: on ? BRAND_LAVENDER : '#F7F2F8',
                  zIndex: on ? 2 : 1,
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 3 },
                }}
              >
                <Image source={{ uri: p.image }} style={{ flex: 1, borderRadius: 99 }} contentFit="cover" />
              </Pressable>
            );
          })
        : null}

      <View style={{ position: 'absolute', right: 12, bottom: 190, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(20,16,22,0.85)' }}>
        {[
          ['+', 1],
          ['−', -1],
        ].map(([label, step]) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={step === 1 ? 'Zoom avant' : 'Zoom arrière'}
            onPress={() => setDz((v) => Math.max(-2, Math.min(3, v + (step as number))))}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt size={20} weight="bold" color="#F7F2F8">
              {label}
            </Txt>
          </Pressable>
        ))}
      </View>

      <View style={{ position: 'absolute', left: 8, bottom: 150 }} pointerEvents="none">
        <Txt size={9} color={dark ? 'rgba(247,242,248,0.6)' : 'rgba(26,20,32,0.6)'}>
          © OpenStreetMap
        </Txt>
      </View>
    </View>
  );
}
