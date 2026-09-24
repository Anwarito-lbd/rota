import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListings, type Listing } from '../data/listings';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import { OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { BookmarkIcon, DotsIcon, HeartIcon, PersonPlusIcon } from '../ui/icons';
import { CertifiedMark, Display, PrimaryButton, Txt } from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';

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

function EmptyFeed({ onList }: { onList: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: c.line2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PersonPlusIcon color={c.ink3} />
      </View>
      <Display size={30} style={{ marginTop: 20, textAlign: 'center' }}>
        {t('feed.emptyTitle')}
      </Display>
      <Txt size={14} center color={c.ink2} style={{ marginTop: 10 }}>
        {t('feed.emptyBody')}
      </Txt>
      <PrimaryButton label={t('feed.emptyCta')} onPress={onList} style={{ marginTop: 22, alignSelf: 'stretch' }} />
    </View>
  );
}

function FeedCard({ item, height }: { item: Listing; height: number }) {
  const { state, set, toggleFlag, m } = useStore();
  const { t } = useT();
  const liked = !!state.liked[item.id];
  const wished = !!state.wish[item.id];

  return (
    <View style={{ height, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <MediaSlot
          id={`feed-${item.id}`}
          shape="rect"
          tone="media"
          remoteUri={item.video ?? item.photos[0] ?? undefined}
          placeholder={item.title}
        />
      </View>
      <LinearGradient
        colors={['rgba(12,10,13,0.62)', 'rgba(12,10,13,0)', 'rgba(12,10,13,0)', 'rgba(12,10,13,0.92)']}
        locations={[0, 0.26, 0.44, 0.92]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />

      <View style={{ position: 'absolute', right: 10, bottom: 190, alignItems: 'center', gap: 14 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.owner.username}
          onPress={() => set({ screen: 'profile', activeId: item.id })}
          style={{ width: 52, height: 52, borderRadius: 999, padding: 2, backgroundColor: '#E2A9F1' }}
        >
          <View style={{ flex: 1, borderRadius: 999, overflow: 'hidden', borderWidth: 2, borderColor: '#0C0A0D' }}>
            <MediaSlot id={`av-${item.id}`} shape="circle" tone="media" remoteUri={item.owner.avatar ?? undefined} />
          </View>
        </Pressable>

        <RailAction onPress={() => toggleFlag('liked', item.id)} label="J'aime">
          <HeartIcon fill={liked ? '#E2A9F1' : 'none'} color={liked ? '#E2A9F1' : OVER_INK} />
        </RailAction>

        <RailAction onPress={() => toggleFlag('wish', item.id)} label="Enregistrer">
          <BookmarkIcon fill={wished ? OVER_INK : 'none'} />
        </RailAction>

        <RailAction onPress={() => set({ report: true, reportSent: false, activeId: item.id })} label="Signaler">
          <DotsIcon />
        </RailAction>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {item.occasion ? (
            <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: '#E2A9F1' }}>
              <Txt size={11} weight="bold" upper color="#2A1033">
                {item.occasion}
              </Txt>
            </View>
          ) : null}
          {item.authenticity === 'verified' ? (
            <View
              style={{
                paddingHorizontal: 9,
                paddingVertical: 5,
                borderRadius: 7,
                borderWidth: 1,
                borderColor: 'rgba(247,242,248,0.55)',
              }}
            >
              <Txt size={11} weight="bold" upper color={OVER_INK}>
                Authenticité vérifiée
              </Txt>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => set({ screen: 'profile', activeId: item.id })}
          style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Txt size={15} weight="semi" color={OVER_INK}>
            @{item.owner.username}
          </Txt>
          {item.owner.certified ? <CertifiedMark size={16} /> : null}
        </Pressable>

        <Display size={31} color={OVER_INK} style={{ marginTop: 5 }}>
          {item.title}
        </Display>
        <Txt size={14} color="rgba(247,242,248,0.75)" style={{ marginTop: 4 }}>
          {[item.brand, item.sizes.join(' · '), item.city].filter(Boolean).join(' · ')}
        </Txt>

        <PrimaryButton
          label={`${t('feed.rent')} · ${m(item.price)} ${t('common.perDay')}`}
          onPress={() => set({ screen: 'detail', activeId: item.id })}
          style={{ marginTop: 14, minHeight: 52, backgroundColor: '#E2A9F1' }}
        />
      </View>
    </View>
  );
}

export function Feed() {
  const { go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const { listings, loading, error, refresh } = useListings();

  return (
    <View style={{ flex: 1, backgroundColor: c.sink }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Txt center color={c.ink2}>
            {t('feed.error')}
          </Txt>
          <PrimaryButton label={t('common.retry')} onPress={refresh} style={{ marginTop: 16, alignSelf: 'stretch' }} />
        </View>
      ) : listings.length === 0 ? (
        <EmptyFeed onList={() => go('list')} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height || undefined}
          decelerationRate="fast"
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={c.ink3} />}
          renderItem={({ item }) => <FeedCard item={item} height={height || 600} />}
        />
      )}

      {listings.length > 0 ? (
        <View style={{ position: 'absolute', top: insets.top + 6, left: 0, right: 0, alignItems: 'center' }}>
          <Txt size={15} weight="bold" color={OVER_INK}>
            Rota
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
