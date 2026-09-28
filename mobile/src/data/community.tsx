/**
 * The social extras: who follows whom (lists), activity (likes, comments,
 * replies, reposts, new followers), reposts, 24-hour stories, and Rota Pro
 * (virtual try-on, outfit planner, boosted posts) with pay-per-try credits.
 *
 * Demo mode keeps everything in memory. With Supabase it uses migration 018.
 * Pro and try-on credits are digital purchases: on iOS and Android they must
 * go through the App Store / Google Play in-app purchase (Apple 3.1.1), so
 * outside demo mode `subscribe` and `buyTryOn` refuse until that is wired.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { DEMO_ME, DEMO_MEMBERS, DEMO_POSTS } from './demo';
import { useSocial } from './social';

export interface Person {
  id: string;
  username: string;
  avatar: string | null;
  verified: boolean;
}

export type ActivityKind = 'like' | 'comment' | 'reply' | 'repost' | 'follow';

export interface Activity {
  id: string;
  kind: ActivityKind;
  actor: Person;
  postId: string | null;
  media: string | null;
  body: string | null;
  createdAt: string;
}

export interface Story {
  id: string;
  author: Person;
  media: string;
  caption: string | null;
  createdAt: string;
}

export const PRO_PRICE_EUR = 5.99;
export const TRYON_PRICE_EUR = 0.99;

interface CommunityValue {
  isReposted: (postId: string) => boolean;
  toggleRepost: (postId: string) => Promise<void>;
  /** Posts reposted by people I follow: post id → who reposted it. */
  repostedBy: Record<string, Person>;

  stories: Story[];
  /** Members with a live story, me first. */
  storyAuthors: Person[];
  seenStories: string[];
  markSeen: (storyId: string) => void;
  postStory: (uri: string, caption?: string) => Promise<void>;

  pro: boolean;
  tryOnCredits: number;
  subscribe: () => Promise<void>;
  cancelPro: () => void;
  buyTryOn: (count?: number) => Promise<void>;
  /** Uses one try-on: free with Pro, otherwise one credit. False when none left. */
  consumeTryOn: () => boolean;
}

const Ctx = createContext<CommunityValue | null>(null);

const person = (id: string): Person => {
  if (id === DEMO_ME.id) return { id, username: DEMO_ME.username, avatar: DEMO_ME.avatar, verified: false };
  const m = DEMO_MEMBERS.find((x) => x.id === id);
  return { id, username: m?.username ?? 'membre', avatar: m?.avatar ?? null, verified: !!m?.identityVerified };
};

const ago = (minutes: number) => new Date(Date.now() - minutes * 6e4).toISOString();

/** A few stories from members, taken from the demo posts' photos. */
function demoStories(): Story[] {
  return DEMO_MEMBERS.slice(0, 6).flatMap((m, i) => {
    const photos = DEMO_POSTS.filter((p) => p.authorId === m.id).flatMap((p) => p.photos);
    const pool = photos.length ? photos : DEMO_POSTS[i % DEMO_POSTS.length].photos;
    return pool.slice(0, i % 2 === 0 ? 2 : 1).map((uri, j) => ({
      id: `story-${m.id}-${j}`,
      author: person(m.id),
      media: uri,
      caption: null,
      createdAt: ago(30 + i * 70 + j * 5),
    }));
  });
}

export class PurchaseUnavailable extends Error {
  constructor() {
    super('iap_unavailable');
  }
}

export function CommunityProvider({ children }: { children: ReactNode }) {
  const social = useSocial();
  const demo = social.demo;
  const meId = social.meId;

  const [reposted, setReposted] = useState<string[]>([]);
  const [repostedBy, setRepostedBy] = useState<Record<string, Person>>({});
  const [stories, setStories] = useState<Story[]>(demo ? demoStories() : []);
  const [seenStories, setSeen] = useState<string[]>([]);
  const [pro, setPro] = useState(false);
  const [tryOnCredits, setCredits] = useState(0);

  // Reposts by the people I follow, shown in "Suivis" with a label.
  useEffect(() => {
    if (demo) {
      const following = social.followingIds;
      const map: Record<string, Person> = {};
      DEMO_POSTS.filter((p) => !following.includes(p.authorId))
        .slice(0, 2)
        .forEach((p, i) => {
          const by = following[i % Math.max(following.length, 1)];
          if (by) map[p.id] = person(by);
        });
      setRepostedBy(map);
      return;
    }
    if (!supabase || !meId || social.followingIds.length === 0) return;
    supabase
      .from('reposts')
      .select('post_id, user_id, profile:profiles!reposts_user_id_fkey(username, avatar_url, identity_status)')
      .in('user_id', social.followingIds)
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        const map: Record<string, Person> = {};
        for (const r of (data ?? []) as unknown as { post_id: string; user_id: string; profile: { username: string; avatar_url: string | null; identity_status: string } | null }[]) {
          if (!map[r.post_id]) {
            map[r.post_id] = { id: r.user_id, username: r.profile?.username ?? 'membre', avatar: r.profile?.avatar_url ?? null, verified: r.profile?.identity_status === 'verified' };
          }
        }
        setRepostedBy(map);
      });
    supabase
      .from('reposts')
      .select('post_id')
      .eq('user_id', meId)
      .then(({ data }) => setReposted(((data ?? []) as { post_id: string }[]).map((r) => r.post_id)));
  }, [demo, meId, social.followingIds]);

  // Live stories from the people I follow (RLS filters them).
  useEffect(() => {
    if (demo || !supabase || !meId) return;
    supabase
      .from('stories')
      .select('id, author_id, media_path, caption, created_at, author:profiles!stories_author_id_fkey(username, avatar_url, identity_status)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const db = supabase!;
        setStories(
          ((data ?? []) as unknown as { id: string; author_id: string; media_path: string; caption: string | null; created_at: string; author: { username: string; avatar_url: string | null; identity_status: string } | null }[]).map((s) => ({
            id: s.id,
            author: { id: s.author_id, username: s.author?.username ?? 'membre', avatar: s.author?.avatar_url ?? null, verified: s.author?.identity_status === 'verified' },
            media: s.media_path.startsWith('http') ? s.media_path : db.storage.from('post-media').getPublicUrl(s.media_path).data.publicUrl,
            caption: s.caption,
            createdAt: s.created_at,
          })),
        );
      });
  }, [demo, meId]);

  const toggleRepost = useCallback(
    async (postId: string) => {
      const on = reposted.includes(postId);
      setReposted((r) => (on ? r.filter((x) => x !== postId) : [...r, postId]));
      if (demo || !supabase || !meId) return;
      const { error } = on
        ? await supabase.from('reposts').delete().eq('post_id', postId).eq('user_id', meId)
        : await supabase.from('reposts').insert({ post_id: postId });
      if (error) setReposted((r) => (on ? [...r, postId] : r.filter((x) => x !== postId)));
    },
    [demo, meId, reposted],
  );

  const postStory = useCallback(
    async (uri: string, caption?: string) => {
      const me = person(DEMO_ME.id);
      if (demo || !supabase || !meId) {
        setStories((s) => [{ id: `story-me-${Date.now()}`, author: { ...me, id: meId ?? me.id }, media: uri, caption: caption ?? null, createdAt: new Date().toISOString() }, ...s]);
        return;
      }
      const { uploadMedia } = await import('../lib/upload');
      const path = await uploadMedia('post-media', meId, { uri, kind: 'image', name: 'story.jpg', source: 'camera' });
      const { error } = await supabase.from('stories').insert({ media_path: path, caption: caption ?? null });
      if (error) throw new Error(error.message);
      setStories((s) => [
        { id: `story-me-${Date.now()}`, author: { id: meId, username: 'moi', avatar: null, verified: false }, media: uri, caption: caption ?? null, createdAt: new Date().toISOString() },
        ...s,
      ]);
    },
    [demo, meId],
  );

  const subscribe = useCallback(async () => {
    if (!demo) throw new PurchaseUnavailable();
    setPro(true);
  }, [demo]);

  const buyTryOn = useCallback(
    async (count = 1) => {
      if (!demo) throw new PurchaseUnavailable();
      setCredits((n) => n + count);
    },
    [demo],
  );

  const consumeTryOn = useCallback(() => {
    if (pro) return true;
    if (tryOnCredits > 0) {
      setCredits((n) => n - 1);
      return true;
    }
    return false;
  }, [pro, tryOnCredits]);

  const storyAuthors = useMemo(() => {
    const seen = new Set<string>();
    const list: Person[] = [];
    const mine = stories.filter((s) => s.author.id === meId);
    if (mine[0]) {
      seen.add(mine[0].author.id);
      list.push(mine[0].author);
    }
    for (const s of stories) {
      if (seen.has(s.author.id) || social.isBlocked(s.author.id)) continue;
      seen.add(s.author.id);
      list.push(s.author);
    }
    return list;
  }, [stories, meId, social]);

  const value: CommunityValue = {
    isReposted: (id) => reposted.includes(id),
    toggleRepost,
    repostedBy,
    stories: stories.filter((s) => !social.isBlocked(s.author.id)),
    storyAuthors,
    seenStories,
    markSeen: (id) => setSeen((s) => (s.includes(id) ? s : [...s, id])),
    postStory,
    pro,
    tryOnCredits,
    subscribe,
    cancelPro: () => setPro(false),
    buyTryOn,
    consumeTryOn,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCommunity(): CommunityValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCommunity outside CommunityProvider');
  return v;
}

/** Followers or following of a member. */
export function useFollowList(memberId: string | null, kind: 'followers' | 'following') {
  const social = useSocial();
  const [people, setPeople] = useState<Person[] | null>(null);

  useEffect(() => {
    if (!memberId) return;
    if (social.demo || !supabase) {
      const others = DEMO_MEMBERS.filter((m) => m.id !== memberId);
      const ids =
        memberId === social.meId
          ? kind === 'following'
            ? social.followingIds
            : others.slice(0, 6).map((m) => m.id)
          : kind === 'following'
            ? others.slice(2, 8).map((m) => m.id)
            : [...(social.followingIds.includes(memberId) ? [DEMO_ME.id] : []), ...others.slice(0, 7).map((m) => m.id)];
      setPeople(ids.filter((id) => !social.isBlocked(id)).map(person));
      return;
    }
    let cancelled = false;
    const [col, other] = kind === 'followers' ? ['followee_id', 'follower_id'] : ['follower_id', 'followee_id'];
    supabase
      .from('follows')
      .select(`${other}, profile:profiles!follows_${other}_fkey(id, username, avatar_url, identity_status)`)
      .eq(col, memberId)
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => {
        if (cancelled) return;
        setPeople(
          ((data ?? []) as unknown as { profile: { id: string; username: string; avatar_url: string | null; identity_status: string } | null }[])
            .map((r) => r.profile)
            .filter((p): p is NonNullable<typeof p> => !!p && !social.isBlocked(p.id))
            .map((p) => ({ id: p.id, username: p.username, avatar: p.avatar_url, verified: p.identity_status === 'verified' })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [memberId, kind, social]);

  return people;
}

/** What happened around me: likes, comments, replies, reposts, new followers. */
export function useActivity() {
  const social = useSocial();
  const [items, setItems] = useState<Activity[] | null>(null);

  useEffect(() => {
    if (social.demo || !supabase) {
      const posts = DEMO_POSTS.slice(0, 4);
      const kinds: ActivityKind[] = ['like', 'follow', 'comment', 'like', 'repost', 'reply', 'follow', 'like', 'comment', 'like'];
      const bodies = ['La coupe est parfaite', 'Tu la reprends quand ?', 'Le satin rend trop bien'];
      setItems(
        kinds.map((kind, i) => {
          const m = DEMO_MEMBERS[i % DEMO_MEMBERS.length];
          const p = posts[i % posts.length];
          return {
            id: `act-${i}`,
            kind,
            actor: person(m.id),
            postId: kind === 'follow' ? null : p.id,
            media: kind === 'follow' ? null : p.photos[0],
            body: kind === 'comment' || kind === 'reply' ? bodies[i % bodies.length] : null,
            createdAt: ago(8 + i * 47),
          };
        }),
      );
      return;
    }
    let cancelled = false;
    supabase.rpc('my_activity', { p_limit: 80 }).then(({ data }) => {
      if (cancelled) return;
      const db = supabase!;
      setItems(
        ((data ?? []) as { kind: ActivityKind; actor_id: string; actor_username: string; actor_avatar: string | null; post_id: string | null; media: string | null; body: string | null; created_at: string }[]).map((r, i) => ({
          id: `${r.kind}-${r.actor_id}-${r.post_id ?? ''}-${i}`,
          kind: r.kind,
          actor: { id: r.actor_id, username: r.actor_username, avatar: r.actor_avatar, verified: false },
          postId: r.post_id,
          media: r.media ? (r.media.startsWith('http') ? r.media : db.storage.from('post-media').getPublicUrl(r.media).data.publicUrl) : null,
          body: r.body,
          createdAt: r.created_at,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [social.demo]);

  return items;
}
