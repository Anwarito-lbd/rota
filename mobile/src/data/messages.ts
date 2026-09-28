/**
 * In-app messaging (migration 010). One conversation per pair of members;
 * start_conversation() finds or creates it and refuses across a block.
 * New messages arrive in real time through Supabase Realtime (RLS applies).
 * Without a backend, the same API runs on a small in-memory demo inbox.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEMO_LISTINGS, DEMO_ME, DEMO_MEMBERS } from './demo';

/**
 * 'offer' is a price proposal for a piece (per day, for a number of days);
 * 'offer_answer' is the lender's yes or no to one offer. Only an answer from
 * the other member counts, so nobody can accept their own offer.
 */
export type MessageKind = 'text' | 'meetpoint' | 'offer' | 'offer_answer';

export interface MessageMeta {
  place?: string;
  area?: string;
  /** offer */
  listingId?: string;
  perDay?: number;
  days?: number;
  /** offer_answer */
  offerId?: string;
  accepted?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  kind: MessageKind;
  body: string;
  meta: MessageMeta | null;
  createdAt: string;
}

export type OfferState = 'pending' | 'accepted' | 'declined';

/** Where an offer stands, from the answers that follow it in the thread. */
export function offerState(offer: Message, messages: Message[]): OfferState {
  const answer = messages.find(
    (m) => m.kind === 'offer_answer' && m.meta?.offerId === offer.id && m.senderId !== offer.senderId,
  );
  if (!answer) return 'pending';
  return answer.meta?.accepted ? 'accepted' : 'declined';
}

export interface Thread {
  id: string;
  otherId: string;
  other: { username: string; avatar: string | null; verified: boolean };
  listingId: string | null;
  lastBody: string | null;
  lastKind: MessageKind | null;
  lastMine: boolean;
  lastAt: string;
  unread: number;
  blocked: boolean;
}

/** Busy public places per area, for "Proposer un lieu". Never a home. */
export const MEETING_PLACES: { area: string; place: string }[] = [
  { area: 'Paris 1er', place: 'Forum des Halles — sortie Porte du Jour' },
  { area: 'Paris 3e', place: 'Square du Temple — entrée rue de Bretagne' },
  { area: 'Paris 4e', place: 'Centre Pompidou — parvis' },
  { area: 'Paris 6e', place: 'Église Saint-Germain-des-Prés — parvis' },
  { area: 'Paris 8e', place: 'Gare Saint-Lazare — hall principal' },
  { area: 'Paris 10e', place: 'Gare de l’Est — hall départs' },
  { area: 'Paris 11e', place: 'Place de la République — statue' },
  { area: 'Paris 12e', place: 'Opéra Bastille — marches' },
  { area: 'Paris 14e', place: 'Gare Montparnasse — hall 1' },
  { area: 'Paris 18e', place: 'Métro Abbesses — sortie' },
];

// ─── demo inbox ───────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 6e4).toISOString();

const demoThreads: { id: string; otherId: string; listingId: string | null; readAt: string }[] = [
  { id: 'c1', otherId: 'u_camille', listingId: 'f1', readAt: iso(200) },
  { id: 'c2', otherId: 'u_juliette', listingId: 'f3', readAt: iso(0) },
];

const demoMessages: Record<string, Message[]> = {
  c1: [
    { id: 'c1m1', senderId: DEMO_ME.id, kind: 'text', body: 'Bonjour ! La nuisette est dispo vendredi soir ?', meta: null, createdAt: iso(240) },
    { id: 'c1m2', senderId: 'u_camille', kind: 'text', body: 'Oui ! Je peux vous la remettre vendredi vers 18 h.', meta: null, createdAt: iso(180) },
    {
      id: 'c1m3',
      senderId: 'u_camille',
      kind: 'meetpoint',
      body: 'Place de la République — statue',
      meta: { place: 'Place de la République — statue', area: 'Paris 11e' },
      createdAt: iso(178),
    },
  ],
  c2: [
    { id: 'c2m1', senderId: 'u_juliette', kind: 'text', body: 'Merci pour le retour, la robe était impeccable', meta: null, createdAt: iso(1500) },
  ],
};

function demoMember(id: string) {
  const m = DEMO_MEMBERS.find((x) => x.id === id);
  return { username: m?.username ?? 'membre', avatar: m?.avatar ?? null, verified: m?.identityVerified ?? false };
}

function demoInbox(): Thread[] {
  return demoThreads
    .map((th) => {
      const msgs = demoMessages[th.id] ?? [];
      const last = msgs[msgs.length - 1];
      return {
        id: th.id,
        otherId: th.otherId,
        other: demoMember(th.otherId),
        listingId: th.listingId,
        lastBody: last?.body ?? null,
        lastKind: last?.kind ?? null,
        lastMine: last?.senderId === DEMO_ME.id,
        lastAt: last?.createdAt ?? new Date().toISOString(),
        unread: msgs.filter((m) => m.senderId !== DEMO_ME.id && m.createdAt > th.readAt).length,
        blocked: false,
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

// ─── API ──────────────────────────────────────────────────────

export async function startConversation(otherId: string, listingId?: string | null): Promise<string> {
  if (!supabase) {
    let th = demoThreads.find((x) => x.otherId === otherId);
    if (!th) {
      th = { id: `c-${Date.now().toString(36)}`, otherId, listingId: listingId ?? null, readAt: new Date().toISOString() };
      demoThreads.push(th);
      demoMessages[th.id] = [];
    } else if (listingId) {
      th.listingId = listingId;
    }
    emit();
    return th.id;
  }
  const { data, error } = await supabase.rpc('start_conversation', { p_other: otherId, p_listing: listingId ?? null });
  if (error) throw new Error(error.message.includes('blocked') ? 'blocked' : error.message);
  return data as string;
}

export function useInbox() {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!supabase) {
      const update = () => setThreads(demoInbox());
      update();
      listeners.add(update);
      return () => {
        listeners.delete(update);
      };
    }
    let cancelled = false;
    const db = supabase;
    const load = () =>
      db.rpc('my_conversations').then(({ data }) => {
        if (cancelled) return;
        setThreads(
          ((data ?? []) as {
            conversation_id: string;
            other_id: string;
            other_username: string;
            other_avatar: string | null;
            other_verified: boolean;
            listing_id: string | null;
            last_body: string | null;
            last_kind: MessageKind | null;
            last_sender: string | null;
            last_message_at: string;
            unread: number;
            blocked: boolean;
          }[]).map((r) => ({
            id: r.conversation_id,
            otherId: r.other_id,
            other: { username: r.other_username, avatar: r.other_avatar, verified: r.other_verified },
            listingId: r.listing_id,
            lastBody: r.last_body,
            lastKind: r.last_kind,
            lastMine: r.last_sender !== r.other_id && r.last_sender !== null,
            lastAt: r.last_message_at,
            unread: r.unread,
            blocked: r.blocked,
          })),
        );
      });
    load();
    // Any new message the member can see refreshes the inbox.
    const channel = db
      .channel(`inbox:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      db.removeChannel(channel);
    };
  }, [tick]);

  return { threads, refresh, unread: (threads ?? []).reduce((n, t) => n + t.unread, 0) };
}

interface MessageRow {
  id: string;
  sender_id: string;
  kind: MessageKind;
  body: string;
  meta: Message['meta'];
  created_at: string;
}

const toMessage = (r: MessageRow): Message => ({
  id: r.id,
  senderId: r.sender_id,
  kind: r.kind,
  body: r.body,
  meta: r.meta,
  createdAt: r.created_at,
});

/** Sends one message; also used outside a thread (an offer sent from a listing). */
export async function sendMessage(
  conversationId: string,
  body: string,
  kind: MessageKind = 'text',
  meta: Message['meta'] = null,
): Promise<Message | null> {
  const text = body.trim().slice(0, 2000);
  if (!text) return null;
  if (!supabase) {
    const m: Message = {
      id: `m-${Date.now().toString(36)}`,
      senderId: DEMO_ME.id,
      kind,
      body: text,
      meta,
      createdAt: new Date().toISOString(),
    };
    (demoMessages[conversationId] ??= []).push(m);
    emit();
    if (kind === 'offer') demoLenderAnswers(conversationId, m);
    return m;
  }
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, kind, body: text, meta })
    .select('id, sender_id, kind, body, meta, created_at')
    .single();
  if (error) throw new Error(error.message);
  return toMessage(data as MessageRow);
}

/** Demo only: the lender answers a few seconds later, yes at or above her floor. */
function demoLenderAnswers(conversationId: string, offer: Message) {
  const th = demoThreads.find((x) => x.id === conversationId);
  if (!th) return;
  const floor = DEMO_LISTINGS.find((l) => l.id === offer.meta?.listingId)?.minOffer ?? 0;
  const accepted = (offer.meta?.perDay ?? 0) >= floor;
  setTimeout(() => {
    (demoMessages[conversationId] ??= []).push({
      id: `m-${Date.now().toString(36)}`,
      senderId: th.otherId,
      kind: 'offer_answer',
      body: accepted ? 'Offre acceptée' : 'Offre refusée',
      meta: { offerId: offer.id, accepted },
      createdAt: new Date().toISOString(),
    });
    emit();
  }, 2500);
}

export function useThread(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) return;
    if (!supabase) {
      const update = () => setMessages([...(demoMessages[conversationId] ?? [])]);
      update();
      const th = demoThreads.find((x) => x.id === conversationId);
      if (th) th.readAt = new Date().toISOString();
      emit();
      listeners.add(update);
      return () => {
        listeners.delete(update);
      };
    }
    const db = supabase;
    let cancelled = false;
    setLoading(true);
    db.from('messages')
      .select('id, sender_id, kind, body, meta, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at')
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return;
        setMessages(((data ?? []) as MessageRow[]).map(toMessage));
        setLoading(false);
      });
    db.rpc('mark_conversation_read', { p_conversation: conversationId });
    const channel = db
      .channel(`conversation:${conversationId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = toMessage(payload.new as MessageRow);
          setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
          db.rpc('mark_conversation_read', { p_conversation: conversationId });
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      db.removeChannel(channel);
    };
  }, [conversationId]);

  const send = useCallback(
    async (body: string, kind: MessageKind = 'text', meta: Message['meta'] = null) => {
      if (!conversationId) return;
      const m = await sendMessage(conversationId, body, kind, meta);
      if (m) setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
    },
    [conversationId],
  );

  return { messages, loading, send };
}

/** Phone numbers, e-mails and payment handles: nudge to keep it in Rota. */
export function looksOffApp(text: string) {
  return (
    /(\+33|0)[1-9](?:[\s.-]?\d{2}){4}/.test(text) ||
    /[\w.+-]+@[\w-]+\.[\w.]+/.test(text) ||
    /\b(paypal|lydia|wero|virement|iban|whatsapp|snap(chat)?|insta(gram)?|telegram)\b/i.test(text)
  );
}
