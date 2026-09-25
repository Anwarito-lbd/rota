import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CATEGORIES, OCCASIONS, SIZES } from '../data/catalog';
import { useListings } from '../data/listings';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/errors';
import { FEES } from '../lib/fees';
import { submitForReview } from '../lib/moderation';
import { uploadMedia } from '../lib/upload';
import { useStore } from '../state/store';
import type { MediaItem } from '../state/types';
import { useTheme } from '../theme/useTheme';
import {
  Amount,
  Card,
  Check,
  Chip,
  Display,
  Field,
  FooterBar,
  GhostButton,
  Note,
  PrimaryButton,
  Screen,
  Steps,
  Toggle,
  Txt,
} from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';

const SLOT_VIDEO = 'new-listing-video';
const SLOT_PHOTO_1 = 'new-listing-photo-1';
const SLOT_PHOTO_2 = 'new-listing-photo-2';
const SLOT_PROOF = 'new-listing-proof';

export function ListPiece() {
  const { state, set, go, m, setMedia } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session } = useAuth();
  const { refresh } = useListings();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [retail, setRetail] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [price, setPrice] = useState(20);
  const [lenderCleans, setLenderCleans] = useState(false);
  const [cleaningFee, setCleaningFee] = useState(12);
  const [rules, setRules] = useState<string[]>([]);
  const [ruleDraft, setRuleDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  const media = state.media;
  const photoSlots = [SLOT_PHOTO_1, SLOT_PHOTO_2].filter((id) => media[id]);
  const hasPhoto = photoSlots.length > 0 || !!media[SLOT_VIDEO];

  const reset = () => {
    [SLOT_VIDEO, SLOT_PHOTO_1, SLOT_PHOTO_2, SLOT_PROOF].forEach((id) => setMedia(id, null));
    setTitle('');
    setBrand('');
    setRetail('');
    setSizes([]);
    setRules([]);
    setPrice(20);
    setLenderCleans(false);
    setStep(0);
  };

  const publish = async () => {
    if (!session) return setError('Connectez-vous pour publier une annonce.');
    if (!hasPhoto) return setError(t('list.needPhoto'));
    if (title.trim().length < 3) return setError(t('list.needTitle'));
    if (sizes.length === 0) return setError(t('list.needSize'));

    setBusy(true);
    setError(null);
    try {
      const userId = session.user.id;
      const photoPaths: string[] = [];
      const uploads: { item: MediaItem; path: string }[] = [];
      for (const slot of photoSlots) {
        const item = media[slot];
        if (!item) continue;
        const path = await uploadMedia('listing-media', userId, item);
        photoPaths.push(path);
        uploads.push({ item, path });
      }
      const videoItem = media[SLOT_VIDEO];
      const videoPath = videoItem ? await uploadMedia('listing-media', userId, videoItem) : null;
      if (videoItem && videoPath) uploads.push({ item: videoItem, path: videoPath });
      const proofItem = media[SLOT_PROOF];
      const proofPath = proofItem ? await uploadMedia('private-docs', userId, proofItem) : null;

      const client = (await import('../lib/supabase')).supabase!;
      const suggested = retail ? Number(retail.replace(/\D/g, '')) || null : null;
      const row: Record<string, unknown> = {
        owner_id: userId,
        title: title.trim(),
        brand: brand.trim() || null,
        category,
        size: sizes[0],
        sizes,
        occasion,
        price_per_day: price,
        retail_value: suggested,
        // A suggestion only: Rota approves the value that caps a renter's
        // liability, and members cannot write approved_value.
        suggested_value: suggested,
        cleaning_by_lender: lenderCleans,
        cleaning_fee: lenderCleans ? cleaningFee : 0,
        rules,
        accept_offers: true,
        instant_book: true,
        local_handover: true,
        city: 'Paris',
        photo_paths: photoPaths,
        video_path: videoPath,
        authenticity_path: proofPath,
      };

      // `sizes` arrives with migration 001 and `suggested_value` with 002.
      // Until they are run, drop the unknown column and publish anyway.
      const insert = (p: Record<string, unknown>) => client.from('listings').insert(p).select('id').single();
      let payload = row;
      let result = await insert(payload);
      for (const column of ['suggested_value', 'sizes']) {
        if (!result.error || !result.error.message.includes(column)) continue;
        const { [column]: _dropped, ...rest } = payload;
        payload = rest;
        result = await insert(payload);
      }

      if (result.error) throw new Error(result.error.message);
      setPublished(true);
      // Stills, provenance and the review request. Not awaited by the UI:
      // the listing exists and its review case is already queued.
      submitForReview({ userId, listingId: (result.data as { id: string }).id, uploads })
        .catch(() => undefined)
        .finally(refresh);
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  if (published) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            backgroundColor: c.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={26} weight="bold" color={c.onAccent}>
            ✓
          </Txt>
        </View>
        <Display size={34} style={{ marginTop: 20, textAlign: 'center' }}>
          {t('list.published')}
        </Display>
        <Txt size={15} color={c.ink2} style={{ marginTop: 10, textAlign: 'center' }}>
          {t('list.publishedReview')}
        </Txt>
        <PrimaryButton
          label={t('list.seeCloset')}
          onPress={() => {
            setPublished(false);
            reset();
            go('closet');
          }}
          style={{ marginTop: 24, alignSelf: 'stretch' }}
        />
        <GhostButton
          label="Publier une autre pièce"
          onPress={() => {
            setPublished(false);
            reset();
          }}
          style={{ marginTop: 10, alignSelf: 'stretch' }}
        />
      </View>
    );
  }

  const stepTitles = [t('list.step1'), t('list.step2'), t('list.step3')];

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={140}>
        <Steps current={step} />
        <Display size={32} style={{ marginTop: 16 }}>
          {stepTitles[step]}
        </Display>

        {step === 0 ? (
          <>
            <View style={{ marginTop: 20, height: 230, borderRadius: 14, overflow: 'hidden' }}>
              <MediaSlot id={SLOT_VIDEO} shape="rounded" radius={14} editable video placeholder={t('list.video')} />
            </View>
            <View style={{ marginTop: 10, flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, height: 130, borderRadius: 12, overflow: 'hidden' }}>
                <MediaSlot id={SLOT_PHOTO_1} shape="rounded" radius={12} editable placeholder={t('list.photoFront')} />
              </View>
              <View style={{ flex: 1, height: 130, borderRadius: 12, overflow: 'hidden' }}>
                <MediaSlot id={SLOT_PHOTO_2} shape="rounded" radius={12} editable placeholder={t('list.photoBack')} />
              </View>
            </View>
            <View style={{ marginTop: 14 }}>
              <Note>
                Les annonces avec une vidéo sont louées bien plus souvent. Filmez en lumière du jour et photographiez
                chaque défaut : c'est ce qui vous protège en cas de litige.
              </Note>
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <View style={{ marginTop: 20, gap: 10 }}>
            <Field
              label={t('list.titleField')}
              value={title}
              onChangeText={setTitle}
              placeholder={t('list.titlePlaceholder')}
              autoCapitalize="sentences"
            />
            <Field
              label={t('list.brand')}
              value={brand}
              onChangeText={setBrand}
              placeholder={t('list.brandPlaceholder')}
              autoCapitalize="sentences"
            />
            <Field
              label={t('list.retail')}
              value={retail}
              onChangeText={setRetail}
              placeholder="340"
              keyboardType="number-pad"
              hint={t('list.valueHint')}
            />

            <Card>
              <Txt size={11} weight="semi" upper color={c.ink3}>
                {t('list.category')}
              </Txt>
              <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map((cat) => (
                  <Chip key={cat} label={cat} on={category === cat} onPress={() => setCategory(cat)} />
                ))}
              </View>
            </Card>

            <Card>
              <Txt size={11} weight="semi" upper color={c.ink3}>
                Occasion
              </Txt>
              <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {OCCASIONS.map((o) => (
                  <Chip key={o} label={o} tone="plum" on={occasion === o} onPress={() => setOccasion(o)} />
                ))}
              </View>
            </Card>

            <Card>
              <Txt size={11} weight="semi" upper color={c.ink3}>
                {t('list.sizes')}
              </Txt>
              <Txt size={13} color={c.ink2} style={{ marginTop: 6 }}>
                {t('list.sizesHint')}
              </Txt>
              <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SIZES.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    on={sizes.includes(s)}
                    onPress={() =>
                      setSizes((current) =>
                        current.includes(s) ? current.filter((x) => x !== s) : [...current, s],
                      )
                    }
                  />
                ))}
              </View>
            </Card>

            <Card>
              <Txt size={11} weight="semi" upper color={c.ink3}>
                {t('list.authenticity')}
              </Txt>
              <Txt size={13} color={c.ink2} style={{ marginTop: 6 }}>
                {t('list.authenticityHint')}
              </Txt>
              <View style={{ marginTop: 10, height: 140, borderRadius: 12, overflow: 'hidden' }}>
                <MediaSlot id={SLOT_PROOF} shape="rounded" radius={12} editable placeholder="Facture ou étiquette" />
              </View>
            </Card>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ marginTop: 20, gap: 10 }}>
            <Card>
              <Txt size={11} weight="semi" upper color={c.ink3}>
                {t('list.price')}
              </Txt>
              <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Amount size={40} color={c.accent} style={{ flex: 1 }}>
                  {m(price)}
                </Amount>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Baisser le prix"
                  onPress={() => setPrice((p) => Math.max(1, p - 1))}
                  style={{ width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: c.line2, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Txt size={22}>−</Txt>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Augmenter le prix"
                  onPress={() => setPrice((p) => p + 1)}
                  style={{ width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: c.line2, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Txt size={20}>+</Txt>
                </Pressable>
              </View>
              <Txt size={13} color={c.ink3} style={{ marginTop: 10 }}>
                Vous gardez {m(Math.round(price * 3 * (1 - FEES.lenderServiceRate)))} sur 3 jours, après notre
                commission de {Math.round(FEES.lenderServiceRate * 100)} %.
              </Txt>
            </Card>

            <Card accent={lenderCleans}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Txt weight="bold">{t('list.cleaningTitle')}</Txt>
                  <Txt size={13} color={c.ink2} style={{ marginTop: 3 }}>
                    {t('list.cleaningBody')}
                  </Txt>
                </View>
                <Toggle on={lenderCleans} label={t('list.cleaningTitle')} onPress={() => setLenderCleans((v) => !v)} />
              </View>
              {lenderCleans ? (
                <View
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTopWidth: 1,
                    borderTopColor: c.line,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Txt style={{ flex: 1 }}>{t('list.cleaningFee')}</Txt>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Baisser les frais"
                    onPress={() => setCleaningFee((f: number) => Math.max(0, f - 1))}
                    style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: c.line2, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Txt size={20}>−</Txt>
                  </Pressable>
                  <Amount size={16}>{m(cleaningFee)}</Amount>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Augmenter les frais"
                    onPress={() => setCleaningFee((f: number) => f + 1)}
                    style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: c.line2, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Txt size={18}>+</Txt>
                  </Pressable>
                </View>
              ) : null}
            </Card>

            <Card>
              <Txt size={11} weight="semi" upper color={c.ink3}>
                {t('list.rules')}
              </Txt>
              <Txt size={13} color={c.ink2} style={{ marginTop: 6 }}>
                {t('list.rulesHint')}
              </Txt>
              <View style={{ marginTop: 10, gap: 8 }}>
                {rules.map((rule) => (
                  <View
                    key={rule}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: c.surf2,
                    }}
                  >
                    <Check on />
                    <Txt size={14} style={{ flex: 1 }}>
                      {rule}
                    </Txt>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${t('common.delete')} ${rule}`}
                      onPress={() => setRules((r) => r.filter((x) => x !== rule))}
                    >
                      <Txt size={18} color={c.ink3}>
                        ×
                      </Txt>
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Field label="" value={ruleDraft} onChangeText={setRuleDraft} placeholder={t('list.rulePlaceholder')} autoCapitalize="sentences" />
                </View>
                <GhostButton
                  label={t('common.add')}
                  tone="accent"
                  onPress={() => {
                    const rule = ruleDraft.trim();
                    if (!rule) return;
                    setRules((r) => [...r, rule]);
                    setRuleDraft('');
                  }}
                />
              </View>
            </Card>
          </View>
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
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {step > 0 ? (
            <GhostButton label={t('common.back')} onPress={() => setStep((s) => s - 1)} style={{ minHeight: 54 }} />
          ) : null}
          <View style={{ flex: 1 }}>
            {step < 2 ? (
              <PrimaryButton label={t('common.continue')} onPress={() => setStep((s) => s + 1)} />
            ) : (
              <PrimaryButton
                label={busy ? t('list.publishing') : t('list.publish')}
                disabled={busy}
                onPress={publish}
              />
            )}
          </View>
        </View>
      </FooterBar>
    </View>
  );
}
