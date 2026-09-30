/** The post screen, member profiles and boards. */
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListings } from '../data/listings';
import { useMember, useSocial, type Board } from '../data/social';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { ChevronLeft, GridIcon } from '../ui/icons';
import { Display, Header, Screen, Txt } from '../ui/kit';
import { Avatar, FadeIn, PressScale, tap } from '../ui/motion';
import { PostCard } from '../ui/PostCard';
import { ProfileView } from '../ui/ProfileView';

function FloatingBack({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  return (
    <PressScale
      onPress={onPress}
      accessibilityLabel={t('common.back')}
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 12,
        width: 40,
        height: 40,
        borderRadius: 99,
        backgroundColor: 'rgba(12,10,13,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(247,242,248,0.16)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ChevronLeft />
    </PressScale>
  );
}

// ─── Post ─────────────────────────────────────────────────────

export function PostScreen() {
  const { state, go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const social = useSocial();
  const post = social.postById(state.activePostId);
  const [height, setHeight] = useState(0);

  if (!post) {
    return (
      <Screen>
        <Header title="" onBack={() => go('discover')} />
        <Txt color={c.ink2} style={{ marginTop: 20 }}>
          {t('post.notFound')}
        </Txt>
      </Screen>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#0C0A0D' }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height ? <PostCard post={post} height={height} /> : null}
      <FloatingBack onPress={() => go('discover')} />
    </View>
  );
}

// ─── Profile ──────────────────────────────────────────────────

export function UserProfile() {
  const { state, go } = useStore();
  const social = useSocial();
  return <ProfileView memberId={state.profileId ?? social.meId} onBack={() => go('feed')} />;
}

// ─── Boards ───────────────────────────────────────────────────

function useBoardCovers(board: Board) {
  const social = useSocial();
  const { byId } = useListings();
  return board.items
    .slice(0, 3)
    .map((i) => (i.kind === 'post' ? social.postById(i.id)?.media[0] : byId(i.id)?.photos[0]))
    .filter((u): u is string => !!u);
}

function BoardCard({ board, width, delay }: { board: Board; width: number; delay: number }) {
  const { set } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const covers = useBoardCovers(board);
  return (
    <FadeIn delay={delay}>
      <PressScale onPress={() => set({ screen: 'board', board: board.id })} scaleTo={0.97} style={{ width }}>
        <View style={{ height: width * 0.9, borderRadius: 20, overflow: 'hidden', flexDirection: 'row', gap: 2, backgroundColor: c.surf2 }}>
          <View style={{ flex: 2 }}>
            {covers[0] ? <Image source={{ uri: covers[0] }} style={{ flex: 1 }} contentFit="cover" /> : null}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flex: 1, backgroundColor: c.surf }}>
              {covers[1] ? <Image source={{ uri: covers[1] }} style={{ flex: 1 }} contentFit="cover" /> : null}
            </View>
            <View style={{ flex: 1, backgroundColor: c.surf }}>
              {covers[2] ? <Image source={{ uri: covers[2] }} style={{ flex: 1 }} contentFit="cover" /> : null}
            </View>
          </View>
        </View>
        <Txt size={15} weight="bold" style={{ marginTop: 8 }} numberOfLines={1}>
          {board.name}
        </Txt>
        <Txt size={12} color={c.ink3}>
          {board.items.length} {t('save.items')} · {board.isPrivate ? t('save.private') : t('save.public')}
        </Txt>
      </PressScale>
    </FadeIn>
  );
}

export function Boards() {
  const { state, set, go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { width } = useWindowDimensions();
  const social = useSocial();
  const { byId } = useListings();
  const colW = (Math.min(width, 720) - 36 - 12) / 2;
  const board = state.screen === 'board' ? social.boards.find((b) => b.id === state.board) ?? null : null;

  if (board) {
    return (
      <Screen>
        <Header title={board.name} onBack={() => set({ screen: 'boards', board: null })} />
        {board.items.length === 0 ? (
          <Txt color={c.ink3} style={{ marginTop: 20 }}>
            {t('boards.boardEmpty')}
          </Txt>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
            {board.items.map((item, i) => {
              const post = item.kind === 'post' ? social.postById(item.id) : null;
              const listing = item.kind === 'listing' ? byId(item.id) : null;
              const uri = post?.media[0] ?? listing?.photos[0];
              if (!uri) return null;
              return (
                <FadeIn key={`${item.kind}-${item.id}`} delay={Math.min(i, 8) * 40}>
                  <PressScale
                    scaleTo={0.97}
                    onPress={() =>
                      post ? set({ screen: 'post', activePostId: post.id }) : set({ screen: 'detail', activeId: item.id })
                    }
                    onLongPress={() => {
                      tap('medium');
                      social.removeFrom(board.id, item);
                    }}
                    style={{ width: colW }}
                  >
                    <View style={{ height: colW * (i % 3 === 0 ? 1.5 : 1.25), borderRadius: 18, overflow: 'hidden', backgroundColor: c.surf2 }}>
                      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    </View>
                    <Txt size={12} weight="semi" numberOfLines={1} style={{ marginTop: 5 }}>
                      {post ? `@${post.author.username}` : listing?.title}
                    </Txt>
                  </PressScale>
                </FadeIn>
              );
            })}
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={t('boards.title')} onBack={() => go('discover')} />
      {social.boards.length === 0 ? (
        <View style={{ marginTop: 40, alignItems: 'center', paddingHorizontal: 20 }}>
          <View style={{ width: 70, height: 70, borderRadius: 22, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <GridIcon size={28} color={c.accent} />
          </View>
          <Display size={26} style={{ marginTop: 16 }}>
            {t('boards.empty')}
          </Display>
          <Txt center color={c.ink2} style={{ marginTop: 8 }}>
            {t('boards.emptyBody')}
          </Txt>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
          {social.boards.map((b, i) => (
            <BoardCard key={b.id} board={b} width={colW} delay={i * 60} />
          ))}
        </View>
      )}
    </Screen>
  );
}

/** Tappable member row, used in lists. */
export function MemberRow({ id, username, avatar }: { id: string; username: string; avatar: string | null }) {
  const { set } = useStore();
  return (
    <Pressable onPress={() => set({ screen: 'user', profileId: id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Avatar uri={avatar} size={32} />
      <Txt weight="semi">@{username}</Txt>
    </Pressable>
  );
}

// ─── Blocked members ──────────────────────────────────────────

function BlockedRow({ id, last }: { id: string; last: boolean }) {
  const { c } = useTheme();
  const { t } = useT();
  const social = useSocial();
  const member = useMember(id);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line,
      }}
    >
      <Avatar uri={member?.avatar} size={40} />
      <Txt weight="semi" style={{ flex: 1 }} numberOfLines={1}>
        @{member?.username ?? '…'}
      </Txt>
      <PressScale
        onPress={() => social.unblock(id)}
        style={{ paddingHorizontal: 14, minHeight: 34, borderRadius: 999, backgroundColor: c.surf2, justifyContent: 'center' }}
      >
        <Txt size={14} weight="bold" color={c.accent}>
          {t('profile.unblock')}
        </Txt>
      </PressScale>
    </View>
  );
}

export function Blocked() {
  const { go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const social = useSocial();
  const ids = social.blockedIds;
  return (
    <Screen>
      <Header title={t('set.blocked')} onBack={() => go('settings')} />
      <Txt size={14} color={c.ink2} style={{ marginTop: 10 }}>
        {t('blocked.body')}
      </Txt>
      {ids.length === 0 ? (
        <Txt color={c.ink3} style={{ marginTop: 24 }} center>
          {t('blocked.empty')}
        </Txt>
      ) : (
        <View style={{ marginTop: 16, borderRadius: 20, backgroundColor: c.surf, overflow: 'hidden' }}>
          {ids.map((id, i) => (
            <BlockedRow key={id} id={id} last={i === ids.length - 1} />
          ))}
        </View>
      )}
    </Screen>
  );
}
