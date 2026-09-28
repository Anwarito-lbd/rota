/**
 * The social layer (migration 009): fits and dumps, "Rent the look" tags,
 * follows, likes, comments, boards, blocks and reports.
 *
 * With a Supabase project every read goes through row-level security and
 * every write through the column grants in 009_social.sql, so nothing here is
 * trusted to enforce a rule. Without one, the same API runs on the demo data
 * in ./demo.ts and keeps its changes in memory.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { uploadMedia } from '../lib/upload';
import type { MediaItem } from '../state/types';
import { DEMO_COMMENTS, DEMO_FOLLOWING, DEMO_ME, DEMO_MEMBERS, DEMO_POSTS } from './demo';
import { paymentsConfigured, verifyIdentity } from './payments';

export type PostKind = 'fit' | 'dump';
export type IdentityStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface PostTag {
  listingId: string;
  mediaIndex: number;
  /** 0..1 from the photo's top-left corner. */
  x: number;
  y: number;
}

export interface Area {
  lat: number;
  lng: number;
  label: string | null;
}

export interface Author {
  username: string;
  avatar: string | null;
  certified: boolean;
  identityVerified: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  author: Author;
  kind: PostKind;
  media: string[];
  caption: string;
  challengeId: string | null;
  area: Area | null;
  tags: PostTag[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
  distribution: 'pending' | 'public' | 'limited' | 'blocked';
}

export interface Comment {
  id: string;
  postId: string;
  /** Set on a reply: the comment it answers. */
  parentId: string | null;
  authorId: string;
  author: { username: string; avatar: string | null };
  body: string;
  createdAt: string;
  likeCount: number;
  liked: boolean;
}

export interface BoardItem {
  kind: 'post' | 'listing';
  id: string;
}

export interface Board {
  id: string;
  name: string;
  isPrivate: boolean;
  items: BoardItem[];
}

export interface Challenge {
  id: string;
  title: { fr: string; en: string; es: string };
}

export interface Member extends Author {
  id: string;
  bio: string | null;
  followers: number;
  following: number;
}

export type SocialReportReason =
  | 'not_clothing'
  | 'ai_or_fake'
  | 'inappropriate'
  | 'counterfeit'
  | 'scam'
  | 'harassment'
  | 'other';

export const SOCIAL_REPORT_REASONS: SocialReportReason[] = [
  'inappropriate',
  'harassment',
  'not_clothing',
  'ai_or_fake',
  'counterfeit',
  'scam',
  'other',
];

export interface PublishInput {
  kind: PostKind;
  media: MediaItem[];
  caption: string;
  challengeId: string | null;
  tags: PostTag[];
  /** Raw position from the phone; rounded here and again by the server. */
  area: Area | null;
}

interface SocialValue {
  /** True when running on demo data (no Supabase project configured). */
  demo: boolean;
  meId: string | null;
  posts: Post[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  postById: (id: string | null) => Post | null;
  challenges: Challenge[];

  isFollowing: (memberId: string) => boolean;
  toggleFollow: (memberId: string) => void;
  followingIds: string[];

  isLiked: (postId: string) => boolean;
  toggleLike: (postId: string) => void;

  boards: Board[];
  isSaved: (item: BoardItem) => boolean;
  saveTo: (boardId: string, item: BoardItem) => Promise<void>;
  removeFrom: (boardId: string, item: BoardItem) => Promise<void>;
  createBoard: (name: string) => Promise<Board>;

  isBlocked: (memberId: string) => boolean;
  blockedIds: string[];
  block: (memberId: string) => Promise<void>;
  unblock: (memberId: string) => Promise<void>;

  report: (target: { kind: 'post' | 'comment' | 'member' | 'message'; id: string }, reason: SocialReportReason, note?: string) => Promise<void>;

  publish: (input: PublishInput) => Promise<{ id: string; live: boolean }>;
  deletePost: (postId: string) => Promise<void>;
  /** Posts within `km`, nearest first. Never returns an exact position. */
  nearby: (lat: number, lng: number, km: number) => Promise<{ post: Post; km: number }[]>;

  identity: IdentityStatus;
  /** Starts Stripe Identity (or the demo simulation). */
  verifyId: () => Promise<IdentityStatus>;
}

const SocialContext = createContext<SocialValue | null>(null);

// ─── helpers ──────────────────────────────────────────────────

/** 0.005° grid, the same rounding migration 009 applies server-side. */
export function coarsen(area: Area): Area {
  return { lat: Math.round(area.lat * 200) / 200, lng: Math.round(area.lng * 200) / 200, label: area.label };
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function postMediaUrl(path: string) {
  if (!supabase || path.startsWith('http')) return path;
  return supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
}

const DEFAULT_CHALLENGES: Challenge[] = [
  { id: 'dump-de-la-semaine', title: { fr: 'Dump de la semaine', en: 'Dump of the week', es: 'Dump de la semana' } },
  { id: 'fit-du-vendredi', title: { fr: 'Fit du vendredi', en: 'Friday fit', es: 'Look del viernes' } },
  { id: 'soiree', title: { fr: 'Look de soirée', en: 'Night-out look', es: 'Look de noche' } },
];

interface PostRow {
  id: string;
  author_id: string;
  kind: PostKind;
  media_paths: string[];
  caption: string | null;
  challenge_id: string | null;
  area_lat: number | null;
  area_lng: number | null;
  area_label: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  distribution: Post['distribution'];
  author: { username: string; avatar_url: string | null; certified: boolean; identity_status: string } | null;
  tags: { listing_id: string; media_index: number; x: number; y: number }[] | null;
}

const POST_SELECT =
  '*, author:profiles!posts_author_id_fkey(username, avatar_url, certified, identity_status), tags:post_tags(listing_id, media_index, x, y)';

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    author: {
      username: row.author?.username ?? 'membre',
      avatar: row.author?.avatar_url ?? null,
      certified: row.author?.certified ?? false,
      identityVerified: row.author?.identity_status === 'verified',
    },
    kind: row.kind,
    media: row.media_paths.map(postMediaUrl),
    caption: row.caption ?? '',
    challengeId: row.challenge_id,
    area:
      row.area_lat != null && row.area_lng != null
        ? { lat: Number(row.area_lat), lng: Number(row.area_lng), label: row.area_label }
        : null,
    tags: (row.tags ?? []).map((t) => ({ listingId: t.listing_id, mediaIndex: t.media_index, x: t.x, y: t.y })),
    likeCount: row.like_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    distribution: row.distribution,
  };
}

function demoAuthor(id: string): Author {
  if (id === DEMO_ME.id) return { username: DEMO_ME.username, avatar: DEMO_ME.avatar, certified: false, identityVerified: false };
  const m = DEMO_MEMBERS.find((x) => x.id === id);
  return {
    username: m?.username ?? 'membre',
    avatar: m?.avatar ?? null,
    certified: m?.certified ?? false,
    identityVerified: m?.identityVerified ?? false,
  };
}

const DEMO_POST_LIST: Post[] = DEMO_POSTS.map((p) => ({
  id: p.id,
  authorId: p.authorId,
  author: demoAuthor(p.authorId),
  kind: p.kind,
  media: p.photos,
  caption: p.caption,
  challengeId: p.challengeId,
  area: p.area,
  tags: p.tags,
  likeCount: p.likes,
  commentCount: DEMO_COMMENTS[p.id]?.length ?? 0,
  createdAt: new Date(Date.now() - p.hoursAgo * 36e5).toISOString(),
  distribution: 'public',
}));

function uid() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── provider ─────────────────────────────────────────────────

export function SocialProvider({ children }: { children: ReactNode }) {
  const { session, profile, refreshProfile } = useAuth();
  const demo = !supabase;
  const meId = demo ? DEMO_ME.id : (session?.user.id ?? null);

  const [posts, setPosts] = useState<Post[]>(demo ? DEMO_POST_LIST : []);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [challenges, setChallenges] = useState<Challenge[]>(DEFAULT_CHALLENGES);
  const [following, setFollowing] = useState<Set<string>>(new Set(demo ? DEMO_FOLLOWING : []));
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [boards, setBoards] = useState<Board[]>(
    demo
      ? [
          { id: 'b1', name: 'Mariage de Léa', isPrivate: true, items: [{ kind: 'post', id: 'p5' }, { kind: 'listing', id: 'f3' }] },
          { id: 'b2', name: 'Soirées', isPrivate: false, items: [{ kind: 'post', id: 'p3' }, { kind: 'post', id: 'p7' }] },
        ]
      : [],
  );
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [demoIdentity, setDemoIdentity] = useState<IdentityStatus>('none');

  // ── initial load (Supabase) ──
  useEffect(() => {
    if (demo || !supabase) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('distribution', 'public')
      .order('created_at', { ascending: false })
      .limit(120)
      .then(({ data, error: e }) => {
        if (cancelled) return;
        if (e) setError(e.message);
        else {
          setError(null);
          setPosts(((data ?? []) as unknown as PostRow[]).map(toPost));
        }
        setLoading(false);
      });
    supabase
      .from('challenges')
      .select('id, title_fr, title_en, title_es')
      .gte('ends_on', new Date().toISOString().slice(0, 10))
      .then(({ data }) => {
        if (cancelled || !data?.length) return;
        setChallenges(
          data.map((c) => ({
            id: c.id as string,
            title: { fr: c.title_fr as string, en: (c.title_en ?? c.title_fr) as string, es: (c.title_es ?? c.title_fr) as string },
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [demo, tick]);

  // ── what belongs to the signed-in member (Supabase) ──
  useEffect(() => {
    if (demo || !supabase || !meId) return;
    const db = supabase;
    db.from('follows').select('followee_id').eq('follower_id', meId).then(({ data }) => {
      setFollowing(new Set((data ?? []).map((r) => r.followee_id as string)));
    });
    db.from('post_likes').select('post_id').eq('user_id', meId).then(({ data }) => {
      setLiked(new Set((data ?? []).map((r) => r.post_id as string)));
    });
    db.from('member_blocks').select('blocked_id').then(({ data }) => {
      setBlocked(new Set((data ?? []).map((r) => r.blocked_id as string)));
    });
    db.from('boards')
      .select('id, name, is_private, items:board_items(post_id, listing_id)')
      .eq('owner_id', meId)
      .order('created_at')
      .then(({ data }) => {
        setBoards(
          (data ?? []).map((b) => ({
            id: b.id as string,
            name: b.name as string,
            isPrivate: b.is_private as boolean,
            items: ((b.items ?? []) as { post_id: string | null; listing_id: string | null }[]).map((i) =>
              i.post_id ? { kind: 'post' as const, id: i.post_id } : { kind: 'listing' as const, id: i.listing_id as string },
            ),
          })),
        );
      });
  }, [demo, meId, tick]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  const visible = useMemo(() => posts.filter((p) => !blocked.has(p.authorId)), [posts, blocked]);
  const postById = useCallback((id: string | null) => posts.find((p) => p.id === id) ?? null, [posts]);

  // ── follows ──
  const toggleFollow = useCallback(
    (memberId: string) => {
      if (!meId || memberId === meId) return;
      const on = !following.has(memberId);
      setFollowing((s) => {
        const next = new Set(s);
        if (on) next.add(memberId);
        else next.delete(memberId);
        return next;
      });
      if (demo || !supabase) return;
      const q = on
        ? supabase.from('follows').insert({ followee_id: memberId })
        : supabase.from('follows').delete().eq('follower_id', meId).eq('followee_id', memberId);
      q.then(({ error: e }) => {
        if (e) refresh();
      });
    },
    [demo, meId, following, refresh],
  );

  // ── likes (count kept by the database; mirrored optimistically) ──
  const toggleLike = useCallback(
    (postId: string) => {
      if (!meId) return;
      const on = !liked.has(postId);
      setLiked((s) => {
        const next = new Set(s);
        if (on) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, likeCount: Math.max(0, p.likeCount + (on ? 1 : -1)) } : p)));
      if (demo || !supabase) return;
      const q = on
        ? supabase.from('post_likes').insert({ post_id: postId })
        : supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', meId);
      q.then(({ error: e }) => {
        if (e && e.code !== '23505') refresh();
      });
    },
    [demo, meId, liked, refresh],
  );

  // ── boards ──
  const same = (a: BoardItem, b: BoardItem) => a.kind === b.kind && a.id === b.id;
  const isSaved = useCallback((item: BoardItem) => boards.some((b) => b.items.some((i) => same(i, item))), [boards]);

  const createBoard = useCallback(
    async (name: string): Promise<Board> => {
      const clean = name.trim().slice(0, 40);
      if (!clean) throw new Error('empty');
      if (demo || !supabase) {
        const board: Board = { id: uid(), name: clean, isPrivate: true, items: [] };
        setBoards((bs) => [...bs, board]);
        return board;
      }
      const { data, error: e } = await supabase.from('boards').insert({ name: clean }).select('id, name, is_private').single();
      if (e) throw new Error(e.code === '23505' ? 'duplicate' : e.message);
      const board: Board = { id: data.id, name: data.name, isPrivate: data.is_private, items: [] };
      setBoards((bs) => [...bs, board]);
      return board;
    },
    [demo],
  );

  const saveTo = useCallback(
    async (boardId: string, item: BoardItem) => {
      setBoards((bs) =>
        bs.map((b) => (b.id === boardId && !b.items.some((i) => same(i, item)) ? { ...b, items: [item, ...b.items] } : b)),
      );
      if (demo || !supabase) return;
      const { error: e } = await supabase
        .from('board_items')
        .insert({ board_id: boardId, [item.kind === 'post' ? 'post_id' : 'listing_id']: item.id });
      if (e && e.code !== '23505') {
        refresh();
        throw new Error(e.message);
      }
    },
    [demo, refresh],
  );

  const removeFrom = useCallback(
    async (boardId: string, item: BoardItem) => {
      setBoards((bs) => bs.map((b) => (b.id === boardId ? { ...b, items: b.items.filter((i) => !same(i, item)) } : b)));
      if (demo || !supabase) return;
      await supabase
        .from('board_items')
        .delete()
        .eq('board_id', boardId)
        .eq(item.kind === 'post' ? 'post_id' : 'listing_id', item.id);
    },
    [demo],
  );

  // ── blocks ──
  const block = useCallback(
    async (memberId: string) => {
      if (!meId || memberId === meId) return;
      setBlocked((s) => new Set(s).add(memberId));
      setFollowing((s) => {
        const next = new Set(s);
        next.delete(memberId);
        return next;
      });
      if (demo || !supabase) return;
      const { error: e } = await supabase.from('member_blocks').insert({ blocked_id: memberId });
      if (e && e.code !== '23505') throw new Error(e.message);
    },
    [demo, meId],
  );

  const unblock = useCallback(
    async (memberId: string) => {
      setBlocked((s) => {
        const next = new Set(s);
        next.delete(memberId);
        return next;
      });
      if (demo || !supabase || !meId) return;
      await supabase.from('member_blocks').delete().eq('blocker_id', meId).eq('blocked_id', memberId);
    },
    [demo, meId],
  );

  // ── reports ──
  const report = useCallback<SocialValue['report']>(
    async (target, reason, note) => {
      if (demo || !supabase) return;
      const column = { post: 'post_id', comment: 'comment_id', member: 'member_id', message: 'message_id' }[target.kind];
      const { error: e } = await supabase
        .from('social_reports')
        .insert({ [column]: target.id, reason, note: note?.trim() || null });
      if (e && e.code !== '23505') throw new Error(e.message);
    },
    [demo],
  );

  // ── publishing ──
  const identity: IdentityStatus = demo ? demoIdentity : (profile?.identityStatus ?? 'none');

  const publish = useCallback<SocialValue['publish']>(
    async (input) => {
      if (!meId) throw new Error('signed_out');
      if (input.media.length === 0) throw new Error('no_media');
      const area = input.area ? coarsen(input.area) : null;
      const caption = input.caption.trim().slice(0, 500);

      if (demo || !supabase) {
        const id = uid();
        const post: Post = {
          id,
          authorId: meId,
          author: { ...demoAuthor(meId), identityVerified: identity === 'verified' },
          kind: input.kind,
          media: input.media.map((m) => m.uri),
          caption,
          challengeId: input.challengeId,
          area,
          tags: input.tags,
          likeCount: 0,
          commentCount: 0,
          createdAt: new Date().toISOString(),
          // Mirrors posts_initial_distribution(): verified members go live.
          distribution: identity === 'verified' ? 'public' : 'pending',
        };
        setPosts((ps) => [post, ...ps]);
        return { id, live: post.distribution === 'public' };
      }

      const paths: string[] = [];
      for (const item of input.media.slice(0, 10)) {
        paths.push(await uploadMedia('post-media', meId, item));
      }
      const { data, error: e } = await supabase
        .from('posts')
        .insert({
          kind: input.kind,
          media_paths: paths,
          caption: caption || null,
          challenge_id: input.challengeId,
          area_lat: area?.lat ?? null,
          area_lng: area?.lng ?? null,
          area_label: area?.label ?? null,
        })
        .select('id, distribution')
        .single();
      if (e) throw new Error(e.message.includes('posting_suspended') ? 'posting_suspended' : e.message);
      if (input.tags.length) {
        await supabase.from('post_tags').insert(
          input.tags.map((t) => ({ post_id: data.id, listing_id: t.listingId, media_index: t.mediaIndex, x: t.x, y: t.y })),
        );
      }
      refresh();
      return { id: data.id as string, live: data.distribution === 'public' };
    },
    [demo, meId, identity, refresh],
  );

  const deletePost = useCallback(
    async (postId: string) => {
      setPosts((ps) => ps.filter((p) => p.id !== postId));
      if (demo || !supabase) return;
      await supabase.from('posts').delete().eq('id', postId);
    },
    [demo],
  );

  const nearby = useCallback<SocialValue['nearby']>(
    async (lat, lng, km) => {
      if (demo || !supabase) {
        return visible
          .filter((p) => p.area && p.distribution === 'public')
          .map((p) => ({ post: p, km: distanceKm({ lat, lng }, p.area as Area) }))
          .filter((r) => r.km <= km)
          .sort((a, b) => a.km - b.km);
      }
      const { data } = await supabase.rpc('posts_near', { p_lat: lat, p_lng: lng, p_km: km });
      const rows = (data ?? []) as { post_id: string; km: number }[];
      const known = new Map(visible.map((p) => [p.id, p]));
      const missing = rows.filter((r) => !known.has(r.post_id)).map((r) => r.post_id);
      if (missing.length) {
        const { data: more } = await supabase.from('posts').select(POST_SELECT).in('id', missing);
        ((more ?? []) as unknown as PostRow[]).map(toPost).forEach((p) => known.set(p.id, p));
      }
      return rows
        .map((r) => ({ post: known.get(r.post_id), km: r.km }))
        .filter((r): r is { post: Post; km: number } => !!r.post && !blocked.has(r.post.authorId));
    },
    [demo, visible, blocked],
  );

  // ── identity (Stripe Identity: document + selfie, hosted by Stripe) ──
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (demoTimer.current) clearTimeout(demoTimer.current);
  }, []);

  const verifyId = useCallback(async (): Promise<IdentityStatus> => {
    if (demo) {
      setDemoIdentity('pending');
      await new Promise<void>((resolve) => {
        demoTimer.current = setTimeout(resolve, 2200);
      });
      setDemoIdentity('verified');
      return 'verified';
    }
    if (!paymentsConfigured) throw new Error('payments_not_configured');
    const status = await verifyIdentity();
    refreshProfile();
    return status === 'verified' ? 'verified' : status === 'processing' ? 'pending' : identity;
  }, [demo, identity, refreshProfile]);

  const value = useMemo<SocialValue>(
    () => ({
      demo,
      meId,
      posts: visible,
      loading,
      error,
      refresh,
      postById,
      challenges,
      isFollowing: (id) => following.has(id),
      toggleFollow,
      followingIds: [...following],
      isLiked: (id) => liked.has(id),
      toggleLike,
      boards,
      isSaved,
      saveTo,
      removeFrom,
      createBoard,
      isBlocked: (id) => blocked.has(id),
      blockedIds: [...blocked],
      block,
      unblock,
      report,
      publish,
      deletePost,
      nearby,
      identity,
      verifyId,
    }),
    [
      demo, meId, visible, loading, error, refresh, postById, challenges, following, toggleFollow, liked, toggleLike,
      boards, isSaved, saveTo, removeFrom, createBoard, blocked, block, unblock, report, publish, deletePost, nearby,
      identity, verifyId,
    ],
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial(): SocialValue {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used inside <SocialProvider>');
  return ctx;
}

// ─── comments ─────────────────────────────────────────────────

const demoComments = new Map<string, Comment[]>();
function demoCommentsFor(postId: string): Comment[] {
  if (!demoComments.has(postId)) {
    demoComments.set(
      postId,
      (DEMO_COMMENTS[postId] ?? []).map((c, i) => ({
        id: `${postId}-c${i}`,
        postId,
        parentId: null,
        authorId: c.authorId,
        author: { username: demoAuthor(c.authorId).username, avatar: demoAuthor(c.authorId).avatar },
        body: c.body,
        createdAt: new Date(Date.now() - c.minutesAgo * 6e4).toISOString(),
        likeCount: 3 + ((i * 7) % 11),
        liked: false,
      })),
    );
  }
  return demoComments.get(postId) as Comment[];
}

type CommentRow = {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
  like_count: number | null;
  author: { username: string; avatar_url: string | null } | null;
};

export function useComments(postId: string | null) {
  const { demo, meId, isBlocked } = useSocial();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postId) return;
    if (demo || !supabase) {
      setComments([...demoCommentsFor(postId)]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const db = supabase;
    db.from('post_comments')
      .select('id, post_id, parent_id, author_id, body, created_at, like_count, author:profiles!post_comments_author_id_fkey(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at')
      .limit(300)
      .then(async ({ data }) => {
        const rows = (data ?? []) as unknown as CommentRow[];
        const { data: mine } = meId
          ? await db.from('comment_likes').select('comment_id').eq('user_id', meId).in('comment_id', rows.map((r) => r.id))
          : { data: [] };
        const likedIds = new Set(((mine ?? []) as { comment_id: string }[]).map((r) => r.comment_id));
        if (cancelled) return;
        setComments(
          rows.map((r) => ({
            id: r.id,
            postId: r.post_id,
            parentId: r.parent_id,
            authorId: r.author_id,
            author: { username: r.author?.username ?? 'membre', avatar: r.author?.avatar_url ?? null },
            body: r.body,
            createdAt: r.created_at,
            likeCount: r.like_count ?? 0,
            liked: likedIds.has(r.id),
          })),
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demo, postId, meId]);

  /** A new comment, or a reply when `parentId` is set (replies stay one level deep). */
  const add = useCallback(
    async (body: string, parentId: string | null = null) => {
      const text = body.trim().slice(0, 500);
      if (!postId || !meId || !text) return;
      if (demo || !supabase) {
        const c: Comment = {
          id: uid(),
          postId,
          parentId,
          authorId: meId,
          author: { username: DEMO_ME.username, avatar: DEMO_ME.avatar },
          body: text,
          createdAt: new Date().toISOString(),
          likeCount: 0,
          liked: false,
        };
        demoCommentsFor(postId).push(c);
        setComments((cs) => [...cs, c]);
        return;
      }
      const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, body: text, parent_id: parentId })
        .select('id, created_at')
        .single();
      if (error) throw new Error(error.message);
      setComments((cs) => [
        ...cs,
        {
          id: data.id,
          postId,
          parentId,
          authorId: meId,
          author: { username: 'moi', avatar: null },
          body: text,
          createdAt: data.created_at,
          likeCount: 0,
          liked: false,
        },
      ]);
    },
    [demo, meId, postId],
  );

  const toggleLike = useCallback(
    async (commentId: string) => {
      let nowLiked = false;
      setComments((cs) =>
        cs.map((c) => {
          if (c.id !== commentId) return c;
          nowLiked = !c.liked;
          return { ...c, liked: nowLiked, likeCount: Math.max(0, c.likeCount + (nowLiked ? 1 : -1)) };
        }),
      );
      if (demo || !supabase || !meId) {
        if (postId) {
          const list = demoCommentsFor(postId);
          const c = list.find((x) => x.id === commentId);
          if (c) {
            c.liked = !c.liked;
            c.likeCount = Math.max(0, c.likeCount + (c.liked ? 1 : -1));
          }
        }
        return;
      }
      if (nowLiked) await supabase.from('comment_likes').insert({ comment_id: commentId });
      else await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', meId);
    },
    [demo, meId, postId],
  );

  const remove = useCallback(
    async (commentId: string) => {
      // Removing a comment removes its replies too.
      setComments((cs) => cs.filter((c) => c.id !== commentId && c.parentId !== commentId));
      if (demo || !supabase) {
        if (postId) demoComments.set(postId, demoCommentsFor(postId).filter((c) => c.id !== commentId && c.parentId !== commentId));
        return;
      }
      await supabase.from('post_comments').delete().eq('id', commentId);
    },
    [demo, postId],
  );

  return { comments: comments.filter((c) => !isBlocked(c.authorId)), loading, add, remove, toggleLike };
}

// ─── members ──────────────────────────────────────────────────

export function useMember(memberId: string | null): Member | null {
  const { demo, posts, followingIds, meId } = useSocial();
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    if (!memberId) {
      setMember(null);
      return;
    }
    if (demo || !supabase) {
      const m = DEMO_MEMBERS.find((x) => x.id === memberId);
      const a = demoAuthor(memberId);
      const followedByMe = followingIds.includes(memberId) ? 1 : 0;
      const isMe = memberId === meId;
      setMember({
        id: memberId,
        ...a,
        bio: m?.bio ?? null,
        followers: isMe ? 38 : 1200 + memberId.length * 137 + followedByMe,
        following: isMe ? followingIds.length : 180 + memberId.length * 11,
      });
      return;
    }
    let cancelled = false;
    const db = supabase;
    Promise.all([
      db.from('profiles').select('id, username, avatar_url, certified, identity_status, bio').eq('id', memberId).maybeSingle(),
      db.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', memberId),
      db.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', memberId),
    ]).then(([p, followers, following]) => {
      if (cancelled || !p.data) return;
      setMember({
        id: memberId,
        username: p.data.username,
        avatar: p.data.avatar_url,
        certified: p.data.certified,
        identityVerified: p.data.identity_status === 'verified',
        bio: p.data.bio,
        followers: followers.count ?? 0,
        following: following.count ?? 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [demo, memberId, followingIds, posts.length, meId]);

  return member;
}
