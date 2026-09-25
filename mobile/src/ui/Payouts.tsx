import { useState } from 'react';
import { View } from 'react-native';
import { openPayoutDashboard, paymentsConfigured, setUpPayouts, usePayoutStatus } from '../data/payments';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/errors';
import { useTheme } from '../theme/useTheme';
import { Card, GhostButton, PrimaryButton, Txt } from './kit';

/**
 * "Get paid": Stripe collects the lender's identity and bank details on its
 * own hosted pages; Rota only ever learns whether payouts are switched on.
 */
export function PayoutsCard() {
  const { c } = useTheme();
  const { t } = useT();
  const { session } = useAuth();
  const { status, setStatus } = usePayoutStatus(!!session && paymentsConfigured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session || !paymentsConfigured) return null;
  const ready = !!status?.payoutsEnabled;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ marginTop: 12 }} accent={!ready}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: ready ? c.accent : c.plum }} />
        <Txt weight="bold" style={{ flex: 1 }}>
          {t('payouts.title')}
        </Txt>
        <Txt size={12} weight="semi" color={ready ? c.accent : c.plum}>
          {ready ? t('payouts.ready') : status?.detailsSubmitted ? t('payouts.checking') : t('payouts.todo')}
        </Txt>
      </View>
      <Txt size={13} color={c.ink2} style={{ marginTop: 6 }}>
        {ready ? t('payouts.readyBody') : t('payouts.body')}
      </Txt>
      {error ? (
        <Txt size={13} color={c.plum} style={{ marginTop: 8 }}>
          {error}
        </Txt>
      ) : null}
      {ready ? (
        <GhostButton
          label={t('payouts.dashboard')}
          onPress={() => run(openPayoutDashboard)}
          style={{ marginTop: 12 }}
        />
      ) : (
        <PrimaryButton
          label={busy ? t('common.loading') : status?.hasAccount ? t('payouts.continue') : t('payouts.start')}
          disabled={busy}
          onPress={() => run(async () => setStatus(await setUpPayouts()))}
          style={{ marginTop: 12 }}
        />
      )}
    </Card>
  );
}
