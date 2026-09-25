import { useState } from 'react';
import { View } from 'react-native';
import { submitClaim, useMyRentals, type ClaimCategory } from '../data/rentals';
import { useT, type TranslationKey } from '../i18n';
import { useAuth } from '../lib/auth';
import { replacementExposure } from '../lib/fees';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import {
  Card,
  Chip,
  Field,
  FooterBar,
  Header,
  Note,
  PrimaryButton,
  Screen,
  Txt,
} from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';

const CATEGORIES: { key: ClaimCategory; label: TranslationKey }[] = [
  { key: 'damage', label: 'claim.damage' },
  { key: 'cleaning', label: 'claim.cleaning' },
  { key: 'late', label: 'claim.late' },
  { key: 'non_return', label: 'claim.nonReturn' },
  { key: 'other', label: 'claim.other' },
];

const SLOTS = ['claim-photo-0', 'claim-photo-1', 'claim-photo-2'];

export function Claim() {
  const { state, go, m, setMedia } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session } = useAuth();
  const uid = session?.user.id;
  const { rentals } = useMyRentals(uid);
  const rental = rentals.find((r) => r.id === state.activeRentalId) ?? null;

  const [category, setCategory] = useState<ClaimCategory>('damage');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!rental || rental.ownerId !== uid) {
    return (
      <Screen>
        <Header title={t('claim.open')} onBack={() => go('rentals')} />
        <Txt color={c.ink2} style={{ marginTop: 20 }}>
          {t('claim.ownerOnly')}
        </Txt>
      </Screen>
    );
  }

  // Late fees already charged eat into the same ceiling: a renter never pays
  // more than the approved value they saw when they booked.
  const exposure = replacementExposure({
    maxLiability: rental.maxLiability,
    lateFeesCharged: rental.lateFeesCharged,
    requested: Number(amount.replace(/[^\d.]/g, '')) || 0,
  });

  const evidence = SLOTS.map((id) => state.media[id]).filter((x) => !!x);

  if (sent) {
    return (
      <Screen>
        <Header title={t('claim.open')} onBack={() => go('rentals')} />
        <Card style={{ marginTop: 20 }}>
          <Txt size={16} weight="bold">
            ✓ {t('claim.sentTitle')}
          </Txt>
          <Txt size={14} color={c.ink2} style={{ marginTop: 6 }}>
            {t('claim.sentBody')}
          </Txt>
        </Card>
      </Screen>
    );
  }

  const send = async () => {
    if (!uid) return;
    if (description.trim().length < 10) return setError(t('claim.needDescription'));
    if (exposure.capped <= 0) return setError(t('claim.needAmount'));
    setBusy(true);
    setError(null);
    try {
      await submitClaim({
        rental,
        userId: uid,
        category,
        description: description.trim(),
        requestedAmount: exposure.capped,
        evidence,
      });
      SLOTS.forEach((id) => setMedia(id, null));
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={140}>
        <Header title={t('claim.open')} onBack={() => go('rental')} size={28} />
        <Txt size={13} color={c.ink2} style={{ marginTop: 8 }}>
          {rental.listingTitle}
        </Txt>

        <View style={{ marginTop: 16 }}>
          <Note tone="accent">{t('claim.rotaDecides')}</Note>
        </View>

        <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 22 }}>
          {t('claim.category')}
        </Txt>
        <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((item) => (
            <Chip
              key={item.key}
              label={t(item.label)}
              on={category === item.key}
              onPress={() => setCategory(item.key)}
            />
          ))}
        </View>

        <View style={{ marginTop: 12, gap: 10 }}>
          <Field
            label={t('claim.description')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('claim.descriptionPlaceholder')}
            autoCapitalize="sentences"
          />
          <Field
            label={t('claim.requested')}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="number-pad"
            hint={`${t('claim.cap')} ${m(exposure.remaining)}`}
          />
        </View>

        <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 22 }}>
          {t('claim.evidence')}
        </Txt>
        <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
          {SLOTS.map((id, i) => (
            <View key={id} style={{ flex: 1, height: 110, borderRadius: 12, overflow: 'hidden' }}>
              <MediaSlot id={id} shape="rounded" radius={12} editable placeholder={`${i + 1}`} />
            </View>
          ))}
        </View>

        {exposure.capped > 0 && exposure.capped < (Number(amount.replace(/[^\d.]/g, '')) || 0) ? (
          <Txt size={13} color={c.ink3} style={{ marginTop: 12 }}>
            {t('claim.cappedTo')} {m(exposure.capped)}
          </Txt>
        ) : null}

        {error ? (
          <View
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              backgroundColor: c.plumSoft,
              borderWidth: 1,
              borderColor: c.plum,
            }}
          >
            <Txt size={13}>{error}</Txt>
          </View>
        ) : null}
      </Screen>

      <FooterBar>
        <PrimaryButton
          label={busy ? t('common.loading') : `${t('claim.send')} · ${m(exposure.capped)}`}
          disabled={busy}
          onPress={send}
        />
      </FooterBar>
    </View>
  );
}
