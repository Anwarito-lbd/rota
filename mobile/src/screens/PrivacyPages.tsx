/**
 * The pages behind Confidentialité: muted and restricted accounts, hidden
 * words and the reviews they held back, and the 30-day bin. Every account
 * is public, so there is no follow-request page.
 */
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
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
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/errors';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { FlatHelp, FlatPage, FlatRow, FlatSection, FlatToggle } from '../ui/Flat';
import { Field, GhostButton, Txt } from '../ui/kit';

// ── Building blocks ────────────────────────────────────────────

/** Loading, load error (with a retry) or empty: whatever the list can't show yet. */
function ListState({ loading, error, empty, onRetry }: { loading: boolean; error: string | null; empty: boolean; onRetry: () => void }) {
  const { t } = useT();
  const { c } = useTheme();
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
function ActionError({ message }: { message: string | null }) {
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

/** Runs an action and turns a failure into a line the member understands. */
function useAction() {
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<unknown>) => {
    setError(null);
    action().catch((e) => setError(friendlyError(e, t)));
  };
  return { error, setError, run };
}

// ── Comptes en sourdine ────────────────────────────────────────

export function MutedAccounts() {
  const { t } = useT();
  const { go } = useStore();
  const [items, reload, loadError, loading] = useMutes();
  const { error, run } = useAction();
  return (
    <FlatPage title={t('priv.muted')} onBack={() => go('set.privacy')}>
      <FlatSection first>
        <ListState loading={loading} error={loadError} empty={items.length === 0} onRetry={reload} />
        {items.map((m, i) => (
          <MemberLine key={m.id} m={m} action={t('priv.unmute')} last={i === items.length - 1} onPress={() => run(() => setMute(m, false, false))} />
        ))}
      </FlatSection>
      <ActionError message={error} />
    </FlatPage>
  );
}

// ── Comptes limités ────────────────────────────────────────────

export function RestrictedAccounts() {
  const { t } = useT();
  const { go } = useStore();
  const [items, reload, loadError, loading] = useRestricts();
  const { error, run } = useAction();
  return (
    <FlatPage title={t('priv.restricted')} onBack={() => go('set.privacy')}>
      <FlatSection first>
        <ListState loading={loading} error={loadError} empty={items.length === 0} onRetry={reload} />
        {items.map((m, i) => (
          <MemberLine key={m.id} m={m} action={t('priv.unrestrict')} last={i === items.length - 1} onPress={() => run(() => setRestrict(m, false))} />
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
  const { go } = useStore();
  const { c } = useTheme();
  const { session, profile, refreshProfile } = useAuth();
  const [words, reloadWords, wordsError, wordsLoading] = useHiddenWords();
  const [reviews, reloadReviews, reviewsError, reviewsLoading] = useHiddenReviews();
  const [draft, setDraft] = useState('');
  const [defaults, setDefaults] = useState(profile?.hideDefaultWords ?? true);
  const { error, setError, run } = useAction();

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
      setError(friendlyError(e, t));
    }
  };

  // A word already in the list (or too short) is ignored by addHiddenWord.
  const add = () => run(() => addHiddenWord(draft).then(() => setDraft('')));

  return (
    <FlatPage title={t('priv.hiddenWords')} onBack={() => go('set.privacy')}>
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
            accessibilityLabel={`${t('common.delete')} « ${w} »`}
            right={
              <Txt size={15} color={c.plum}>
                {t('common.delete')}
              </Txt>
            }
            onPress={() => run(() => removeHiddenWord(w))}
          />
        ))}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 18, paddingTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="" value={draft} onChangeText={setDraft} placeholder={t('priv.addWord')} />
          </View>
          <GhostButton label={t('common.add')} tone="accent" onPress={add} />
        </View>
        <FlatHelp>{t('priv.wordHint')}</FlatHelp>
      </FlatSection>

      <FlatSection title={t('priv.hiddenReviews')}>
        <FlatHelp>{t('priv.hiddenReviewsHelp')}</FlatHelp>
        <ListState loading={reviewsLoading} error={reviewsError} empty={reviews.length === 0} onRetry={reloadReviews} />
        {reviews.map((r, i) => (
          <FlatRow
            key={r.id}
            label={r.author}
            sub={r.body}
            accessibilityLabel={`${t('priv.show')} : ${r.author}, ${r.body}`}
            right={
              <Txt size={15} weight="semi" color={c.accent}>
                {t('priv.show')}
              </Txt>
            }
            onPress={() => run(() => approveHiddenReview(r.id))}
            last={i === reviews.length - 1}
          />
        ))}
      </FlatSection>
      <ActionError message={error} />
    </FlatPage>
  );
}

// ── Récemment supprimé ─────────────────────────────────────────

export function RecentlyDeleted() {
  const { t } = useT();
  const { go } = useStore();
  const { c } = useTheme();
  const [items, reload, loadError, loading] = useRecentlyDeleted();
  const { error, run } = useAction();
  return (
    <FlatPage title={t('priv.bin')} onBack={() => go('set.privacy')}>
      <FlatHelp>{t('priv.binHelp')}</FlatHelp>
      <ListState loading={loading} error={loadError} empty={items.length === 0} onRetry={reload} />
      {items.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 2 }}>
          {items.map((it) => {
            const left = t('priv.daysLeft').replace('{n}', String(daysLeft(it.deletedAt)));
            return (
              <Pressable
                key={it.id}
                accessibilityRole="button"
                accessibilityLabel={`${t('priv.restore')}, ${left}`}
                onPress={() => run(() => restoreFromBin(it))}
                style={({ pressed }) => ({ width: '32.6%', aspectRatio: 0.8, backgroundColor: c.surf2, opacity: pressed ? 0.7 : 1 })}
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
                    {left}
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
