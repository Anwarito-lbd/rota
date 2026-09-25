import { useState } from 'react';
import { View } from 'react-native';
import {
  addConditionReport,
  confirmPossession,
  respondToClaim,
  useClaims,
  useConditionReports,
  useMyRentals,
  usePossessionCode,
  type ConditionPhase,
  type Rental,
} from '../data/rentals';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { returnStatus } from '../lib/fees';
import { usePolicy } from '../lib/policy';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import {
  Amount,
  Card,
  Display,
  Field,
  GhostButton,
  Header,
  Note,
  PrimaryButton,
  Screen,
  Txt,
} from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';

const SLOT_COUNT = 3;
const slotIds = (rentalId: string, phase: ConditionPhase) =>
  Array.from({ length: SLOT_COUNT }, (_, i) => `cond-${rentalId}-${phase}-${i}`);

function Line({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5 }}>
      <Txt size={14} color={c.ink2} style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt size={14} weight="semi">
        {value}
      </Txt>
    </View>
  );
}

/** A few photos and a timestamp. Fast on purpose — not an inspection form. */
function ConditionBlock({
  rental,
  phase,
  done,
  onSaved,
}: {
  rental: Rental;
  phase: ConditionPhase;
  done: boolean;
  onSaved: () => void;
}) {
  const { state, setMedia } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ids = slotIds(rental.id, phase);
  const items = ids.map((id) => state.media[id]).filter((x) => !!x);

  if (done) {
    return (
      <Card style={{ marginTop: 10 }}>
        <Txt size={14} weight="bold">
          ✓ {t(phase === 'pre_handover' ? 'rental.conditionBefore' : 'rental.conditionAfter')}
        </Txt>
        <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
          {t('rental.conditionSaved')}
        </Txt>
      </Card>
    );
  }

  const save = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await addConditionReport({
        rentalId: rental.id,
        userId: session.user.id,
        phase,
        items,
      });
      ids.forEach((id) => setMedia(id, null));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ marginTop: 10 }}>
      <Txt size={14} weight="bold">
        {t(phase === 'pre_handover' ? 'rental.conditionBefore' : 'rental.conditionAfter')}
      </Txt>
      <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
        {t('rental.conditionBody')}
      </Txt>
      <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
        {ids.map((id, i) => (
          <View key={id} style={{ flex: 1, height: 110, borderRadius: 12, overflow: 'hidden' }}>
            <MediaSlot id={id} shape="rounded" radius={12} editable placeholder={`${i + 1}`} />
          </View>
        ))}
      </View>
      <PrimaryButton
        label={busy ? t('common.loading') : `${t('rental.saveCondition')} · ${items.length}`}
        disabled={busy || items.length === 0}
        onPress={save}
        style={{ marginTop: 12 }}
      />
      {error ? (
        <Txt size={13} color={c.plum} style={{ marginTop: 8 }}>
          {error}
        </Txt>
      ) : null}
    </Card>
  );
}

/** PIN handoff: one party shows the code, the other types it. */
function CodeBlock({
  rental,
  kind,
  showCode,
  loading,
  onConfirmed,
  blocked,
}: {
  rental: Rental;
  kind: 'handover' | 'return';
  showCode: string | null;
  loading: boolean;
  onConfirmed: () => void;
  blocked?: string | null;
}) {
  const { c } = useTheme();
  const { t } = useT();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = t(kind === 'handover' ? 'rental.handover' : 'rental.returnStep');

  if (loading) {
    return (
      <Card style={{ marginTop: 10 }}>
        <Txt size={14} weight="bold">
          {title}
        </Txt>
        <Txt size={13} color={c.ink3} style={{ marginTop: 4 }}>
          {t('common.loading')}
        </Txt>
      </Card>
    );
  }

  // Only the party who must SHOW the code can read it (RLS). Seeing it here
  // means we are the shower; otherwise we are the one who confirms.
  if (showCode) {
    return (
      <Card style={{ marginTop: 10 }}>
        <Txt size={14} weight="bold">
          {title}
        </Txt>
        <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
          {t(kind === 'handover' ? 'rental.showCodeHandover' : 'rental.showCodeReturn')}
        </Txt>
        <Amount size={38} color={c.accent} style={{ marginTop: 10, letterSpacing: 6 }}>
          {showCode}
        </Amount>
      </Card>
    );
  }

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await confirmPossession(rental.id, kind, code.trim());
      setCode('');
      onConfirmed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirmation impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ marginTop: 10 }}>
      <Txt size={14} weight="bold">
        {title}
      </Txt>
      <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
        {t(kind === 'handover' ? 'rental.enterCodeHandover' : 'rental.enterCodeReturn')}
      </Txt>
      <View style={{ marginTop: 10 }}>
        <Field
          label={t('rental.code')}
          value={code}
          onChangeText={setCode}
          placeholder="000000"
          keyboardType="number-pad"
        />
      </View>
      <PrimaryButton
        label={busy ? t('common.loading') : t('rental.confirm')}
        disabled={busy || code.trim().length < 6 || !!blocked}
        onPress={confirm}
        style={{ marginTop: 12 }}
      />
      {blocked ? (
        <Txt size={13} color={c.ink3} style={{ marginTop: 8 }}>
          {blocked}
        </Txt>
      ) : null}
      {error ? (
        <Txt size={13} color={c.plum} style={{ marginTop: 8 }}>
          {error}
        </Txt>
      ) : null}
    </Card>
  );
}

export function RentalDetail() {
  const { state, set, go, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session } = useAuth();
  const policy = usePolicy();
  const uid = session?.user.id;

  const { rentals, loading, refresh } = useMyRentals(uid);
  const rental = rentals.find((r) => r.id === state.activeRentalId) ?? null;
  const { phases, refresh: refreshPhases } = useConditionReports(rental?.id ?? null);
  const handover = usePossessionCode(rental?.id ?? null, 'handover');
  const returnStep = usePossessionCode(rental?.id ?? null, 'return');
  const { claims, refresh: refreshClaims } = useClaims(rental?.id ?? null);
  const [answer, setAnswer] = useState('');

  if (!rental) {
    return (
      <Screen>
        <Header title={t('rentals.title')} onBack={() => go('rentals')} />
        <Txt color={c.ink2} style={{ marginTop: 20 }}>
          {loading ? t('common.loading') : t('rental.gone')}
        </Txt>
      </Screen>
    );
  }

  const isOwner = rental.ownerId === uid;
  const hasBefore = phases.includes('pre_handover');
  const hasAfter = phases.includes('post_return');

  const late = returnStatus({
    returnDueAt: rental.returnDueAt,
    returnedAt: rental.returnConfirmedAt,
    perDay: rental.lateFeePerDay,
    cap: rental.lateFeeCap,
    gracePeriodHours: rental.gracePeriodHours,
    nonReturnReviewDays: rental.nonReturnReviewDays,
    policy,
  });

  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR') : '—');
  const myClaims = claims.filter((claim) => claim.renterId === uid);

  const afterSave = () => {
    refreshPhases();
    refresh();
  };

  const respond = async (claimId: string) => {
    if (answer.trim().length < 2) return;
    await respondToClaim(claimId, answer.trim());
    setAnswer('');
    refreshClaims();
  };

  return (
    <Screen bottomInset={120}>
      <Header title={rental.listingTitle} onBack={() => go('rentals')} size={28} />
      <Txt size={13} color={c.ink2} style={{ marginTop: 8 }}>
        {rental.startDate} → {rental.endDate} · {rental.days} j ·{' '}
        {isOwner ? t('rentals.lending') : t('rentals.renting')}
      </Txt>

      {/* The terms, exactly as they were frozen at checkout. */}
      <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 22 }}>
        {t('rental.terms')}
      </Txt>
      <Card style={{ marginTop: 10 }}>
        <Line label={t('checkout.rentLine')} value={m(rental.rentAmount)} />
        <Line
          label={isOwner ? t('rental.payout') : t('checkout.chargedNow')}
          value={isOwner ? m(rental.ownerPayout) : m(rental.totalCharged)}
        />
        <Line label={t('rental.approvedValue')} value={m(rental.approvedValue)} />
        <Line label={t('protect.maxLiability')} value={m(rental.maxLiability)} />
        <Line
          label={t('protect.deposit')}
          value={rental.depositRequired ? m(rental.depositAmount) : t('protect.noDepositShort')}
        />
        <Line
          label={t('protect.lateRules')}
          value={`${rental.gracePeriodHours} h · ${m(rental.lateFeePerDay)}/j · max ${m(rental.lateFeeCap)}`}
        />
        <Txt size={12} color={c.ink3} style={{ marginTop: 8 }}>
          {t('rental.snapshot')} · {rental.policyVersion} / {rental.consentVersion}
        </Txt>
      </Card>

      {/* Return timeline: reminder → grace → late (capped) → non-return review. */}
      {rental.handoverConfirmedAt && !rental.returnConfirmedAt ? (
        <View style={{ marginTop: 14 }}>
          <Note tone={late.state === 'late' || late.state === 'non_return_review' ? 'surf2' : 'accent'}>
            {t('rental.dueAt')} {day(rental.returnDueAt)}
            {late.state === 'grace' ? ` · ${t('rental.inGrace')}` : ''}
            {late.state === 'late' ? ` · ${t('status.late')} ${late.daysLate} j · ${m(late.lateFee)}` : ''}
            {late.state === 'non_return_review' ? ` · ${t('status.nonReturn')}` : ''}
          </Note>
        </View>
      ) : null}

      {/* Condition evidence, then possession. */}
      <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 22 }}>
        {t('rental.steps')}
      </Txt>

      {!rental.handoverConfirmedAt ? (
        <>
          {isOwner ? (
            <ConditionBlock rental={rental} phase="pre_handover" done={hasBefore} onSaved={afterSave} />
          ) : (
            <Card style={{ marginTop: 10 }}>
              <Txt size={14} weight="bold">
                {t('rental.conditionBefore')}
              </Txt>
              <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
                {hasBefore ? t('rental.conditionSaved') : t('rental.waitingOwnerPhotos')}
              </Txt>
            </Card>
          )}
          <CodeBlock
            rental={rental}
            kind="handover"
            showCode={handover.code}
            loading={handover.loading}
            onConfirmed={refresh}
            blocked={hasBefore ? null : t('rental.needPhotosFirst')}
          />
        </>
      ) : (
        <Card style={{ marginTop: 10 }}>
          <Txt size={14} weight="bold">
            ✓ {t('rental.handoverDone')}
          </Txt>
          <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
            {day(rental.handoverConfirmedAt)} · {t('rental.clockStarts')}
          </Txt>
        </Card>
      )}

      {rental.handoverConfirmedAt && !rental.returnConfirmedAt ? (
        <>
          <ConditionBlock rental={rental} phase="post_return" done={hasAfter} onSaved={afterSave} />
          <CodeBlock
            rental={rental}
            kind="return"
            showCode={returnStep.code}
            loading={returnStep.loading}
            onConfirmed={refresh}
            blocked={hasAfter ? null : t('rental.needReturnPhotos')}
          />
        </>
      ) : null}

      {rental.returnConfirmedAt ? (
        <>
          <Card style={{ marginTop: 10 }}>
            <Txt size={14} weight="bold">
              ✓ {t('rental.returnDone')}
            </Txt>
            <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
              {day(rental.returnConfirmedAt)}
            </Txt>
            <Txt size={13} color={c.ink2} style={{ marginTop: 6 }}>
              {isOwner ? t('rental.payoutAfterWindow') : t('rental.claimWindowRenter')}{' '}
              {day(rental.claimWindowEndsAt)}
            </Txt>
          </Card>

          {isOwner ? (
            <GhostButton
              label={t('claim.open')}
              tone="plum"
              onPress={() => {
                set({ activeRentalId: rental.id });
                go('claim');
              }}
              style={{ marginTop: 10 }}
            />
          ) : null}
        </>
      ) : null}

      {/* A claim against me: my side of the story goes to Rota, not to the owner. */}
      {!isOwner && myClaims.length > 0 ? (
        <>
          <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 22 }}>
            {t('claim.againstYou')}
          </Txt>
          {myClaims.map((claim) => (
            <Card key={claim.id} style={{ marginTop: 10 }}>
              <Txt size={14} weight="bold">
                {t('claim.category')} · {claim.category}
              </Txt>
              <Txt size={13} color={c.ink2} style={{ marginTop: 4 }}>
                {claim.description}
              </Txt>
              <Line label={t('claim.requested')} value={m(claim.requestedAmount)} />
              <Line
                label={t('claim.approved')}
                value={claim.approvedAmount === null ? t('claim.underReview') : m(claim.approvedAmount)}
              />
              {claim.renterResponse ? (
                <Txt size={13} color={c.ink2} style={{ marginTop: 6 }}>
                  {t('claim.yourAnswer')} : {claim.renterResponse}
                </Txt>
              ) : (
                <>
                  <View style={{ marginTop: 10 }}>
                    <Field
                      label={t('claim.yourAnswer')}
                      value={answer}
                      onChangeText={setAnswer}
                      placeholder={t('claim.answerPlaceholder')}
                      autoCapitalize="sentences"
                    />
                  </View>
                  <PrimaryButton
                    label={t('claim.send')}
                    disabled={answer.trim().length < 2}
                    onPress={() => respond(claim.id)}
                    style={{ marginTop: 10 }}
                  />
                </>
              )}
              <Txt size={12} color={c.ink3} style={{ marginTop: 8 }}>
                {t('claim.rotaDecides')}
              </Txt>
            </Card>
          ))}
        </>
      ) : null}

      <View style={{ marginTop: 18 }}>
        <Display size={20}>{t('rental.remindersTitle')}</Display>
        <Txt size={13} color={c.ink2} style={{ marginTop: 6 }}>
          {t('rental.remindersBody')}
        </Txt>
      </View>
    </Screen>
  );
}
