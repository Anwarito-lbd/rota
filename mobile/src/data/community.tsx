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

  /** Live stories, blocked members left out. Muted members' stay here so their profile can still open them. */
  stories: Story[];
  /** The tray: members with a live story, me first, without blocked or story-muted members. */
  storyAuthors: Person[];
  seenStories: string[];
  markSeen: (storyId: string) => void;
  postStory: (uri: string, caption?: string) => Promise<void>;

  pro: boolean;
  /**
   * Pro and try-on credits can be bought (demo only until App Store / Play
   * billing is wired). While false, try-on stays open to everyone as before.
   */
  purchasesAvailable: boolean;
  tryOnCredits: number;
  subscribe: () => Promise<void>;
  cancelPro: () => void;
  buyTryOn: (count?: number) => Promise<void>;
  /** Uses one try-on: free with Pro, otherwise one credit. False when none left. */
  consumeTryOn: () => Promise<boolean>;
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

  // Pro and credits for real come from the server (migration 027): only the
  // store webhook writes them, the phone just reads.
  useEffect(() => {
    if (demo || !supabase || !meId) return;
    supabase
      .from('member_entitlements')
      .select('pro_until, tryon_credits')
      .eq('user_id', meId)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { pro_until: string | null; tryon_credits: number } | null;
        setPro(!!row?.pro_until && Date.parse(row.pro_until) > Date.now());
        setCredits(row?.tryon_credits ?? 0);
      });
  }, [demo, meId]);

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
      .select('post_id, user_id, profile:profiles!reposts_user_id_fkey(username, avatar_url, identity_verified)')
      .in('user_id', social.followingIds)
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        const map: Record<string, Person> = {};
        for (const r of (data ?? []) as unknown as { post_id: string; user_id: string; profile: { username: string; avatar_url: string | null; identity_verified: boolean | null } | null }[]) {
          if (!map[r.post_id]) {
            map[r.post_id] = { id: r.user_id, username: r.profile?.username ?? 'membre', avatar: r.profile?.avatar_url ?? null, verified: r.profile?.identity_verified === true };
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

  // Live stories: public to every member (034); RLS drops blocked and deleted ones.
  useEffect(() => {
    if (demo || !supabase || !meId) return;
    supabase
      .from('stories')
      .select('id, author_id, media_path, caption, created_at, author:profiles!stories_author_id_fkey(username, avatar_url, identity_verified)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const db = supabase!;
        setStories(
          ((data ?? []) as unknown as { id: string; author_id: string; media_path: string; caption: string | null; created_at: string; author: { username: string; avatar_url: string | null; identity_verified: boolean | null } | null }[])
            .filter((s) => !/^[a-z]+:/i.test(s.media_path))
            .map((s) => ({
            id: s.id,
            author: { id: s.author_id, username: s.author?.username ?? 'membre', avatar: s.author?.avatar_url ?? null, verified: s.author?.identity_verified === true },
            media: db.storage.from('post-media').getPublicUrl(s.media_path).data.publicUrl,
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

  const consumeTryOn = useCallback(async () => {
    if (!demo && supabase) {
      // The server spends the credit, so two phones can't use the same one.
      const { data } = await supabase.rpc('consume_tryon');
      if (data === true && !pro) setCredits((n) => Math.max(0, n - 1));
      return data === true;
    }
    if (pro) return true;
    if (tryOnCredits > 0) {
      setCredits((n) => n - 1);
      return true;
    }
    return false;
  }, [demo, pro, tryOnCredits]);

  // Blocked members, and members whose stories I muted, stay out of the tray.
  const { isBlocked, mutedStoryIds } = social;
  const hidden = useCallback(
    (id: string) => isBlocked(id) || mutedStoryIds.includes(id),
    [isBlocked, mutedStoryIds],
  );

  const storyAuthors = useMemo(() => {
    const seen = new Set<string>();
    const list: Person[] = [];
    const mine = stories.filter((s) => s.author.id === meId);
    if (mine[0]) {
      seen.add(mine[0].author.id);
      list.push(mine[0].author);
    }
    for (const s of stories) {
      if (seen.has(s.author.id) || hidden(s.author.id)) continue;
      seen.add(s.author.id);
      list.push(s.author);
    }
    return list;
  }, [stories, meId, hidden]);

  const value: CommunityValue = {
    isReposted: (id) => reposted.includes(id),
    toggleRepost,
    repostedBy,
    stories: stories.filter((s) => !isBlocked(s.author.id)),
    storyAuthors,
    seenStories,
    markSeen: (id) => setSeen((s) => (s.includes(id) ? s : [...s, id])),
    postStory,
    pro,
    purchasesAvailable: demo,
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
      // The demo lists can name the same member twice (DEMO_ME is also a member).
      setPeople([...new Set(ids)].filter((id) => !social.isBlocked(id)).map(person));
      return;
    }
    let cancelled = false;
    const [col, other] = kind === 'followers' ? ['followee_id', 'follower_id'] : ['follower_id', 'followee_id'];
    supabase
      .from('follows')
      .select(`${other}, profile:profiles!follows_${other}_fkey(id, username, avatar_url, identity_verified)`)
      .eq(col, memberId)
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => {
        if (cancelled) return;
        setPeople(
          ((data ?? []) as unknown as { profile: { id: string; username: string; avatar_url: string | null; identity_verified: boolean | null } | null }[])
            .map((r) => r.profile)
            .filter((p): p is NonNullable<typeof p> => !!p && !social.isBlocked(p.id))
            .map((p) => ({ id: p.id, username: p.username, avatar: p.avatar_url, verified: p.identity_verified === true })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [memberId, kind, social.demo, social.meId, social.followingIds, social.isBlocked]);

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

// ─── Highlights ───────────────────────────────────────────────

export interface Highlight {
  id: string;
  ownerId: string;
  title: string;
  /** Image URLs, in order. */
  media: string[];
  createdAt: string;
}

const HIGHLIGHT_TITLES = ['Soirées', 'Vintage', 'Mariages', 'Paris'];

/** Demo highlights live in memory for the session; members get a few from their posts. */
const demoHighlights = new Map<string, Highlight[]>();
const highlightListeners = new Set<() => void>();
function demoHighlightsFor(memberId: string): Highlight[] {
  if (!demoHighlights.has(memberId)) {
    const photos = DEMO_POSTS.filter((p) => p.authorId === memberId).flatMap((p) => p.photos);
    const seeded: Highlight[] = [];
    if (memberId !== DEMO_ME.id && photos.length) {
      const groups = Math.min(HIGHLIGHT_TITLES.length, Math.max(1, Math.ceil(photos.length / 2)));
      for (let g = 0; g < groups; g++) {
        const media = photos.filter((_, i) => i % groups === g);
        if (media.length) {
          seeded.push({ id: `hl-${memberId}-${g}`, ownerId: memberId, title: HIGHLIGHT_TITLES[g], media, createdAt: ago(5000 + g * 600) });
        }
      }
    }
    demoHighlights.set(memberId, seeded);
  }
  return demoHighlights.get(memberId) as Highlight[];
}

/** One of my stories, live or past, that a highlight can hold. */
export interface MyStory {
  id: string;
  media: string;
  createdAt: string;
}

/** Demo: a few past stories of mine, so a highlight can be made without posting. */
const demoPastStories: MyStory[] = DEMO_POSTS.slice(0, 4).map((p, i) => ({
  id: `story-past-${i}`,
  media: p.photos[0],
  createdAt: ago(60 * 24 * (3 + i * 4)),
}));

/**
 * My stories that can go in a highlight: live and past, newest first (public,
 * not deleted; RLS keeps my own past ones readable). Loads while `enabled`.
 */
export function useMyStories(enabled: boolean) {
  const social = useSocial();
  const community = useCommunity();
  const demo = social.demo || !supabase;
  const [live, setLive] = useState<MyStory[] | null>(null);
  const meId = social.meId;

  useEffect(() => {
    if (!enabled || demo || !meId) return;
    let cancelled = false;
    const db = supabase!;
    setLive(null);
    db.from('stories')
      .select('id, media_path, created_at')
      .eq('author_id', meId)
      .eq('distribution', 'public')
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (cancelled) return;
        setLive(
          ((data ?? []) as { id: string; media_path: string; created_at: string }[])
            .filter((s) => !/^[a-z]+:/i.test(s.media_path))
            .map((s) => ({ id: s.id, media: db.storage.from('post-media').getPublicUrl(s.media_path).data.publicUrl, createdAt: s.created_at })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, demo, meId]);

  if (!demo) return live;
  const mine = community.stories.filter((s) => s.author.id === meId).map((s) => ({ id: s.id, media: s.media, createdAt: s.createdAt }));
  return [...mine, ...demoPastStories];
}

/** A member's highlights (migration 022), and for me, create and delete. */
export function useHighlights(memberId: string | null) {
  const social = useSocial();
  const demo = social.demo || !supabase;
  const [items, setItems] = useState<Highlight[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!memberId) return;
    if (demo) {
      const update = () => setItems([...demoHighlightsFor(memberId)]);
      update();
      highlightListeners.add(update);
      return () => {
        highlightListeners.delete(update);
      };
    }
    let cancelled = false;
    const db = supabase!;
    db.from('story_highlights')
      .select('id, owner_id, title, media_paths, created_at')
      .eq('owner_id', memberId)
      .order('created_at')
      .then(({ data }) => {
        if (cancelled) return;
        // Before migration 022 runs the table is missing: no highlights, no error.
        setItems(
          ((data ?? []) as { id: string; owner_id: string; title: string; media_paths: string[]; created_at: string }[]).map((h) => ({
            id: h.id,
            ownerId: h.owner_id,
            title: h.title,
            media: h.media_paths.map((p) => db.storage.from('post-media').getPublicUrl(p).data.publicUrl),
            createdAt: h.created_at,
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [demo, memberId, tick]);

  /** Up to 20 of my stories, in the order picked. The server derives the media (032). */
  const create = useCallback(
    async (title: string, stories: MyStory[]) => {
      const name = title.trim().slice(0, 24);
      const picked = stories.slice(0, 20);
      if (!memberId || memberId !== social.meId || !name || !picked.length) return;
      if (demo) {
        demoHighlightsFor(memberId).push({ id: `hl-${Date.now().toString(36)}`, ownerId: memberId, title: name, media: picked.map((s) => s.media), createdAt: new Date().toISOString() });
        highlightListeners.forEach((l) => l());
        return;
      }
      const { error } = await supabase!.from('story_highlights').insert({ title: name, story_ids: picked.map((s) => s.id) });
      if (error) throw new Error(error.message);
      setTick((n) => n + 1);
    },
    [demo, memberId, social.meId],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!memberId || memberId !== social.meId) return;
      if (demo) {
        demoHighlights.set(memberId, demoHighlightsFor(memberId).filter((h) => h.id !== id));
        highlightListeners.forEach((l) => l());
        return;
      }
      await supabase!.from('story_highlights').delete().eq('id', id);
      setTick((n) => n + 1);
    },
    [demo, memberId, social.meId],
  );

  return { highlights: items, create, remove };
}
