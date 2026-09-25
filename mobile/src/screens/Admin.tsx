/**
 * Rota's back office, inside the app. Visible to staff only (the Settings
 * row checks is_staff()), and every call re-checks on the server: a member
 * who opened this screen some other way gets "Not allowed" from each function.
 */
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useT, type TranslationKey } from '../i18n';
import { friendlyError } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { Card, Chip, Field, GhostButton, Header, PrimaryButton, Screen, Txt } from '../ui/kit';

type Tab = 'moderation' | 'claims' | 'rentals' | 'safety';
const TABS: Tab[] = ['moderation', 'claims', 'rentals', 'safety'];
const PHAROS = 'https://www.internet-signalement.gouv.fr';

function db() {
  if (!supabase) throw new Error('server_not_configured');
  return supabase;
}

/** Private files (frames, evidence, receipts) open through short-lived links. */
async function fileUrl(bucket: string, path: string) {
  if (bucket === 'listing-media') return db().storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const { data } = await db().storage.from(bucket).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

function Thumbs({ items }: { items: { bucket: string; path: string }[] }) {
  const { c } = useTheme();
  const [urls, setUrls] = useState<string[]>([]);
  const key = items.map((i) => i.path).join('|');
  useEffect(() => {
    let cancelled = false;
    Promise.all(items.map((i) => fileUrl(i.bucket, i.path))).then((u) => {
      if (!cancelled) setUrls(u.filter((x): x is string => !!x));
    });
    return () => {
      cancelled = true;
    };
    // The joined paths are the identity of the list.
  }, [key]);
  if (items.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
      {urls.map((u) => (
        <Image
          key={u}
          source={{ uri: u }}
          style={{ width: 84, height: 112, borderRadius: 8, marginRight: 8, backgroundColor: c.surf2 }}
          contentFit="cover"
        />
      ))}
    </ScrollView>
  );
}

function useQueue<T>(fn: string) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    db()
      .rpc(fn)
      .then(({ data, error: e }) => {
        if (cancelled) return;
        setError(e);
        setRows((data ?? []) as T[]);
      });
    return () => {
      cancelled = true;
    };
  }, [fn, tick]);
  return { rows, error, refresh: useCallback(() => setTick((n) => n + 1), []) };
}

/** Runs one staff action, shows its error in words, refreshes the list. */
function useAction(refresh: () => void) {
  const { t } = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (id: string, fn: string, args: Record<string, unknown>) => {
    setBusy(id);
    setError(null);
    const { error: e } = await db().rpc(fn, args);
    setBusy(null);
    if (e) setError(friendlyError(new Error(e.message), t));
    else refresh();
  };
  return { busy, error, run };
}

function List<T>({
  rows,
  error,
  empty,
  children,
}: {
  rows: T[] | null;
  error: unknown;
  empty: string;
  children: (row: T) => ReactNode;
}) {
  const { c } = useTheme();
  const { t } = useT();
  if (error) {
    return (
      <Txt size={14} color={c.plum} style={{ marginTop: 16 }}>
        {friendlyError(error, t)}
      </Txt>
    );
  }
  if (!rows) return <ActivityIndicator color={c.accent} style={{ marginTop: 24 }} />;
  if (rows.length === 0) {
    return (
      <Txt size={14} color={c.ink2} style={{ marginTop: 16 }}>
        {empty}
      </Txt>
    );
  }
  return <View style={{ marginTop: 14, gap: 12 }}>{rows.map(children)}</View>;
}

function Meta({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt size={12} color={c.ink3} style={{ marginTop: 4 }}>
      {children}
    </Txt>
  );
}

function Buttons({ children }: { children: ReactNode }) {
  return <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

// ── Moderation ────────────────────────────────────────────────

interface ModerationRow {
  case_id: string;
  trigger: string;
  title: string;
  brand: string | null;
  owner_username: string;
  distribution: string;
  auto_reason: string | null;
  summary: string | null;
  cues: string[] | null;
  photo_paths: string[];
  frame_paths: string[];
  authenticity_path: string | null;
  report_count: number;
  report_reasons: string[];
  appeal_message: string | null;
}

function Moderation() {
  const { c } = useTheme();
  const { t } = useT();
  const { rows, error, refresh } = useQueue<ModerationRow>('staff_moderation_queue');
  const { busy, error: actionError, run } = useAction(refresh);
  const decide = (row: ModerationRow, distribution: 'public' | 'limited' | 'blocked') =>
    run(row.case_id, 'staff_decide_moderation', {
      p_case: row.case_id,
      p_distribution: distribution,
      p_reason: distribution === 'public' ? null : (row.auto_reason ?? 'other'),
      p_note: null,
    });

  return (
    <>
      {actionError ? <Txt color={c.plum} style={{ marginTop: 10 }}>{actionError}</Txt> : null}
      <List rows={rows} error={error} empty={t('admin.emptyModeration')}>
        {(row) => (
          <Card key={row.case_id}>
            <Txt weight="bold">{row.title}</Txt>
            <Meta>
              @{row.owner_username} · {t(`admin.trigger.${row.trigger}` as TranslationKey)}
              {row.auto_reason ? ` · ${t(`moderation.state.${row.distribution}` as TranslationKey)}` : ''}
            </Meta>
            <Thumbs
              items={[
                ...row.frame_paths.map((p) => ({ bucket: 'moderation-frames', path: p })),
                ...row.photo_paths.map((p) => ({ bucket: 'listing-media', path: p })),
                ...(row.authenticity_path ? [{ bucket: 'private-docs', path: row.authenticity_path }] : []),
              ]}
            />
            {row.summary ? (
              <Txt size={13} color={c.ink2} style={{ marginTop: 10 }}>
                {row.summary}
              </Txt>
            ) : null}
            {row.cues?.length ? <Meta>{row.cues.join(' · ')}</Meta> : null}
            {row.report_count > 0 ? (
              <Meta>
                {t('admin.reports').replace('{n}', String(row.report_count))} ·{' '}
                {row.report_reasons.map((r) => t(`report.reason.${r}` as TranslationKey)).join(', ')}
              </Meta>
            ) : null}
            {row.appeal_message ? (
              <Txt size={13} style={{ marginTop: 8 }}>
                « {row.appeal_message} »
              </Txt>
            ) : null}
            <Buttons>
              <Chip label={t('admin.publish')} onPress={() => decide(row, 'public')} on />
              <Chip on={false} label={t('admin.limit')} onPress={() => decide(row, 'limited')} />
              <Chip on={false} label={t('admin.remove')} onPress={() => decide(row, 'blocked')} tone="plum" />
              {busy === row.case_id ? <ActivityIndicator color={c.accent} /> : null}
            </Buttons>
          </Card>
        )}
      </List>
    </>
  );
}

// ── Claims ────────────────────────────────────────────────────

interface ClaimRow {
  claim_id: string;
  rental_id: string;
  status: string;
  category: string;
  description: string;
  evidence_paths: string[];
  requested_amount: number;
  renter_response: string | null;
  appeal_note: string | null;
  max_claimable: number;
  deposit_amount: number;
  listing_title: string;
  owner_username: string;
  renter_username: string;
}

function ClaimCard({ row, busy, run }: { row: ClaimRow; busy: boolean; run: ReturnType<typeof useAction>['run'] }) {
  const { c } = useTheme();
  const { t } = useT();
  const { m } = useStore();
  const [amount, setAmount] = useState(String(row.requested_amount));
  const [note, setNote] = useState('');
  const decide = (value: number) =>
    run(row.claim_id, 'staff_decide_claim', { p_claim: row.claim_id, p_approved: value, p_note: note.trim() });
  const parsed = Math.min(Number(amount.replace(',', '.')) || 0, Number(row.max_claimable));

  return (
    <Card>
      <Txt weight="bold">{row.listing_title}</Txt>
      <Meta>
        @{row.owner_username} → @{row.renter_username} · {t(`admin.category.${row.category}` as TranslationKey)}
      </Meta>
      <Txt size={13} style={{ marginTop: 8 }}>
        {row.description}
      </Txt>
      <Thumbs items={row.evidence_paths.map((p) => ({ bucket: 'rental-evidence', path: p }))} />
      <Meta>
        {t('admin.requested')} {m(Number(row.requested_amount))} · {t('admin.maxClaimable')} {m(Number(row.max_claimable))}
        {Number(row.deposit_amount) > 0 ? ` · ${t('protect.deposit')} ${m(Number(row.deposit_amount))}` : ''}
      </Meta>
      <Txt size={13} color={c.ink2} style={{ marginTop: 8 }}>
        {row.renter_response ? `« ${row.renter_response} »` : t('admin.noResponse')}
      </Txt>
      <View style={{ marginTop: 10, gap: 8 }}>
        <Field label={t('admin.approvedAmount')} value={amount} onChangeText={setAmount} keyboardType="number-pad" />
        <Field label={t('admin.decisionNote')} value={note} onChangeText={setNote} autoCapitalize="sentences" multiline />
      </View>
      <Buttons>
        <Chip label={`${t('admin.approve')} ${m(parsed)}`} onPress={() => decide(parsed)} on />
        <Chip on={false} label={t('admin.deny')} onPress={() => decide(0)} tone="plum" />
        {busy ? <ActivityIndicator color={c.accent} /> : null}
      </Buttons>
    </Card>
  );
}

function Claims() {
  const { c } = useTheme();
  const { t } = useT();
  const { rows, error, refresh } = useQueue<ClaimRow>('staff_claims_queue');
  const { busy, error: actionError, run } = useAction(refresh);
  return (
    <>
      <Txt size={13} color={c.ink2} style={{ marginTop: 12 }}>
        {t('admin.claimsHelp')}
      </Txt>
      {actionError ? <Txt color={c.plum} style={{ marginTop: 10 }}>{actionError}</Txt> : null}
      <List rows={rows} error={error} empty={t('admin.emptyClaims')}>
        {(row) => <ClaimCard key={row.claim_id} row={row} busy={busy === row.claim_id} run={run} />}
      </List>
    </>
  );
}

// ── Rentals needing a person ──────────────────────────────────

interface RentalRow {
  rental_id: string;
  listing_title: string;
  owner_username: string;
  renter_username: string;
  status: string;
  payment_status: string;
  flagged: string | null;
  payout_state: string | null;
  payout_hold_reason: string | null;
  total_charged: number;
}

function Rentals() {
  const { c } = useTheme();
  const { t } = useT();
  const { m } = useStore();
  const { rows, error, refresh } = useQueue<RentalRow>('staff_rentals_attention');
  const { busy, error: actionError, run } = useAction(refresh);
  return (
    <>
      {actionError ? <Txt color={c.plum} style={{ marginTop: 10 }}>{actionError}</Txt> : null}
      <List rows={rows} error={error} empty={t('admin.emptyRentals')}>
        {(row) => (
          <Card key={row.rental_id}>
            <Txt weight="bold">{row.listing_title}</Txt>
            <Meta>
              @{row.owner_username} → @{row.renter_username} · {m(Number(row.total_charged))}
            </Meta>
            <Meta>
              {[row.status, row.payment_status, row.flagged, row.payout_state && `payout ${row.payout_state}`, row.payout_hold_reason]
                .filter(Boolean)
                .join(' · ')}
            </Meta>
            <Buttons>
              {row.flagged ? (
                <Chip
                  label={t('admin.clearFlag')}
                  onPress={() => run(row.rental_id, 'staff_clear_flag', { p_rental: row.rental_id, p_note: 'app' })}
                  on
                />
              ) : null}
              {row.status === 'booked' ? (
                <Chip on={false}
                  label={t('admin.cancelRefund')}
                  onPress={() => run(row.rental_id, 'staff_cancel_rental', { p_rental: row.rental_id, p_note: 'app' })}
                  tone="plum"
                />
              ) : null}
              {busy === row.rental_id ? <ActivityIndicator color={c.accent} /> : null}
            </Buttons>
          </Card>
        )}
      </List>
    </>
  );
}

// ── Safety incidents ──────────────────────────────────────────

interface IncidentRow {
  incident_id: string;
  created_at: string;
  kind: string;
  state: string;
  listing_title: string | null;
  owner_username: string | null;
  reported_to: string | null;
  report_reference: string | null;
}

function IncidentCard({ row, busy, run }: { row: IncidentRow; busy: boolean; run: ReturnType<typeof useAction>['run'] }) {
  const { c } = useTheme();
  const { t } = useT();
  const [reference, setReference] = useState(row.report_reference ?? '');
  return (
    <Card accent>
      <Txt weight="bold">{t(`admin.incident.${row.kind}` as TranslationKey)}</Txt>
      <Meta>
        {row.listing_title ?? '—'} · @{row.owner_username ?? '—'} · {new Date(row.created_at).toLocaleString()}
      </Meta>
      <Meta>{row.state === 'reported' ? `${t('admin.reportedTo')} ${row.reported_to} · ${row.report_reference}` : t('admin.notReported')}</Meta>
      <View style={{ marginTop: 10 }}>
        <Field label={t('admin.reportReference')} value={reference} onChangeText={setReference} />
      </View>
      <Buttons>
        <Chip on={false} label={t('admin.openPharos')} onPress={() => WebBrowser.openBrowserAsync(PHAROS)} />
        <Chip
          label={t('admin.markReported')}
          onPress={() =>
            run(row.incident_id, 'staff_update_incident', {
              p_incident: row.incident_id,
              p_state: 'reported',
              p_reported_to: 'PHAROS',
              p_reference: reference.trim() || null,
            })
          }
          on
        />
        <Chip on={false}
          label={t('admin.close')}
          onPress={() => run(row.incident_id, 'staff_update_incident', { p_incident: row.incident_id, p_state: 'closed' })}
          tone="plum"
        />
        {busy ? <ActivityIndicator color={c.accent} /> : null}
      </Buttons>
    </Card>
  );
}

function Safety() {
  const { c } = useTheme();
  const { t } = useT();
  const { rows, error, refresh } = useQueue<IncidentRow>('staff_incidents');
  const { busy, error: actionError, run } = useAction(refresh);
  return (
    <>
      <Txt size={13} color={c.ink2} style={{ marginTop: 12 }}>
        {t('admin.safetyHelp')}
      </Txt>
      {actionError ? <Txt color={c.plum} style={{ marginTop: 10 }}>{actionError}</Txt> : null}
      <List rows={rows} error={error} empty={t('admin.emptySafety')}>
        {(row) => <IncidentCard key={row.incident_id} row={row} busy={busy === row.incident_id} run={run} />}
      </List>
    </>
  );
}

export function Admin() {
  const { go } = useStore();
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('moderation');
  const [nonce, setNonce] = useState(0);
  return (
    <Screen>
      <Header title={t('admin.title')} onBack={() => go('settings')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, flexGrow: 0 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TABS.map((k) => (
            <Chip key={k} label={t(`admin.tab.${k}` as TranslationKey)} on={tab === k} onPress={() => setTab(k)} />
          ))}
        </View>
      </ScrollView>
      <View key={`${tab}-${nonce}`}>
        {tab === 'moderation' ? <Moderation /> : null}
        {tab === 'claims' ? <Claims /> : null}
        {tab === 'rentals' ? <Rentals /> : null}
        {tab === 'safety' ? <Safety /> : null}
      </View>
      <GhostButton label={t('admin.refresh')} onPress={() => setNonce((n) => n + 1)} style={{ marginTop: 20 }} />
      <PrimaryButton label={t('common.back')} onPress={() => go('settings')} style={{ marginTop: 10 }} />
    </Screen>
  );
}
