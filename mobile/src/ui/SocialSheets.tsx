/**
 * Sheets shared by the feed, Explorer, the post screen and profiles:
 * comments, save to a board, the "+" chooser, and report / block.
 */
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useListings } from '../data/listings';
import { SOCIAL_REPORT_REASONS, useComments, useMember, useSocial, type SocialReportReason } from '../data/social';
import { useT, type TranslationKey } from '../i18n';
import { useStore } from '../state/store';
import { FONT, ff } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { BookmarkIcon, CameraIcon, PlusIcon, SendIcon, TabAddIcon } from './icons';
import { Check, Display, Field, GhostButton, PrimaryButton, Row, Sheet, Txt } from './kit';
import { Avatar, FadeIn, PressScale, tap, timeAgo } from './motion';
import { BlockRow } from './Moderation';

// ─── Comments ──────────────────────────────────────────────────

export function CommentsSheet() {
  const { state, set } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const social = useSocial();
  const post = social.postById(state.commentsFor);
  const { comments, add, remove } = useComments(state.commentsFor);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setDraft(''), [state.commentsFor]);

  const send = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      await add(draft);
      tap('light');
      setDraft('');
    } finally {
      setBusy(false);
    }
  };

  const close = () => set({ commentsFor: null });

  return (
    <Sheet visible={!!state.commentsFor} onClose={close}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Display size={26}>{t('comments.title')}</Display>
        <Txt size={13} color={c.ink3}>
          {comments.length}
        </Txt>
      </View>
      <Txt size={12} color={c.ink3} style={{ marginTop: 4 }}>
        {t('comments.rules')}
      </Txt>

      <View style={{ marginTop: 14, gap: 14 }}>
        {comments.length === 0 ? (
          <Txt color={c.ink2} style={{ paddingVertical: 20 }} center>
            {t('comments.empty')}
          </Txt>
        ) : (
          comments.map((cm, i) => {
            const mine = cm.authorId === social.meId;
            const canDelete = mine || post?.authorId === social.meId;
            return (
              <FadeIn key={cm.id} delay={Math.min(i, 6) * 40} style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={() => set({ commentsFor: null, screen: 'user', profileId: cm.authorId })}>
                  <Avatar uri={cm.author.avatar} size={34} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'baseline' }}>
                    <Txt size={13} weight="bold">
                      {cm.author.username}
                    </Txt>
                    <Txt size={12} color={c.ink3}>
                      {timeAgo(cm.createdAt, lang)}
                    </Txt>
                  </View>
                  <Txt size={14} color={c.ink2} style={{ marginTop: 1 }}>
                    {cm.body}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 3 }}>
                    {!mine ? (
                      <Pressable
                        hitSlop={8}
                        onPress={() => set({ commentsFor: null, socialReport: { kind: 'comment', id: cm.id, memberId: cm.authorId } })}
                      >
                        <Txt size={12} weight="semi" color={c.ink3}>
                          {t('comments.report')}
                        </Txt>
                      </Pressable>
                    ) : null}
                    {canDelete ? (
                      <Pressable hitSlop={8} onPress={() => remove(cm.id)}>
                        <Txt size={12} weight="semi" color={c.plum}>
                          {t('comments.delete')}
                        </Txt>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </FadeIn>
            );
          })
        )}
      </View>

      <View
        style={{
          marginTop: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 14,
          paddingRight: 6,
          minHeight: 50,
          borderRadius: 999,
          backgroundColor: c.surf2,
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('comments.placeholder')}
          placeholderTextColor={c.ink3}
          maxLength={500}
          onSubmitEditing={send}
          returnKeyType="send"
          style={{ flex: 1, ...ff('med'), fontSize: 15, color: c.ink, paddingVertical: 10 }}
        />
        <PressScale
          onPress={send}
          disabled={!draft.trim() || busy}
          accessibilityLabel={t('comments.send')}
          style={{
            width: 38,
            height: 38,
            borderRadius: 99,
            backgroundColor: draft.trim() ? c.accent : c.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SendIcon size={17} color={c.onAccent} />
        </PressScale>
      </View>
    </Sheet>
  );
}

// ─── Save to board ────────────────────────────────────────────

export function SaveSheet() {
  const { state, set } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const social = useSocial();
  const { byId } = useListings();
  const target = state.saveTarget;
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setName('');
    setCreating(false);
  }, [target?.id]);

  const cover = (items: { kind: 'post' | 'listing'; id: string }[]) => {
    const first = items[0];
    if (!first) return null;
    return first.kind === 'post' ? social.postById(first.id)?.media[0] : byId(first.id)?.photos[0];
  };

  const toggle = async (boardId: string, on: boolean) => {
    if (!target) return;
    tap(on ? 'light' : 'success');
    if (on) await social.removeFrom(boardId, target);
    else await social.saveTo(boardId, target);
  };

  const create = async () => {
    if (!target || !name.trim()) return;
    const board = await social.createBoard(name);
    await social.saveTo(board.id, target);
    tap('success');
    setName('');
    setCreating(false);
  };

  return (
    <Sheet visible={!!target} onClose={() => set({ saveTarget: null })}>
      <Display size={26}>{t('save.title')}</Display>
      <View style={{ marginTop: 14, gap: 8 }}>
        {social.boards.map((b) => {
          const on = !!target && b.items.some((i) => i.kind === target.kind && i.id === target.id);
          const uri = cover(b.items);
          return (
            <PressScale
              key={b.id}
              onPress={() => toggle(b.id, on)}
              scaleTo={0.98}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 8,
                borderRadius: 16,
                backgroundColor: on ? c.accentSoft : c.surf2,
              }}
            >
              <View style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', backgroundColor: c.line }}>
                {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Txt weight="semi">{b.name}</Txt>
                <Txt size={12} color={c.ink3}>
                  {b.items.length} {t('save.items')} · {b.isPrivate ? t('save.private') : t('save.public')}
                </Txt>
              </View>
              <Check on={on} />
            </PressScale>
          );
        })}
      </View>

      {creating ? (
        <FadeIn style={{ marginTop: 12, gap: 10 }}>
          <Field label={t('save.new')} value={name} onChangeText={setName} placeholder={t('save.newPlaceholder')} autoCapitalize="sentences" />
          <PrimaryButton label={t('save.create')} onPress={create} disabled={!name.trim()} />
        </FadeIn>
      ) : (
        <PressScale
          onPress={() => setCreating(true)}
          style={{
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 8,
            borderRadius: 16,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: c.line2,
          }}
        >
          <View style={{ width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surf2 }}>
            <PlusIcon color={c.accent} />
          </View>
          <Txt weight="semi" color={c.accent}>
            {t('save.new')}
          </Txt>
        </PressScale>
      )}
    </Sheet>
  );
}

// ─── The "+" chooser ──────────────────────────────────────────

export function CreateSheet() {
  const { state, set } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const option = (icon: React.ReactNode, title: string, body: string, onPress: () => void, delay: number) => (
    <FadeIn delay={delay}>
      <PressScale
        onPress={onPress}
        haptic="light"
        scaleTo={0.97}
        style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 16, borderRadius: 20, backgroundColor: c.surf2 }}
      >
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={16} weight="bold">
            {title}
          </Txt>
          <Txt size={13} color={c.ink2}>
            {body}
          </Txt>
        </View>
      </PressScale>
    </FadeIn>
  );
  return (
    <Sheet visible={state.createSheet} onClose={() => set({ createSheet: false })}>
      <Display size={28}>{t('create.title')}</Display>
      <View style={{ marginTop: 16, gap: 10 }}>
        {option(<CameraIcon color={c.onAccent} />, t('create.post'), t('create.postBody'), () => set({ createSheet: false, screen: 'compose' }), 0)}
        {option(<TabAddIcon color={c.onAccent} />, t('create.list'), t('create.listBody'), () => set({ createSheet: false, screen: 'list' }), 70)}
      </View>
    </Sheet>
  );
}

// ─── Report and block ─────────────────────────────────────────

export function SocialReportSheet() {
  const { state, set } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const social = useSocial();
  const target = state.socialReport;
  const member = useMember(target?.memberId ?? null);
  const [reason, setReason] = useState<SocialReportReason | null>(null);
  const [note, setNote] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason(null);
    setNote('');
    setAlsoBlock(false);
    setSent(false);
    setError(null);
  }, [target?.id]);

  const close = () => set({ socialReport: null });

  const send = async () => {
    if (!target || !reason) return;
    setBusy(true);
    setError(null);
    try {
      await social.report({ kind: target.kind, id: target.id }, reason, note);
      if (alsoBlock) await social.block(target.memberId);
      tap('success');
      setSent(true);
    } catch {
      setError(t('report.failed'));
    } finally {
      setBusy(false);
    }
  };

  const reasonLabel = (r: SocialReportReason) =>
    r === 'harassment' ? t('sreport.reason.harassment') : t(`report.reason.${r}` as TranslationKey);

  return (
    <Sheet visible={!!target} onClose={close}>
      <Display size={26}>{t('sreport.title')}</Display>
      {sent ? (
        <FadeIn>
          <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
            {t('sreport.thanks')}
          </Txt>
          {alsoBlock ? (
            <Txt size={14} weight="semi" color={c.accent} style={{ marginTop: 8 }}>
              {t('sreport.blocked')}
            </Txt>
          ) : null}
          <GhostButton label={t('common.close')} onPress={close} style={{ marginTop: 18 }} />
        </FadeIn>
      ) : (
        <>
          <View style={{ marginTop: 12, borderRadius: 20, backgroundColor: c.surf2, overflow: 'hidden' }}>
            {SOCIAL_REPORT_REASONS.map((r, i) => (
              <Row
                key={r}
                label={reasonLabel(r)}
                checked={reason === r}
                onPress={() => setReason(r)}
                last={i === SOCIAL_REPORT_REASONS.length - 1}
              />
            ))}
          </View>
          {reason ? (
            <Field
              label={t('report.noteLabel')}
              value={note}
              onChangeText={setNote}
              placeholder={t('report.notePlaceholder')}
              autoCapitalize="sentences"
              multiline
            />
          ) : null}
          {error ? (
            <Txt size={13} color={c.plum}>
              {error}
            </Txt>
          ) : null}
          <PrimaryButton
            label={busy ? t('common.loading') : t('report.send')}
            onPress={send}
            disabled={!reason || busy}
            style={{ marginTop: 14 }}
          />
          {target ? <BlockRow memberId={target.memberId} username={member?.username ?? '…'} onDone={close} /> : null}
        </>
      )}
    </Sheet>
  );
}

export function SaveBadge({ saved }: { saved: boolean }) {
  const { c } = useTheme();
  return <BookmarkIcon size={18} color={saved ? c.accent : c.ink3} fill={saved ? c.accent : 'none'} />;
}
