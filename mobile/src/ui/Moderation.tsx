import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useListing, type Listing } from '../data/listings';
import { useT, type TranslationKey } from '../i18n';
import { useAuth } from '../lib/auth';
import { appealListing, hasOpenAppeal, REPORT_REASONS, reportListing, type ReportReason } from '../lib/moderation';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { Display, Field, GhostButton, PrimaryButton, Radio, Sheet, Txt } from './kit';

/** Why a listing is not in the feed, in the member's language. */
function reasonText(t: (k: TranslationKey) => string, listing: Listing) {
  if (listing.distribution === 'pending') return t('moderation.pendingHelp');
  if (listing.distributionReason && listing.distributionReason !== 'other') {
    return t(`moderation.reason.${listing.distributionReason}` as TranslationKey);
  }
  // Reasons a person at Rota wrote by hand come through as a note.
  return listing.distributionNote ?? t('moderation.reason.other');
}

/**
 * Shown to the owner only, on listings that are not distributed. Members
 * are told plainly when their reach is limited and why — silent demotion
 * isn't allowed for EU users (DSA art. 17) and makes appeals impossible.
 */
export function DistributionStatus({ listing, onAppeal }: { listing: Listing; onAppeal: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  if (listing.distribution === 'public') return null;

  const tone =
    listing.distribution === 'blocked' ? c.plum : listing.distribution === 'limited' ? c.accent : c.ink3;
  return (
    <View style={{ marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: c.surf2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: tone }} />
        <Txt size={12} weight="bold" upper color={tone}>
          {t(`moderation.state.${listing.distribution}` as TranslationKey)}
        </Txt>
      </View>
      <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
        {reasonText(t, listing)}
      </Txt>
      {listing.distribution !== 'pending' ? (
        <Pressable onPress={onAppeal} hitSlop={8} style={{ marginTop: 6 }}>
          <Txt size={13} weight="semi" color={c.accent}>
            {t('moderation.appeal')}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AppealSheet({ listing, onClose }: { listing: Listing | null; onClose: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'open'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessage('');
    setError(null);
    setState('idle');
    if (listing) hasOpenAppeal(listing.id).then((open) => open && setState('open')).catch(() => undefined);
  }, [listing]);

  const send = async () => {
    if (!listing) return;
    if (message.trim().length < 10) return setError(t('moderation.appealTooShort'));
    setState('sending');
    setError(null);
    try {
      await appealListing(listing.id, message);
      setState('sent');
    } catch (e) {
      if (e instanceof Error && e.message === 'appeal_open') setState('open');
      else {
        setError(t('moderation.appealFailed'));
        setState('idle');
      }
    }
  };

  return (
    <Sheet visible={!!listing} onClose={onClose}>
      <Display size={26}>{t('moderation.appealTitle')}</Display>
      {state === 'sent' || state === 'open' ? (
        <>
          <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
            {t(state === 'sent' ? 'moderation.appealSent' : 'moderation.appealAlreadyOpen')}
          </Txt>
          <GhostButton label={t('common.close')} onPress={onClose} style={{ marginTop: 18 }} />
        </>
      ) : (
        <>
          <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
            {t('moderation.appealHelp')}
          </Txt>
          <View style={{ marginTop: 14 }}>
            <Field
              label={t('moderation.appealLabel')}
              value={message}
              onChangeText={setMessage}
              placeholder={t('moderation.appealPlaceholder')}
              autoCapitalize="sentences"
              multiline
            />
          </View>
          {error ? (
            <Txt size={13} color={c.plum} style={{ marginTop: 8 }}>
              {error}
            </Txt>
          ) : null}
          <PrimaryButton
            label={state === 'sending' ? t('common.loading') : t('moderation.appealSend')}
            onPress={send}
            disabled={state === 'sending'}
            style={{ marginTop: 16 }}
          />
        </>
      )}
    </Sheet>
  );
}

/** "Signaler" from the feed or a listing page. */
export function ReportSheet() {
  const { state, set } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session } = useAuth();
  const listing = useListing(state.report ? state.activeId : null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.report) return;
    setReason(null);
    setNote('');
    setError(null);
  }, [state.report]);

  const close = () => set({ report: false, reportSent: false });
  const own = !!listing && listing.ownerId === session?.user.id;

  const send = async () => {
    if (!listing || !reason) return;
    setBusy(true);
    setError(null);
    try {
      await reportListing(listing.id, reason, note);
      set({ reportSent: true });
    } catch {
      setError(t('report.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={state.report} onClose={close}>
      <Display size={26}>{t('report.title')}</Display>
      {state.reportSent ? (
        <>
          <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
            {t('report.thanks')}
          </Txt>
          <GhostButton label={t('common.close')} onPress={close} style={{ marginTop: 18 }} />
        </>
      ) : !session ? (
        <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
          {t('report.signIn')}
        </Txt>
      ) : !listing || own ? (
        <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
          {t(own ? 'report.own' : 'report.gone')}
        </Txt>
      ) : (
        <>
          <Txt size={14} color={c.ink2} style={{ marginTop: 6 }}>
            {t('report.help')}
          </Txt>
          <View style={{ marginTop: 12, gap: 2 }}>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}
              >
                <Radio on={reason === r} />
                <Txt size={15} style={{ flex: 1 }}>
                  {t(`report.reason.${r}` as TranslationKey)}
                </Txt>
              </Pressable>
            ))}
          </View>
          {reason ? (
            <View style={{ marginTop: 8 }}>
              <Field
                label={t('report.noteLabel')}
                value={note}
                onChangeText={setNote}
                placeholder={t('report.notePlaceholder')}
                autoCapitalize="sentences"
                multiline
              />
            </View>
          ) : null}
          {error ? (
            <Txt size={13} color={c.plum} style={{ marginTop: 8 }}>
              {error}
            </Txt>
          ) : null}
          <PrimaryButton
            label={busy ? t('common.loading') : t('report.send')}
            onPress={send}
            disabled={!reason || busy}
            style={{ marginTop: 16 }}
          />
        </>
      )}
    </Sheet>
  );
}
