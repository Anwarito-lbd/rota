import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pieces } from '../data/catalog';
import { useStore } from '../state/store';
import type { FeedTab } from '../state/types';
import { OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { BookmarkIcon, DotsIcon, HeartIcon, PersonPlusIcon, StarIcon } from '../ui/icons';
import { Display, PrimaryButton, Txt } from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';

const TABS: [FeedTab, string][] = [
  ['near', 'Près de moi'],
  ['foryou', 'Pour vous'],
  ['follow', 'Suivis'],
];

function RailAction({
  onPress,
  label,
  caption,
  children,
}: {
  onPress: () => void;
  label: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 3 }}
    >
      {children}
      {caption ? (
        <Txt size={12} weight="semi" color={OVER_INK}>
          {caption}
        </Txt>
      ) : null}
    </Pressable>
  );
}

export function Feed() {
  const { state, set, config, toggleFlag, m, go } = useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);

  const source =
    state.feedTab === 'follow'
      ? pieces.filter((p) => state.follow && p.id === 'f3')
      : state.feedTab === 'near'
        ? pieces.filter((p) => p.city.startsWith('Paris'))
        : pieces;

  return (
    <View style={{ flex: 1, backgroundColor: c.sink }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {source.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: 'rgba(246,241,233,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PersonPlusIcon />
          </View>
          <Display size={28} color={OVER_INK} style={{ marginTop: 20, textAlign: 'center' }}>
            {state.feedTab === 'follow' ? 'Rien à charger ici' : 'Aucune pièce près de vous'}
          </Display>
          <Txt size={14} center color="#B9B0A6" style={{ marginTop: 10 }}>
            {state.feedTab === 'follow'
              ? 'Vous ne suivez encore personne. Suivez des dressings et leurs nouvelles pièces apparaîtront ici.'
              : 'Aucune pièce disponible dans votre rayon. Élargissez la zone ou explorez la livraison.'}
          </Txt>
          <PrimaryButton
            label={state.feedTab === 'follow' ? 'Découvrir des dressings' : 'Explorer la livraison'}
            onPress={() => go('discover')}
            style={{ marginTop: 22, paddingHorizontal: 22 }}
          />
          <Pressable onPress={() => set({ feedTab: 'foryou' })} style={{ minHeight: 44, justifyContent: 'center', marginTop: 8 }}>
            <Txt size={14} weight="semi" color={OVER_INK}>
              Revenir à « Pour vous »
            </Txt>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={source}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height || undefined}
          decelerationRate="fast"
          renderItem={({ item }) => {
            const liked = !!state.liked[item.id];
            const wished = !!state.wish[item.id];
            return (
              <View style={{ height: height || 600, overflow: 'hidden' }}>
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                  <MediaSlot
                    id={`feed-${item.id}`}
                    shape="rect"
                    tone="media"
                    fallbackId={item.id === 'f1' ? 'list-video' : undefined}
                    placeholder="Vidéo du look"
                  />
                </View>
                <LinearGradient
                  colors={['rgba(12,10,11,0.62)', 'rgba(12,10,11,0)', 'rgba(12,10,11,0)', 'rgba(12,10,11,0.92)']}
                  locations={[0, 0.26, 0.44, 0.92]}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  pointerEvents="none"
                />

                <View style={{ position: 'absolute', right: 10, bottom: 190, alignItems: 'center', gap: 14 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Profil de ${item.name}`}
                    onPress={() => set({ screen: 'profile', activeId: item.id })}
                    style={{ width: 52, height: 52, borderRadius: 999, padding: 2, backgroundColor: '#E8865F' }}
                  >
                    <View style={{ flex: 1, borderRadius: 999, overflow: 'hidden', borderWidth: 2, borderColor: '#0C0A0B' }}>
                      <MediaSlot id={`av-${item.id}`} shape="circle" tone="media" />
                    </View>
                  </Pressable>

                  <RailAction onPress={() => toggleFlag('liked', item.id)} label="J'aime" caption={item.likes}>
                    <HeartIcon fill={liked ? '#E8865F' : 'none'} color={liked ? '#E8865F' : OVER_INK} />
                  </RailAction>

                  <RailAction
                    onPress={() => set({ screen: 'detail', activeId: item.id })}
                    label="Voir les avis"
                    caption={item.rating}
                  >
                    <StarIcon />
                  </RailAction>

                  <RailAction onPress={() => toggleFlag('wish', item.id)} label="Enregistrer" caption="Save">
                    <BookmarkIcon fill={wished ? OVER_INK : 'none'} />
                  </RailAction>

                  <RailAction
                    onPress={() => set({ report: true, reportSent: false, activeId: item.id })}
                    label="Signaler"
                  >
                    <DotsIcon />
                  </RailAction>
                </View>

                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 20 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                    <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: '#E8865F' }}>
                      <Txt size={11} weight="bold" upper color="#1B1009">
                        {item.occasion}
                      </Txt>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 5,
                        borderRadius: 7,
                        borderWidth: 1,
                        borderColor: 'rgba(246,241,233,0.55)',
                      }}
                    >
                      <Txt size={11} weight="bold" upper color={OVER_INK}>
                        {item.badge}
                      </Txt>
                    </View>
                  </View>

                  <Pressable onPress={() => set({ screen: 'profile', activeId: item.id })} style={{ marginTop: 12 }}>
                    <Txt size={15} weight="semi" color={OVER_INK}>
                      @{item.handle} · {item.wornCount}
                    </Txt>
                  </Pressable>

                  <Display size={31} color={OVER_INK} style={{ marginTop: 5 }}>
                    {item.title}
                  </Display>
                  <Txt size={14} color="rgba(246,241,233,0.75)" style={{ marginTop: 4 }}>
                    {item.brand} · taille {item.size} · {item.city}
                  </Txt>

                  <PrimaryButton
                    label={`Louer · ${m(item.price)} / jour`}
                    onPress={() => set({ screen: 'detail', activeId: item.id })}
                    style={{ marginTop: 14, minHeight: 52, backgroundColor: '#E8865F' }}
                  />
                </View>
              </View>
            );
          }}
        />
      )}

      <View
        style={{
          position: 'absolute',
          top: insets.top + 6,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {TABS.map(([key, label]) => {
          const on = state.feedTab === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => set({ feedTab: key })}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: 10,
                borderBottomWidth: 2,
                borderBottomColor: on ? '#E8865F' : 'transparent',
              }}
            >
              <Txt size={15} weight={on ? 'bold' : 'semi'} color={on ? OVER_INK : 'rgba(246,241,233,0.62)'}>
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {config.demoEmptyStates ? (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 56,
            left: 16,
            right: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            borderRadius: 14,
            backgroundColor: 'rgba(12,10,11,0.9)',
            borderWidth: 1,
            borderColor: 'rgba(246,241,233,0.2)',
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: '#D79BB4' }} />
          <Txt size={13} color={OVER_INK} style={{ flex: 1 }}>
            Pas de connexion. Voici vos derniers looks chargés.
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
