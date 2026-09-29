/**
 * "Décisions de modération" (DSA art. 17 and 20): every decision Rota took
 * on the member's content or account, why, whether a person or an automated
 * check took it, and a way to contest it within six months. Rows come from
 * moderation_notices (migration 015); contesting calls
 * appeal_moderation_notice(), which a person at Rota then decides.
 */
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSocial } from '../data/social';
import { useT, type TranslationKey } from '../i18n';
import { supabase } from '../lib/supabase';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { FlatHelp, FlatPage, FlatSection, Pill } from '../ui/Flat';
import { Display, Field, PrimaryButton, Sheet, Txt } from '../ui/kit';
import { timeAgo } from '../ui/motion';

type Subject = 'listing' | 'post' | 'comment' | 'message' | 'account';
type Action = 'limited' | 'removed' | 'hidden' | 'suspended';
type AppealState = 'none' | 'open' | 'upheld' | 'overturned';

interface Notice {
  id: string;
  subject: Subject;
  action: Action;
  reason: string;
  explanation: string | null;
  excerpt: string | null;
  automated: boolean;
  createdAt: string;
  appealState: AppealState;
  appealNote: string | null;
}

const REASONS = [
  'reported',
  'off_topic',
  'synthetic_suspected',
  'not_original',
  'duplicate',
  'unsafe',
  'counterfeit_risk',
  'needs_review',
  'harassment',
  'scam',
  'inappropriate',
];
const APPEAL_WINDOW_MS = 183 * 24 * 3600e3;

/** One sample decision so the demo shows what the page looks like. */
const demoNotices = (): Notice[] => [
  {
    id: 'demo-notice-1',
    subject: 'comment',
    action: 'hidden',
    reason: 'reported',
    explanation: null,
    excerpt: 'Franchement cette robe ne te va pas du tout…',
    automated: true,
    createdAt: new Date(Date.now() - 2 * 24 * 3600e3).toISOString(),
    appealState: 'none',
    appealNote: null,
  },
];

function useNotices() {
  const social = useSocial();
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (social.demo || !supabase) {
      setNotices((cur) => cur ?? demoNotices());
      return;
    }
    let cancelled = false;
    supabase
      .from('moderation_notices')
      .select('id, subject_kind, action, reason, explanation, excerpt, automated, created_at, appeal_state, appeal_note')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (cancelled) return;
        setNotices(
          ((data ?? []) as {
            id: string;
            subject_kind: Subject;
            action: Action;
            reason: string;
            explanation: string | null;
            excerpt: string | null;
            automated: boolean;
            created_at: string;
            appeal_state: AppealState;
            appeal_note: string | null;
          }[]).map((n) => ({
            id: n.id,
            subject: n.subject_kind,
            action: n.action,
            reason: n.reason,
            explanation: n.explanation,
            excerpt: n.excerpt,
            automated: n.automated,
            createdAt: n.created_at,
            appealState: n.appeal_state,
            appealNote: n.appeal_note,
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [social.demo, tick]);

  const appeal = useCallback(
    async (id: string, message: string) => {
      if (social.demo || !supabase) {
        setNotices((cur) => (cur ?? []).map((n) => (n.id === id ? { ...n, appealState: 'open' } : n)));
        return;
      }
      const { error } = await supabase.rpc('appeal_moderation_notice', { p_notice: id, p_message: message.trim() });
      if (error) throw new Error(error.message);
      setTick((n) => n + 1);
    },
    [social.demo],
  );

  return { notices, appeal };
}

export function ModerationDecisions() {
  const { go } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const { notices, appeal } = useNotices();
  const [contesting, setContesting] = useState<Notice | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!contesting || busy) return;
    if (message.trim().length < 10) return setError(t('moderation.appealTooShort'));
    setBusy(true);
    setError(null);
    try {
      await appeal(contesting.id, message);
      setContesting(null);
      setMessage('');
    } catch {
      setError(t('moderation.appealFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlatPage title={t('decisions.title')} onBack={() => go('settings')}>
      <FlatHelp>{t('decisions.intro')}</FlatHelp>

      {notices && notices.length === 0 ? (
        <FlatSection first>
          <Txt center color={c.ink3} style={{ paddingVertical: 28, paddingHorizontal: 18 }}>
            {t('decisions.empty')}
          </Txt>
        </FlatSection>
      ) : null}

      {(notices ?? []).map((n, i) => {
        const reason = REASONS.includes(n.reason) ? n.reason : 'other';
        const canAppeal = n.appealState === 'none' && Date.now() - new Date(n.createdAt).getTime() < APPEAL_WINDOW_MS;
        return (
          <FlatSection key={n.id} first={i === 0}>
            <View style={{ paddingHorizontal: 18, paddingVertical: 16, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt size={16} weight="bold" style={{ flex: 1 }}>
                  {t(`decisions.subject.${n.subject}` as TranslationKey)} · {t(`decisions.action.${n.action}` as TranslationKey)}
                </Txt>
                <Txt size={12} color={c.ink3}>
                  {timeAgo(n.createdAt, lang)}
                </Txt>
              </View>
              {n.excerpt ? (
                <Txt size={14} color={c.ink2} numberOfLines={2} style={{ fontStyle: 'italic' }}>
                  « {n.excerpt} »
                </Txt>
              ) : null}
              <Txt size={14}>{n.explanation ?? t(`decisions.reason.${reason}` as TranslationKey)}</Txt>
              <Txt size={12} color={c.ink3}>
                {n.automated ? t('decisions.automated') : t('decisions.human')} · {t('decisions.basis')}
              </Txt>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                {canAppeal ? (
                  <Pill
                    label={t('moderation.appeal')}
                    onPress={() => {
                      setError(null);
                      setMessage('');
                      setContesting(n);
                    }}
                  />
                ) : (
                  <Txt size={13} weight="semi" color={n.appealState === 'overturned' ? c.accent : c.ink2}>
                    {t(`decisions.appeal.${n.appealState === 'none' ? 'closed' : n.appealState}` as TranslationKey)}
                  </Txt>
                )}
              </View>
              {n.appealNote ? (
                <Txt size={13} color={c.ink2}>
                  {n.appealNote}
                </Txt>
              ) : null}
            </View>
          </FlatSection>
        );
      })}

      <Sheet visible={!!contesting} onClose={() => setContesting(null)}>
        <Display size={26}>{t('moderation.appealTitle')}</Display>
        <Txt size={14} color={c.ink2} style={{ marginTop: 8 }}>
          {t('decisions.appealHelp')}
        </Txt>
        <View style={{ marginTop: 14 }}>
          <Field
            label={t('moderation.appealLabel')}
            value={message}
            onChangeText={setMessage}
            multiline
            autoCapitalize="sentences"
          />
        </View>
        {error ? (
          <Txt size={13} color={c.plum} style={{ marginTop: 8 }}>
            {error}
          </Txt>
        ) : null}
        <PrimaryButton label={busy ? t('common.loading') : t('moderation.appealSend')} disabled={busy} onPress={send} style={{ marginTop: 14 }} />
      </Sheet>
    </FlatPage>
  );
}
