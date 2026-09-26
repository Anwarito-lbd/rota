import { View } from 'react-native';
import { useT, type TranslationKey } from '../i18n';
import { usePolicy } from '../lib/policy';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { Card, Header, Screen, SectionLabel, Txt } from '../ui/kit';

const pct = (rate: number) => `${Math.round(rate * 100)} %`;

/**
 * Every number here comes from policy_config (the same table checkout and
 * the database use), so this page can never disagree with what is charged.
 */
export function Fees() {
  const { go, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const p = usePolicy();

  const fill = (key: TranslationKey, values: Record<string, string>) =>
    Object.entries(values).reduce((text, [k, v]) => text.split(`{${k}}`).join(v), t(key));

  const Block = ({ title, lines }: { title: TranslationKey; lines: string[] }) => (
    <>
      <SectionLabel>{t(title)}</SectionLabel>
      <Card style={{ marginTop: 10, gap: 10 }}>
        {lines.map((line) => (
          <View key={line} style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 6, height: 6, marginTop: 8, borderRadius: 99, backgroundColor: c.accent }} />
            <Txt size={14} style={{ flex: 1 }}>
              {line}
            </Txt>
          </View>
        ))}
      </Card>
    </>
  );

  return (
    <Screen bottomInset={60}>
      <Header title={t('fees.title')} onBack={() => go('closet')} size={26} />
      <Block
        title="fees.renting"
        lines={[
          fill('fees.serviceRenter', { rate: pct(p.renterServiceRate) }),
          fill('fees.shipping', { amount: m(p.shippingFee) }),
          t('fees.cleaning'),
          fill('fees.noDeposit', {
            value: m(p.highValueHoldThreshold),
            first: m(p.firstRentalArvCap),
            rate: pct(p.holdRate),
            max: m(p.holdMax),
          }),
          t('fees.liability'),
          fill('fees.late', {
            hours: String(p.gracePeriodHours),
            rate: pct(p.lateFeePerDayRate),
            min: m(p.lateFeeMinPerDay),
            capRate: pct(p.lateFeeCapRate),
            capMax: m(p.lateFeeCapMax),
          }),
        ]}
      />
      <Block
        title="fees.lending"
        lines={[
          fill('fees.serviceOwner', { rate: pct(p.ownerServiceRate) }),
          fill('fees.payout', { hours: String(p.ownerClaimWindowHours) }),
          t('fees.claims'),
        ]}
      />
      <Block
        title="fees.cancelTitle"
        lines={[fill('fees.unpaid', { minutes: String(p.paymentWindowMinutes) }), t('fees.cancel'), t('fees.noCash')]}
      />
      <Txt size={12} color={c.ink3} style={{ marginTop: 16 }}>
        {fill('fees.version', { v: p.policyVersion })}
      </Txt>
    </Screen>
  );
}
