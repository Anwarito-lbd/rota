/**
 * Messages: the inbox, and a conversation when state.thread is set. Meeting
 * points are picked from a list of public places, never typed addresses;
 * phone numbers, e-mails and payment apps trigger a "keep it in Rota" nudge.
 */
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListing } from '../data/listings';
import { MEETING_PLACES, looksOffApp, useInbox, useThread, type Message } from '../data/messages';
import { useSocial } from '../data/social';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import { ff } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ChevronLeft, DotsIcon, PinIcon, SendIcon, ShieldCheckIcon, TabMessagesIcon } from '../ui/icons';
import { Display, Note, Screen, Sheet, Txt } from '../ui/kit';
import { Avatar, FadeIn, IdBadge, PressScale, Skeleton, tap, timeAgo } from '../ui/motion';

function Inbox() {
  const { set } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const { threads } = useInbox();

  return (
    <Screen>
      <Display size={34}>{t('messages.title')}</Display>
      {threads === null ? (
        <View style={{ marginTop: 20, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={64} radius={20} />
          ))}
        </View>
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
        <View style={{ marginTop: 16, gap: 4 }}>
          {threads.map((th, i) => (
            <FadeIn key={th.id} delay={Math.min(i, 8) * 40}>
              <PressScale
                scaleTo={0.98}
                onPress={() => set({ thread: th.id })}
                accessibilityLabel={`${th.other.username}${th.unread ? `, ${th.unread}` : ''}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 16 }}
              >
                <Avatar uri={th.other.avatar} size={52} />
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
                    {th.lastKind === 'meetpoint' ? `📍 ${th.lastBody}` : (th.lastBody ?? '')}
                  </Txt>
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
          ))}
        </View>
      )}
    </Screen>
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
        {messages.map((msg) => (
          <Bubble
            key={msg.id}
            m={msg}
            mine={msg.senderId === social.meId}
            onLongPress={() =>
              msg.senderId !== social.meId && set({ socialReport: { kind: 'message', id: msg.id, memberId: msg.senderId } })
            }
          />
        ))}
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
