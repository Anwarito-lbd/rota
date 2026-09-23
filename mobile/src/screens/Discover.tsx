import { ActivityIndicator, Pressable, View } from 'react-native';
import { useListings } from '../data/listings';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { SearchIcon } from '../ui/icons';
import { Amount, Display, PrimaryButton, Screen, Txt } from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';

export function Discover() {
  const { set, go, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { listings, loading } = useListings();

  return (
    <Screen>
      <Display size={34}>{t('discover.title')}</Display>

      <View
        style={{
          marginTop: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          minHeight: 46,
          paddingHorizontal: 14,
          borderRadius: 14,
          backgroundColor: c.surf2,
        }}
      >
        <SearchIcon color={c.ink3} />
        <Txt color={c.ink3}>Chercher une pièce, une marque, une taille</Txt>
      </View>

      {loading ? (
        <ActivityIndicator color={c.clay} style={{ marginTop: 40 }} />
      ) : listings.length === 0 ? (
        <View style={{ marginTop: 60, alignItems: 'center', paddingHorizontal: 20 }}>
          <Display size={28} style={{ textAlign: 'center' }}>
            {t('discover.empty')}
          </Display>
          <Txt size={14} center color={c.ink2} style={{ marginTop: 10 }}>
            {t('discover.emptyBody')}
          </Txt>
          <PrimaryButton
            label={t('feed.emptyCta')}
            onPress={() => go('list')}
            style={{ marginTop: 22, alignSelf: 'stretch' }}
          />
        </View>
      ) : (
        <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {listings.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => set({ screen: 'detail', activeId: item.id })}
              style={{ width: '48%' }}
            >
              <View style={{ height: 210, borderRadius: 16, overflow: 'hidden', backgroundColor: c.surf2 }}>
                <MediaSlot
                  id={`discover-${item.id}`}
                  shape="rounded"
                  radius={16}
                  remoteUri={item.photos[0] ?? item.video ?? undefined}
                  placeholder={item.title}
                />
              </View>
              <Txt size={14} weight="semi" numberOfLines={1} style={{ marginTop: 7 }}>
                {item.title}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Amount size={13} color={c.clay}>
                  {m(item.price)}
                </Amount>
                <Txt size={12} color={c.ink3}>
                  {t('common.perDay')}
                </Txt>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
