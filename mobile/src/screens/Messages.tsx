/**
 * Messages: the inbox, and a conversation when state.thread is set. Meeting
 * points are picked from a list of public places, never typed addresses;
 * phone numbers, e-mails and payment apps trigger a "keep it in Rota" nudge.
 */
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListing, useListings } from '../data/listings';
import {
  MEETING_PLACES,
  looksOffApp,
  answerOffer,
  offerState,
  useInbox,
  useThread,
  type Message,
  type OfferState,
} from '../data/messages';
import { useSocial } from '../data/social';
import { useT } from '../i18n';
import { friendlyError } from '../lib/errors';
import { useStore } from '../state/store';
import { ff } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ChevronLeft, DotsIcon, PinIcon, SearchIcon, SendIcon, ShieldCheckIcon, TabMessagesIcon } from '../ui/icons';
import { Amount, Display, Note, Screen, Sheet, Txt } from '../ui/kit';
import { Avatar, FadeIn, IdBadge, PressScale, Skeleton, tap, timeAgo } from '../ui/motion';
import { StoriesRow } from './Community';

type InboxFilter = 'all' | 'renting' | 'lending' | 'unread';

function Inbox() {
  const { set } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const { threads: all } = useInbox();
  const { byId } = useListings();
  const social = useSocial();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');

  // Like Airbnb's inbox: search, then All / Renting / Lending / Unread.
  const q = query.trim().toLowerCase();
  const threads =
    all === null
      ? null
      : all.filter((th) => {
          const listing = th.listingId ? byId(th.listingId) : null;
          if (filter === 'unread' && !th.unread) return false;
          if (filter === 'lending' && !(listing && listing.ownerId === social.meId)) return false;
          if (filter === 'renting' && !(listing && listing.ownerId !== social.meId)) return false;
          if (!q) return true;
          return [th.other.username, th.lastBody ?? '', listing?.title ?? ''].some((v) => v.toLowerCase().includes(q));
        });
  const filters: [InboxFilter, string][] = [
    ['all', t('inbox.all')],
    ['renting', t('inbox.renting')],
    ['lending', t('inbox.lending')],
    ['unread', t('inbox.unread')],
  ];

  return (
    <Screen>
      <Display size={34}>{t('messages.title')}</Display>
      <View style={{ marginHorizontal: -18, marginTop: 6 }}>
        <StoriesRow />
      </View>
      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 16, borderRadius: 999, backgroundColor: c.surf2 }}>
        <SearchIcon size={18} color={c.ink3} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('inbox.search')}
          placeholderTextColor={c.ink3}
          accessibilityLabel={t('inbox.search')}
          style={{ flex: 1, ...ff('reg'), fontSize: 15, color: c.ink, outlineWidth: 0 } as object}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
        {filters.map(([key, label]) => {
          const on = filter === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(key)}
              style={{ paddingHorizontal: 16, height: 36, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? c.accent : c.surf2 }}
            >
              <Txt size={14} weight="semi" color={on ? c.onAccent : c.ink}>
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      {threads === null ? (
        <View style={{ marginTop: 20, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={64} radius={20} />
          ))}
        </View>
      ) : threads.length === 0 && (all?.length ?? 0) > 0 ? (
        <Txt center color={c.ink3} style={{ marginTop: 40 }}>
          {t('inbox.noMatch')}
        </Txt>
      ) : threads.length === 0 ? (
        <FadeIn style={{ marginTop: 70, alignItems: 'center', paddingHorizontal: 20 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: c.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TabMessagesIcon color={c.accent} />
          </View>
          <Display size={24} style={{ marginTop: 18, textAlign: 'center' }}>
            {t('messages.empty')}
          </Display>
          <Txt size={14} center color={c.ink2} style={{ marginTop: 8 }}>
            {t('messages.emptyBody')}
          </Txt>
        </FadeIn>
      ) : (
        <View style={{ marginTop: 4, gap: 4 }}>
          {threads.map((th, i) => {
            const listing = th.listingId ? byId(th.listingId) : null;
            return (
            <FadeIn key={th.id} delay={Math.min(i, 8) * 40}>
              <PressScale
                scaleTo={0.98}
                onPress={() => set({ thread: th.id })}
                accessibilityLabel={`${th.other.username}${th.unread ? `, ${th.unread}` : ''}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 16 }}
              >
                {listing?.photos[0] ? (
                  // The piece, with who you talk to in the corner.
                  <View style={{ width: 56, height: 56 }}>
                    <Image source={{ uri: listing.photos[0] }} style={{ width: 52, height: 52, borderRadius: 12 }} contentFit="cover" />
                    <View style={{ position: 'absolute', right: -2, bottom: -2, borderRadius: 99, borderWidth: 2, borderColor: c.bg }}>
                      <Avatar uri={th.other.avatar} size={26} />
                    </View>
                  </View>
                ) : (
                  <Avatar uri={th.other.avatar} size={56} />
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Txt weight={th.unread ? 'bold' : 'semi'} numberOfLines={1} style={{ flexShrink: 1 }}>
                      {th.other.username}
                    </Txt>
                    {th.other.verified ? <IdBadge compact label={t('verify.badge')} /> : null}
                    <Txt size={12} color={c.ink3} style={{ marginLeft: 'auto' }}>
                      {timeAgo(th.lastAt, lang)}
                    </Txt>
                  </View>
                  <Txt size={14} color={th.unread ? c.ink : c.ink2} numberOfLines={1} weight={th.unread ? 'semi' : 'reg'}>
                    {th.lastMine ? `${t('msg.you')} : ` : ''}
                    {th.lastKind === 'meetpoint' ? th.lastBody : (th.lastBody ?? '')}
                  </Txt>
                  {listing ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: listing.ownerId === social.meId ? c.plum : c.accent }} />
                      <Txt size={12} color={c.ink3} numberOfLines={1} style={{ flexShrink: 1 }}>
                        {listing.ownerId === social.meId ? t('inbox.youLend') : t('inbox.youRent')} · {listing.title}
                      </Txt>
                    </View>
                  ) : null}
                </View>
                {th.unread ? (
                  <View
                    style={{
                      minWidth: 22,
                      height: 22,
                      paddingHorizontal: 6,
                      borderRadius: 99,
                      backgroundColor: c.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Txt size={12} weight="bold" color={c.onAccent}>
                      {th.unread}
                    </Txt>
                  </View>
                ) : null}
              </PressScale>
            </FadeIn>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

/** A price offer in the thread. The lender answers it; the renter books at that price once accepted. */
function OfferCard({
  m: msg,
  mine,
  status,
  askPrice,
  otherName,
  onAnswer,
  onRent,
}: {
  m: Message;
  mine: boolean;
  status: OfferState;
  askPrice: number | null;
  otherName: string;
  onAnswer: (accepted: boolean) => void;
  onRent: () => void;
}) {
  const { c } = useTheme();
  const { m } = useStore();
  const perDay = msg.meta?.perDay ?? 0;
  const days = msg.meta?.days ?? 1;
  const label = { pending: 'En attente', accepted: 'Acceptée', declined: 'Refusée' }[status];
  const tone = status === 'accepted' ? c.accent : status === 'declined' ? c.ink3 : c.ink2;

  return (
    <View
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        width: '82%',
        padding: 14,
        borderRadius: 20,
        backgroundColor: c.surf,
        borderWidth: 1,
        borderColor: status === 'accepted' ? c.accent : c.line2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size={11} weight="bold" upper color={c.accent}>
          {mine ? 'Votre offre' : 'Offre reçue'}
        </Txt>
        <Txt size={12} weight="semi" color={tone}>
          {label}
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <Amount size={24}>{m(perDay)}</Amount>
        <Txt size={14} color={c.ink2}>
          / jour
        </Txt>
        {askPrice && askPrice > perDay ? (
          <Txt size={14} color={c.ink3} style={{ textDecorationLine: 'line-through' }}>
            {m(askPrice)}
          </Txt>
        ) : null}
      </View>
      <Txt size={13} color={c.ink3} style={{ marginTop: 2 }}>
        {days} {days > 1 ? 'jours' : 'jour'} · loyer {m(perDay * days)}
      </Txt>

      {status === 'pending' && !mine ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PressScale
            onPress={() => onAnswer(false)}
            style={{ flex: 1, minHeight: 42, borderRadius: 999, borderWidth: 1, borderColor: c.line2, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt size={14} weight="bold">
              Refuser
            </Txt>
          </PressScale>
          <PressScale
            haptic="light"
            onPress={() => onAnswer(true)}
            style={{ flex: 1, minHeight: 42, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt size={14} weight="bold" color={c.onAccent}>
              Accepter
            </Txt>
          </PressScale>
        </View>
      ) : null}
      {status === 'pending' && mine ? (
        <Txt size={13} color={c.ink3} style={{ marginTop: 10 }}>
          @{otherName} a 12 h pour répondre.
        </Txt>
      ) : null}
      {status === 'accepted' && mine && msg.meta?.listingId ? (
        <PressScale
          haptic="light"
          onPress={onRent}
          style={{ marginTop: 12, minHeight: 44, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <Txt size={15} weight="bold" color={c.onAccent}>
            Louer à {m(perDay)} / jour
          </Txt>
        </PressScale>
      ) : null}
      {status === 'declined' && mine ? (
        <Txt size={13} color={c.ink3} style={{ marginTop: 10 }}>
          Vous pouvez faire une nouvelle offre depuis l'annonce.
        </Txt>
      ) : null}
    </View>
  );
}

function Bubble({ m, mine, onLongPress }: { m: Message; mine: boolean; onLongPress: () => void }) {
  const { c } = useTheme();
  const { t, lang } = useT();
  if (m.kind === 'meetpoint') {
    return (
      <Pressable onLongPress={onLongPress} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
        <View style={{ padding: 12, borderRadius: 20, backgroundColor: c.surf, borderWidth: 1, borderColor: c.accent, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PinIcon size={15} color={c.accent} />
            <Txt size={11} weight="bold" upper color={c.accent}>
              {t('msg.meetLabel')}
            </Txt>
          </View>
          <Txt weight="semi">{m.meta?.place ?? m.body}</Txt>
          {m.meta?.area ? (
            <Txt size={12} color={c.ink3}>
              {m.meta.area} · {timeAgo(m.createdAt, lang)}
            </Txt>
          ) : null}
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable onLongPress={onLongPress} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 20,
          borderBottomRightRadius: mine ? 6 : 20,
          borderBottomLeftRadius: mine ? 20 : 6,
          backgroundColor: mine ? c.accent : c.surf2,
        }}
      >
        <Txt size={15} color={mine ? c.onAccent : c.ink}>
          {m.body}
        </Txt>
      </View>
    </Pressable>
  );
}

function Conversation({ id }: { id: string }) {
  const { set, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const social = useSocial();
  const { threads } = useInbox();
  const th = threads?.find((x) => x.id === id) ?? null;
  const listing = useListing(th?.listingId ?? null);
  const { messages, send } = useThread(id);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const blocked = !!th && (th.blocked || social.isBlocked(th.otherId));
  const warn = looksOffApp(draft);

  useEffect(() => {
    const timer = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const submit = async (body: string, kind: Message['kind'] = 'text', meta: Message['meta'] = null) => {
    setError(null);
    try {
      await send(body, kind, meta);
      tap('light');
      if (kind === 'text') setDraft('');
    } catch {
      setError(t('msg.failed'));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 12,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: c.line,
        }}
      >
        <PressScale onPress={() => set({ thread: null })} accessibilityLabel={t('common.back')} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <ChevronLeft color={c.ink} />
        </PressScale>
        <Pressable
          onPress={() => th && set({ screen: 'user', profileId: th.otherId, thread: null })}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <Avatar uri={th?.other.avatar} size={38} />
          <View style={{ flexShrink: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Txt weight="bold" numberOfLines={1}>
                {th?.other.username ?? ''}
              </Txt>
              {th?.other.verified ? <IdBadge compact label={t('verify.badge')} /> : null}
            </View>
            {listing ? (
              <Txt size={12} color={c.ink3} numberOfLines={1}>
                {t('msg.about')} {listing.title}
              </Txt>
            ) : null}
          </View>
        </Pressable>
        {th ? (
          <PressScale
            accessibilityLabel={t('profile.report')}
            onPress={() => set({ socialReport: { kind: 'member', id: th.otherId, memberId: th.otherId } })}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <DotsIcon color={c.ink} />
          </PressScale>
        ) : null}
      </View>

      {listing ? (
        <Pressable
          onPress={() => set({ screen: 'detail', activeId: listing.id, thread: null })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, padding: 8, borderRadius: 16, backgroundColor: c.surf }}
        >
          <Image source={{ uri: listing.photos[0] }} style={{ width: 40, height: 50, borderRadius: 8 }} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Txt size={14} weight="semi" numberOfLines={1}>
              {listing.title}
            </Txt>
            <Txt size={12} color={c.ink3}>
              {m(listing.price)} {t('common.perDay')}
            </Txt>
          </View>
        </Pressable>
      ) : null}

      <ScrollView ref={scroller} contentContainerStyle={{ padding: 14, gap: 8 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginBottom: 8 }}>
          <ShieldCheckIcon size={13} color={c.ink3} />
          <Txt size={11} color={c.ink3} center>
            {t('msg.safety')}
          </Txt>
        </View>
        {messages.map((msg) => {
          if (msg.kind === 'offer_answer') {
            return (
              <Txt key={msg.id} size={12} weight="semi" center color={msg.meta?.accepted ? c.accent : c.ink3} style={{ marginVertical: 4 }}>
                {msg.senderId === social.meId ? 'Vous avez répondu : ' : `@${th?.other.username ?? ''} : `}
                {msg.meta?.accepted ? 'offre acceptée' : 'offre refusée'}
              </Txt>
            );
          }
          if (msg.kind === 'offer') {
            const offerListing = msg.meta?.listingId;
            return (
              <OfferCard
                key={msg.id}
                m={msg}
                mine={msg.senderId === social.meId}
                status={offerState(msg, messages)}
                askPrice={listing && listing.id === offerListing ? listing.price : null}
                otherName={th?.other.username ?? ''}
                onAnswer={async (accepted) => {
                  try {
                    await answerOffer(msg.meta?.offerId, accepted);
                  } catch (e) {
                    setError(friendlyError(e, t));
                    return;
                  }
                  submit(accepted ? 'Offre acceptée' : 'Offre refusée', 'offer_answer', { offerId: msg.id, accepted });
                }}
                onRent={() =>
                  offerListing &&
                  set({
                    agreedOffer: { listingId: offerListing, perDay: msg.meta?.perDay ?? 0, offerId: msg.meta?.offerId },
                    activeId: offerListing,
                    screen: 'booking',
                    thread: null,
                  })
                }
              />
            );
          }
          return (
            <Bubble
              key={msg.id}
              m={msg}
              mine={msg.senderId === social.meId}
              onLongPress={() =>
                msg.senderId !== social.meId && set({ socialReport: { kind: 'message', id: msg.id, memberId: msg.senderId } })
              }
            />
          );
        })}
      </ScrollView>

      {blocked ? (
        <View style={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
          <Note>{t('msg.blocked')}</Note>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 10, gap: 8 }}>
          {warn ? <Note tone="accent">{t('msg.offApp')}</Note> : null}
          {error ? (
            <Txt size={13} color={c.plum}>
              {error}
            </Txt>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <PressScale
              onPress={() => setPlaces(true)}
              accessibilityLabel={t('msg.meet')}
              style={{ width: 44, height: 44, borderRadius: 99, backgroundColor: c.surf2, alignItems: 'center', justifyContent: 'center' }}
            >
              <PinIcon size={20} color={c.accent} />
            </PressScale>
            <View style={{ flex: 1, minHeight: 44, borderRadius: 22, backgroundColor: c.surf2, paddingHorizontal: 14, justifyContent: 'center' }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t('msg.placeholder')}
                placeholderTextColor={c.ink3}
                multiline
                maxLength={2000}
                accessibilityLabel={t('msg.placeholder')}
                style={{ ...ff('reg'), fontSize: 16, color: c.ink, paddingVertical: 10, maxHeight: 120, outlineWidth: 0 } as object}
              />
            </View>
            <PressScale
              onPress={() => submit(draft)}
              disabled={!draft.trim()}
              accessibilityLabel={t('msg.send')}
              style={{
                width: 44,
                height: 44,
                borderRadius: 99,
                backgroundColor: draft.trim() ? c.accent : c.surf2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SendIcon size={18} color={draft.trim() ? c.onAccent : c.ink3} />
            </PressScale>
          </View>
        </View>
      )}

      <Sheet visible={places} onClose={() => setPlaces(false)}>
        <Display size={24}>{t('msg.meetTitle')}</Display>
        <Txt size={14} color={c.ink2} style={{ marginTop: 6 }}>
          {t('msg.meetBody')}
        </Txt>
        <View style={{ marginTop: 12, gap: 6 }}>
          {MEETING_PLACES.map((p) => (
            <PressScale
              key={p.place}
              scaleTo={0.98}
              onPress={() => {
                setPlaces(false);
                submit(p.place, 'meetpoint', { place: p.place, area: p.area });
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: c.surf2 }}
            >
              <PinIcon size={18} color={c.accent} />
              <View style={{ flex: 1 }}>
                <Txt weight="semi">{p.place}</Txt>
                <Txt size={12} color={c.ink3}>
                  {p.area}
                </Txt>
              </View>
            </PressScale>
          ))}
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

export function Messages() {
  const { state } = useStore();
  return state.thread ? <Conversation id={state.thread} /> : <Inbox />;
}
