/**
 * The pages behind Confidentialité: muted and restricted accounts, hidden
 * words and the reviews they held back, and the 30-day bin. Every account
 * is public, so there is no follow-request page.
 */
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Image, Pressable, View } from 'react-native';
import {
  addHiddenWord,
  approveHiddenReview,
  daysLeft,
  removeHiddenWord,
  restoreFromBin,
  setMute,
  setRestrict,
  useHiddenReviews,
  useHiddenWords,
  useMutes,
  useRecentlyDeleted,
  useRestricts,
  type MiniMember,
} from '../data/privacy';
import { saveProfile } from '../data/account';
import { useT, type TranslationKey } from '../i18n';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/errors';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { FlatHelp, FlatPage, FlatRow, FlatSection, FlatToggle } from '../ui/Flat';
import { Field, GhostButton, Txt } from '../ui/kit';

// ── Building blocks ────────────────────────────────────────────

/** Fills `{name}` placeholders in a translated template. */
const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (all, k: string) => (k in values ? String(values[k]) : all));

/** Days left in the bin, as "{n} jours", "1 jour" or "moins d'un jour". */
function leftText(t: (k: TranslationKey) => string, n: number, base: 'priv.daysLeft' | 'priv.timeLeft') {
  if (n <= 0) return t(`${base}None` as TranslationKey);
  if (n === 1) return t(`${base}One` as TranslationKey);
  return fill(t(base), { n });
}

/** Loading, load error (with a retry) or empty: whatever the list can't show yet. */
function ListState({ loading, error, empty, onRetry }: { loading: boolean; error: string | null; empty: boolean; onRetry: () => void }) {
  const { t } = useT();
  const { c } = useTheme();
  // Live regions are Android-only; announce so VoiceOver hears it too.
  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(t('error.generic'));
  }, [error, t]);
  if (error) {
    return (
      <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <Txt size={14} color={c.plum} style={{ flex: 1 }}>
          {t('error.generic')}
        </Txt>
        <GhostButton label={t('common.retry')} onPress={onRetry} />
      </View>
    );
  }
  if (loading && empty) {
    return <ActivityIndicator color={c.accent} accessibilityLabel={t('common.loading')} style={{ padding: 18 }} />;
  }
  if (empty) {
    return (
      <Txt size={14} color={c.ink3} style={{ padding: 18 }}>
        {t('priv.empty')}
      </Txt>
    );
  }
  return null;
}

/** A one-line error after an action that didn't go through. */
export function ActionError({ message }: { message: string | null }) {
  const { c } = useTheme();
  if (!message) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ paddingHorizontal: 18, paddingVertical: 10 }}>
      <Txt size={13} color={c.plum}>
        {message}
      </Txt>
    </View>
  );
}

function MemberLine({ m, action, onPress, last }: { m: MiniMember; action: string; onPress: () => void; last?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 99, backgroundColor: c.surf2, overflow: 'hidden' }}>
        {m.avatar ? <Image source={{ uri: m.avatar }} style={{ width: 40, height: 40 }} accessibilityIgnoresInvertColors /> : null}
      </View>
      <Txt size={16} weight="semi" style={{ flex: 1 }} numberOfLines={1}>
        {m.username}
      </Txt>
      <GhostButton label={action} accessibilityLabel={`${action} ${m.username}`} onPress={onPress} />
    </View>
  );
}

/**
 * Runs an action and turns a failure into a line the member understands
 * (also read out). With an id, a second tap on the same item while the
 * first is still running is ignored.
 */
export function useAction() {
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(new Set<string>());
  const [, setPendingCount] = useState(0);
  const fail = (message: string) => {
    setError(message);
    AccessibilityInfo.announceForAccessibility(message);
  };
  const run = (action: () => Promise<unknown>, id?: string) => {
    if (id) {
      if (pending.current.has(id)) return;
      pending.current.add(id);
      setPendingCount(pending.current.size);
    }
    setError(null);
    action()
      .catch((e) => fail(friendlyError(e, t)))
      .finally(() => {
        if (!id) return;
        pending.current.delete(id);
        setPendingCount(pending.current.size);
      });
  };
  const isPending = (id: string) => pending.current.has(id);
  return { error, setError, fail, run, isPending };
}

// ── Comptes en sourdine ────────────────────────────────────────

export function MutedAccounts() {
  const { t } = useT();
  const { back } = useStore();
  const [items, reload, loadError, loading] = useMutes();
  const { error, run } = useAction();
  return (
    <FlatPage title={t('priv.muted')} onBack={() => back('set.privacy')}>
      <FlatSection first>
        <ListState loading={loading} error={loadError} empty={items.length === 0} onRetry={reload} />
        {items.map((m, i) => (
          <MemberLine key={m.id} m={m} action={t('priv.unmute')} last={i === items.length - 1} onPress={() => run(() => setMute(m, false, false), m.id)} />
        ))}
      </FlatSection>
      <ActionError message={error} />
    </FlatPage>
  );
}

// ── Comptes limités ────────────────────────────────────────────

export function RestrictedAccounts() {
  const { t } = useT();
  const { back } = useStore();
  const [items, reload, loadError, loading] = useRestricts();
  const { error, run } = useAction();
  return (
    <FlatPage title={t('priv.restricted')} onBack={() => back('set.privacy')}>
      <FlatSection first>
        <ListState loading={loading} error={loadError} empty={items.length === 0} onRetry={reload} />
        {items.map((m, i) => (
          <MemberLine key={m.id} m={m} action={t('priv.unrestrict')} last={i === items.length - 1} onPress={() => run(() => setRestrict(m, false), m.id)} />
        ))}
      </FlatSection>
      <FlatHelp>{t('priv.restrictedHelp')}</FlatHelp>
      <ActionError message={error} />
    </FlatPage>
  );
}

// ── Mots masqués et avis masqués ───────────────────────────────

export function HiddenWords() {
  const { t } = useT();
  const { back } = useStore();
  const { c } = useTheme();
  const { session, profile, refreshProfile } = useAuth();
  const [words, reloadWords, wordsError, wordsLoading] = useHiddenWords();
  const [reviews, reloadReviews, reviewsError, reviewsLoading] = useHiddenReviews();
  const [draft, setDraft] = useState('');
  const [defaults, setDefaults] = useState(profile?.hideDefaultWords ?? true);
  useEffect(() => {
    if (profile) setDefaults(profile.hideDefaultWords);
  }, [profile]);
  const { error, setError, fail, run, isPending } = useAction();

  const toggleDefaults = async () => {
    const next = !defaults;
    setDefaults(next);
    setError(null);
    if (!session) return;
    try {
      await saveProfile(session.user.id, { hideDefaultWords: next });
      refreshProfile();
    } catch (e) {
      setDefaults(!next);
      fail(friendlyError(e, t));
    }
  };

  // Same rule as addHiddenWord; a word already in the list is ignored there.
  const add = () => {
    const length = draft.trim().length;
    if (length < 2 || length > 40) return fail(t('priv.wordLength'));
    run(() => addHiddenWord(draft).then(() => setDraft('')));
  };

  return (
    <FlatPage title={t('priv.hiddenWords')} onBack={() => back('set.privacy')}>
      <FlatSection first>
        <FlatToggle label={t('priv.defaultWords')} on={defaults} onPress={toggleDefaults} last />
      </FlatSection>

      <FlatSection title={t('priv.hiddenWords')}>
        {/* No "empty" line here: the field right below is the empty state. */}
        <ListState loading={wordsLoading} error={wordsError} empty={wordsLoading && words.length === 0} onRetry={reloadWords} />
        {words.map((w) => (
          <FlatRow
            key={w}
            label={w}
            accessibilityLabel={fill(t('priv.deleteWordA11y'), { word: w })}
            right={
              <Txt size={15} color={c.plum}>
                {t('common.delete')}
              </Txt>
            }
            onPress={() => run(() => removeHiddenWord(w), w)}
          />
        ))}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 18, paddingTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="" value={draft} onChangeText={setDraft} placeholder={t('priv.addWord')} />
          </View>
          <GhostButton label={t('common.add')} tone="accent" onPress={add} />
        </View>
        <ActionError message={error} />
        <FlatHelp>{t('priv.wordHint')}</FlatHelp>
      </FlatSection>

      <FlatSection title={t('priv.hiddenReviews')}>
        <FlatHelp>{t('priv.hiddenReviewsHelp')}</FlatHelp>
        <ListState loading={reviewsLoading} error={reviewsError} empty={reviews.length === 0} onRetry={reloadReviews} />
        {reviews.map((r, i) => (
          <View key={r.id} style={{ opacity: isPending(r.id) ? 0.5 : 1 }}>
            <FlatRow
              label={r.author}
              sub={r.body}
              accessibilityLabel={fill(t('priv.showReviewA11y'), { name: r.author, body: r.body })}
              right={
                <Txt size={15} weight="semi" color={c.accent}>
                  {t('priv.show')}
                </Txt>
              }
              onPress={() => run(() => approveHiddenReview(r.id), r.id)}
              last={i === reviews.length - 1}
            />
          </View>
        ))}
      </FlatSection>
    </FlatPage>
  );
}

// ── Récemment supprimé ─────────────────────────────────────────

export function RecentlyDeleted() {
  const { t } = useT();
  const { back } = useStore();
  const { c } = useTheme();
  const [items, reload, loadError, loading] = useRecentlyDeleted();
  const { error, run, isPending } = useAction();
  return (
    <FlatPage title={t('priv.bin')} onBack={() => back('set.privacy')}>
      <FlatHelp>{t('priv.binHelp')}</FlatHelp>
      <ListState loading={loading} error={loadError} empty={items.length === 0} onRetry={reload} />
      {items.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 2 }}>
          {items.map((it) => {
            const n = daysLeft(it.deletedAt);
            const busy = isPending(it.id);
            return (
              <Pressable
                key={it.id}
                accessibilityRole="button"
                accessibilityLabel={fill(t(`priv.restoreA11y.${it.kind}`), { left: leftText(t, n, 'priv.timeLeft') })}
                accessibilityState={{ busy }}
                onPress={() => run(() => restoreFromBin(it), it.id)}
                style={({ pressed }) => ({ width: '32.6%', aspectRatio: 0.8, backgroundColor: c.surf2, opacity: pressed || busy ? 0.6 : 1 })}
              >
                {it.media ? <Image source={{ uri: it.media }} style={{ flex: 1 }} accessibilityIgnoresInvertColors /> : null}
                <View
                  style={{
                    position: 'absolute',
                    left: 6,
                    bottom: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 99,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                  }}
                >
                  <Txt size={11} color="#fff">
                    {leftText(t, n, 'priv.daysLeft')}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <ActionError message={error} />
    </FlatPage>
  );
}
