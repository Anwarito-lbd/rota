/** The post screen, member profiles and boards. */
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListings } from '../data/listings';
import { useMember, useSocial, type Board } from '../data/social';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import { OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ChevronLeft, DotsIcon, GridIcon, ShieldCheckIcon, TagIcon } from '../ui/icons';
import { Amount, CertifiedMark, Display, GhostButton, Header, PrimaryButton, Screen, Txt } from '../ui/kit';
import { Avatar, FadeIn, IdBadge, Pop, PressScale, Segmented, Skeleton, compact, tap } from '../ui/motion';
import { MessageButton } from '../ui/MessageButton';
import { PostCard } from '../ui/PostCard';

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
  const { state, set, go, m } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const social = useSocial();
  const { listings } = useListings();
  const memberId = state.profileId ?? social.meId;
  const member = useMember(memberId);
  const [tab, setTab] = useState<'fits' | 'pieces'>('fits');
  const me = memberId === social.meId;
  const blocked = memberId ? social.isBlocked(memberId) : false;
  const following = memberId ? social.isFollowing(memberId) : false;
  const posts = social.posts.filter((p) => p.authorId === memberId);
  const pieces = listings.filter((l) => l.ownerId === memberId);
  const cell = (Math.min(width, 720) - 36 - 8) / 3;

  return (
    <Screen padded={false} bottomInset={40}>
      <View style={{ paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressScale onPress={() => go('feed')} accessibilityLabel={t('common.back')} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <ChevronLeft color={c.ink} />
        </PressScale>
        {!me && memberId ? (
          <PressScale
            accessibilityLabel={t('post.more')}
            onPress={() => set({ socialReport: { kind: 'member', id: memberId, memberId } })}
            style={{ width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <DotsIcon color={c.ink} />
          </PressScale>
        ) : null}
      </View>

      {!member ? (
        <View style={{ padding: 18, gap: 12 }}>
          <Skeleton height={86} radius={99} style={{ width: 86 }} />
          <Skeleton height={20} style={{ width: 160 }} />
          <Skeleton height={14} style={{ width: 220 }} />
        </View>
      ) : (
        <FadeIn style={{ paddingHorizontal: 18, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar uri={member.avatar} size={86} ring />
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
              {[
                [compact(posts.length, lang), t('profile.fits')],
                [compact(member.followers, lang), t('profile.followers')],
                [compact(member.following, lang), t('profile.following')],
              ].map(([n, label], i) => (
                <Pressable
                  key={label}
                  disabled={i === 0 || !memberId}
                  onPress={() => memberId && set({ screen: 'follows', followList: { memberId, kind: i === 1 ? 'followers' : 'following' } })}
                  style={{ alignItems: 'center' }}
                >
                  <Txt size={18} weight="bold">
                    {n}
                  </Txt>
                  <Txt size={12} color={c.ink3}>
                    {label}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            <Display size={26}>@{member.username}</Display>
            {member.certified ? <CertifiedMark size={18} /> : null}
          </View>
          {member.identityVerified || (me && social.identity === 'verified') ? (
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              <IdBadge label={t('verify.badge')} />
            </View>
          ) : null}
          {member.bio ? (
            <Txt size={14} color={c.ink2} style={{ marginTop: 8 }}>
              {member.bio}
            </Txt>
          ) : null}

          {me ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              {social.identity !== 'verified' ? (
                <PrimaryButton label={t('verify.gateCta')} onPress={() => set({ screen: 'verify', afterVerify: 'user' })} style={{ flex: 1, minHeight: 46 }} />
              ) : null}
              <GhostButton label={t('boards.title')} onPress={() => set({ screen: 'boards', board: null })} style={{ flex: 1, minHeight: 46 }} />
            </View>
          ) : blocked ? (
            <View style={{ marginTop: 16, gap: 10 }}>
              <Txt size={14} color={c.ink2}>
                {t('profile.blocked')}
              </Txt>
              <GhostButton label={t('profile.unblock')} onPress={() => memberId && social.unblock(memberId)} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <PressScale
                haptic="medium"
                onPress={() => memberId && social.toggleFollow(memberId)}
                style={{
                  flex: 1,
                  minHeight: 46,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: following ? c.surf2 : c.accent,
                }}
              >
                <Pop active={following}>
                  <Txt size={15} weight="bold" color={following ? c.ink : c.onAccent}>
                    {following ? t('post.following') : t('post.follow')}
                  </Txt>
                </Pop>
              </PressScale>
              {memberId ? <MessageButton memberId={memberId} style={{ flex: 1 }} /> : null}
            </View>
          )}
        </FadeIn>
      )}

      {!blocked ? (
        <>
          <View style={{ marginTop: 22 }}>
            <Segmented
              items={[
                { key: 'fits', label: `${t('profile.fits')} · ${posts.length}` },
                { key: 'pieces', label: `${t('profile.pieces')} · ${pieces.length}` },
              ]}
              value={tab}
              onChange={setTab}
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 18, marginTop: 14 }}>
            {tab === 'fits'
              ? posts.map((p, i) => (
                  <FadeIn key={p.id} delay={Math.min(i, 9) * 35}>
                    <PressScale onPress={() => set({ screen: 'post', activePostId: p.id })} scaleTo={0.96}>
                      <View style={{ width: cell, height: cell * 1.35, borderRadius: 10, overflow: 'hidden', backgroundColor: c.surf2 }}>
                        <Image source={{ uri: p.media[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        {p.distribution === 'pending' ? (
                          <View style={{ position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: c.plum }}>
                            <Txt size={9} weight="bold" color={c.onplum}>
                              {t('post.pending')}
                            </Txt>
                          </View>
                        ) : null}
                        {p.tags.length ? (
                          <View style={{ position: 'absolute', top: 5, right: 5 }}>
                            <TagIcon size={13} color={OVER_INK} />
                          </View>
                        ) : null}
                      </View>
                    </PressScale>
                  </FadeIn>
                ))
              : pieces.map((l, i) => (
                  <FadeIn key={l.id} delay={Math.min(i, 9) * 35}>
                    <PressScale onPress={() => set({ screen: 'detail', activeId: l.id })} scaleTo={0.96} style={{ width: cell }}>
                      <View style={{ width: cell, height: cell * 1.35, borderRadius: 10, overflow: 'hidden', backgroundColor: c.surf2 }}>
                        <Image source={{ uri: l.photos[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      </View>
                      <Amount size={12} color={c.accent} style={{ marginTop: 3 }}>
                        {m(l.price)}
                      </Amount>
                    </PressScale>
                  </FadeIn>
                ))}
          </View>
          {(tab === 'fits' ? posts.length : pieces.length) === 0 ? (
            <Txt center color={c.ink3} style={{ marginTop: 24 }}>
              {t('profile.empty')}
            </Txt>
          ) : null}
        </>
      ) : null}
      {me && social.identity === 'verified' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 20 }}>
          <ShieldCheckIcon size={14} color={c.accent} />
          <Txt size={12} color={c.ink3}>
            {t('verify.doneBody')}
          </Txt>
        </View>
      ) : null}
      <View style={{ height: insets.bottom }} />
    </Screen>
  );
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
