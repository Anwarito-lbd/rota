/**
 * Privacy controls (migrations 030–032): mutes, restricts, hidden words,
 * hidden reviews and the 30-day bin. Every account is public, so there are
 * no follow requests here. Demo mode keeps everything in memory so each
 * screen can be tried without a server.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface MiniMember { id: string; username: string; avatar: string | null }
export interface MutedMember extends MiniMember { posts: boolean; stories: boolean }
export interface HiddenReview { id: string; postId: string; author: string; body: string; rating: number | null; at: string }
export interface BinItem { kind: 'post' | 'story'; id: string; media: string | null; deletedAt: string }

const demo = () => !supabase;

/** What changed: the social layer reloads only what depends on it. */
export type PrivacyChange = 'mutes' | 'bin' | 'other';

// Every hook below, and the social layer, reloads when something here changes.
const listeners = new Set<(kind: PrivacyChange) => void>();
const ping = (kind: PrivacyChange) => listeners.forEach((l) => l(kind));

/** Called after any privacy change (a mute, a restore…). Returns the unsubscribe. */
export function onPrivacyChange(listener: (kind: PrivacyChange) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Demo state, shared by every screen.
const demoState = {
  mutes: new Map<string, { posts: boolean; stories: boolean; username: string }>(),
  restricts: new Map<string, string>(),
  words: ['moche'] as string[],
  hidden: [
    { id: 'hc1', postId: 'p1', author: 'anon.troll', body: 'Franchement moche', rating: 1, at: new Date().toISOString() },
  ] as HiddenReview[],
  bin: [] as BinItem[],
  restore: new Map<string, () => void>(),
};

/** Demo only: who is muted, for the social layer's feed and story filters. */
export function demoMutes() {
  return [...demoState.mutes].map(([id, m]) => ({ id, posts: m.posts, stories: m.stories }));
}

/**
 * Loads once, again on `reload()` and after any privacy change. A loader
 * throws on a server error; the hook keeps the last value and exposes the
 * message so a screen can offer a retry instead of an empty list. The
 * last item is true while a first load or a retry is running, so "empty"
 * never flashes. Only the latest request may update the state.
 */
function useLive<T>(load: () => Promise<T>, initial: T): [T, () => void, string | null, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    setTick((n) => n + 1);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const request = ++latest.current;
      const stale = () => cancelled || request !== latest.current;
      load().then(
        (v) => {
          if (stale()) return;
          setValue(v);
          setError(null);
          setLoading(false);
        },
        (e: unknown) => {
          if (stale()) return;
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        },
      );
    };
    run();
    listeners.add(run);
    return () => {
      cancelled = true;
      listeners.delete(run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  return [value, reload, error, loading];
}

const avatarUrl = (path: string | null) =>
  path && supabase && !/^https?:/.test(path) ? supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl : path;

type ProfileEmbed = { username: string; avatar_url: string | null } | null;

// ── Mutes ─────────────────────────────────────────────────────
export function useMutes() {
  return useLive<MutedMember[]>(async () => {
    if (demo()) {
      return [...demoState.mutes].map(([id, m]) => ({ id, username: m.username, avatar: null, posts: m.posts, stories: m.stories }));
    }
    const { data, error } = await supabase!
      .from('member_mutes')
      .select('muted_id, mute_posts, mute_stories, profile:profiles!member_mutes_muted_id_fkey(username, avatar_url)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as { muted_id: string; mute_posts: boolean; mute_stories: boolean; profile: ProfileEmbed }[]).map((r) => ({
      id: r.muted_id,
      username: r.profile?.username ?? 'membre',
      avatar: avatarUrl(r.profile?.avatar_url ?? null),
      posts: r.mute_posts,
      stories: r.mute_stories,
    }));
  }, []);
}

/** Both off removes the mute. */
export async function setMute(member: MiniMember, posts: boolean, stories: boolean) {
  if (demo()) {
    if (!posts && !stories) demoState.mutes.delete(member.id);
    else demoState.mutes.set(member.id, { posts, stories, username: member.username });
    return ping('mutes');
  }
  const db = supabase!;
  const { error } =
    !posts && !stories
      ? await db.from('member_mutes').delete().eq('muted_id', member.id)
      : await db.from('member_mutes').upsert({ muted_id: member.id, mute_posts: posts, mute_stories: stories });
  if (error) throw new Error(error.message);
  ping('mutes');
}

// ── Restricts ─────────────────────────────────────────────────
export function useRestricts() {
  return useLive<MiniMember[]>(async () => {
    if (demo()) return [...demoState.restricts].map(([id, username]) => ({ id, username, avatar: null }));
    const { data, error } = await supabase!
      .from('member_restricts')
      .select('restricted_id, profile:profiles!member_restricts_restricted_id_fkey(username, avatar_url)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as { restricted_id: string; profile: ProfileEmbed }[]).map((r) => ({
      id: r.restricted_id,
      username: r.profile?.username ?? 'membre',
      avatar: avatarUrl(r.profile?.avatar_url ?? null),
    }));
  }, []);
}

export async function setRestrict(member: MiniMember, on: boolean) {
  if (demo()) {
    if (on) demoState.restricts.set(member.id, member.username);
    else demoState.restricts.delete(member.id);
    return ping('other');
  }
  const db = supabase!;
  const { error } = on
    ? await db.from('member_restricts').upsert({ restricted_id: member.id }, { ignoreDuplicates: true })
    : await db.from('member_restricts').delete().eq('restricted_id', member.id);
  if (error) throw new Error(error.message);
  ping('other');
}

// ── Hidden words and hidden reviews ───────────────────────────
export const MAX_HIDDEN_WORDS = 200;

export function useHiddenWords() {
  return useLive<string[]>(async () => {
    if (demo()) return [...demoState.words];
    const { data, error } = await supabase!.from('member_hidden_words').select('word').order('created_at');
    if (error) throw new Error(error.message);
    return ((data ?? []) as { word: string }[]).map((r) => r.word);
  }, []);
}

/** 2 to 40 characters; anything else is ignored. Throws 'too_many_words' past the cap. */
export async function addHiddenWord(word: string) {
  const w = word.trim().toLowerCase();
  if (w.length < 2 || w.length > 40) return;
  if (demo()) {
    if (demoState.words.includes(w)) return;
    if (demoState.words.length >= MAX_HIDDEN_WORDS) throw new Error('too_many_words');
    demoState.words.push(w);
    return ping('other');
  }
  // The server folds words (030b), so two spellings can collide: that is "already in the list".
  const { error } = await supabase!.from('member_hidden_words').upsert({ word: w }, { ignoreDuplicates: true });
  if (error) throw new Error(error.message.includes('too_many_words') ? 'too_many_words' : error.message);
  ping('other');
}

/** Takes the word as the list shows it (already folded by the server). */
export async function removeHiddenWord(word: string) {
  if (demo()) {
    demoState.words = demoState.words.filter((x) => x !== word);
    return ping('other');
  }
  const { error } = await supabase!.from('member_hidden_words').delete().eq('word', word);
  if (error) throw new Error(error.message);
  ping('other');
}

/** Reviews on my posts held back by my hidden words or review policy (030). */
export function useHiddenReviews() {
  return useLive<HiddenReview[]>(async () => {
    if (demo()) return [...demoState.hidden];
    const { data, error } = await supabase!.rpc('my_hidden_comments');
    if (error) throw new Error(error.message);
    return ((data ?? []) as { comment_id: string; post_id: string; author_username: string; body: string; rating: number | null; created_at: string }[]).map((r) => ({
      id: r.comment_id,
      postId: r.post_id,
      author: r.author_username,
      body: r.body,
      rating: r.rating,
      at: r.created_at,
    }));
  }, []);
}

export async function approveHiddenReview(id: string) {
  if (demo()) {
    demoState.hidden = demoState.hidden.filter((h) => h.id !== id);
    return ping('other');
  }
  const { data, error } = await supabase!.rpc('approve_hidden_comment', { p_comment: id });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error('not_found');
  ping('other');
}

// ── Bin ───────────────────────────────────────────────────────
export function useRecentlyDeleted() {
  return useLive<BinItem[]>(async () => {
    if (demo()) return [...demoState.bin];
    const db = supabase!;
    const { data, error } = await db.rpc('my_recently_deleted');
    if (error) throw new Error(error.message);
    return ((data ?? []) as { kind: 'post' | 'story'; id: string; media: string | null; deleted_at: string }[]).map((r) => ({
      kind: r.kind,
      id: r.id,
      deletedAt: r.deleted_at,
      media: r.media ? db.storage.from('post-media').getPublicUrl(r.media).data.publicUrl : null,
    }));
  }, []);
}

/** Demo only: what the social layer "deleted", and how to put it back. */
export function demoBinAdd(item: BinItem, restore: () => void) {
  demoState.bin.unshift(item);
  demoState.restore.set(item.id, restore);
  ping('bin');
}

/** Throws 'not_restored' when the item is gone (past 30 days, or not mine). */
export async function restoreFromBin(item: BinItem) {
  if (demo()) {
    demoState.bin = demoState.bin.filter((b) => b.id !== item.id);
    demoState.restore.get(item.id)?.();
    demoState.restore.delete(item.id);
    return ping('bin');
  }
  const { data, error } =
    item.kind === 'post'
      ? await supabase!.rpc('restore_post', { p_post: item.id })
      : await supabase!.rpc('restore_story', { p_story: item.id });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error('not_restored');
  ping('bin');
}

export const daysLeft = (deletedAt: string) =>
  Math.max(0, 30 - Math.floor((Date.now() - Date.parse(deletedAt)) / 86_400_000));
