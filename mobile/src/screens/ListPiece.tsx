/**
 * Mettre une pièce en location — one scrolling page, like Vinted's "Vends un
 * article": photos, the piece, its details, price and rules, then publish.
 * The camera screen can pre-fill the first photo slots.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { OCCASIONS } from '../data/catalog';
import { useListings } from '../data/listings';
import { findLeaf, isLuxury, SIZE_SCALES, suggestDailyPrice } from '../data/taxonomy';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/errors';
import { FEES } from '../lib/fees';
import { submitForReview } from '../lib/moderation';
import { usePolicy } from '../lib/policy';
import { uploadMedia } from '../lib/upload';
import { useStore } from '../state/store';
import type { MediaItem } from '../state/types';
import { useTheme } from '../theme/useTheme';
import { CheckIcon, CloseIcon, MinusIcon, PlusIcon } from '../ui/icons';
import { Amount, Check, Chip, Display, Field, GhostButton, Note, PrimaryButton, Screen, Toggle, Txt } from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';
import { BrandPicker, CategoryPicker, FitSlider, ParcelPicker, PickerRow, recommendedParcel, type ParcelSize } from '../ui/Pickers';
import { IdentityGate } from './Verify';

const SLOT_VIDEO = 'new-listing-video';
const SLOT_PHOTO_1 = 'new-listing-photo-1';
const SLOT_PHOTO_2 = 'new-listing-photo-2';
const SLOT_PROOF = 'new-listing-proof';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 28 }}>
      <Txt size={20} weight="bold">
        {title}
      </Txt>
      <View style={{ marginTop: 12, gap: 10 }}>{children}</View>
    </View>
  );
}

/** A bordered block with a small caps label, for chips and toggles. */
function Block({ label, hint, children }: { label: string; hint?: string; children?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.line2, backgroundColor: c.surf }}>
      <Txt size={15} weight="semi">
        {label}
      </Txt>
      {hint ? (
        <Txt size={13} color={c.ink3} style={{ marginTop: 3 }}>
          {hint}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

function Stepper({ onMinus, onPlus, minusLabel, plusLabel, size = 44 }: { onMinus: () => void; onPlus: () => void; minusLabel: string; plusLabel: string; size?: number }) {
  const { c } = useTheme();
  const btn = { width: size, height: size, borderRadius: 999, borderWidth: 1, borderColor: c.line2, alignItems: 'center' as const, justifyContent: 'center' as const };
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={minusLabel} onPress={onMinus} style={btn}>
        <MinusIcon size={18} color={c.ink} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={plusLabel} onPress={onPlus} style={btn}>
        <PlusIcon size={18} color={c.ink} />
      </Pressable>
    </View>
  );
}

export function ListPiece() {
  const { state, go, m, setMedia } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const { session } = useAuth();
  const { refresh } = useListings();
  const policy = usePolicy();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [retail, setRetail] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [picker, setPicker] = useState<'category' | 'brand' | 'parcel' | null>(null);
  const [parcel, setParcel] = useState<ParcelSize | null>(null);
  const [fit, setFit] = useState(0);
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
  const leaf = findLeaf(categoryId);
  const sizeScale = leaf ? SIZE_SCALES[leaf.sizeKind] : [];
  const luxury = isLuxury(brand, policy.luxuryBrands);
  const pricey = price > policy.authenticityPricePerDay;
  // Proof is asked for luxury brands and pieces rented at a high daily price.
  const proofNeeded = luxury || pricey;
  const purchase = Number(retail.replace(/\D/g, '')) || 0;
  const advice = suggestDailyPrice(purchase, categoryId);
  const photoSlots = [SLOT_PHOTO_1, SLOT_PHOTO_2].filter((id) => media[id]);
  const hasPhoto = photoSlots.length > 0 || !!media[SLOT_VIDEO];

  const chooseCategory = (id: string) => {
    const next = findLeaf(id);
    // A different size scale (letters → shoe sizes) makes the old ticks meaningless.
    if (next && leaf && next.sizeKind !== leaf.sizeKind) setSizes([]);
    if (next?.sizeKind === 'one') setSizes(['TU']);
    setCategoryId(id);
  };

  /** The first thing still missing, in page order. */
  const problem = (): string | null => {
    if (!hasPhoto) return t('list.needPhoto');
    if (title.trim().length < 3) return t('list.needTitle');
    if (!categoryId) return t('list.needCategory');
    if (sizes.length === 0) return t('list.needSize');
    if (proofNeeded && !media[SLOT_PROOF]) return t('list.needProof');
    return null;
  };

  const reset = () => {
    [SLOT_VIDEO, SLOT_PHOTO_1, SLOT_PHOTO_2, SLOT_PROOF].forEach((id) => setMedia(id, null));
    setTitle('');
    setDescription('');
    setBrand('');
    setRetail('');
    setSizes([]);
    setCategoryId(null);
    setFit(0);
    setRules([]);
    setPrice(20);
    setLenderCleans(false);
    setParcel(null);
  };

  const publish = async () => {
    if (!session) return setError(t('list.signIn'));
    const missing = problem();
    if (missing) return setError(missing);

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
        description: description.trim() || null,
        brand: brand.trim() || null,
        // The French label keeps older screens readable; the id is the real category.
        category: leaf?.label.fr ?? 'Autres',
        category_id: categoryId,
        size: sizes[0],
        sizes,
        size_fit: leaf?.sizeKind === 'one' ? null : fit,
        occasion,
        parcel_size: parcel ?? recommendedParcel(categoryId),
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

      // Columns added by later migrations: drop any the database doesn't have yet.
      const insert = (p: Record<string, unknown>) => client.from('listings').insert(p).select('id').single();
      let payload = row;
      let result = await insert(payload);
      for (const column of ['parcel_size', 'description', 'category_id', 'size_fit', 'suggested_value', 'sizes']) {
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
        <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <CheckIcon size={30} color={c.onAccent} />
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
          label={t('list.another')}
          onPress={() => {
            setPublished(false);
            reset();
          }}
          style={{ marginTop: 10, alignSelf: 'stretch' }}
        />
      </View>
    );
  }

  const proofBlock = (
    <Block label={t('list.authenticity')} hint={luxury ? t('list.proofLuxury').replace('{brand}', brand) : t('list.proofPrice').replace('{price}', m(policy.authenticityPricePerDay))}>
      <View style={{ marginTop: 10, height: 120, borderRadius: 12, overflow: 'hidden' }}>
        <MediaSlot id={SLOT_PROOF} shape="rounded" radius={12} editable placeholder={t('list.proofSlot')} />
      </View>
    </Block>
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={60}>
        {/* Header: close, centred title */}
        <View style={{ height: 52, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={() => go('closet')}
            hitSlop={8}
            style={{ width: 44, height: 44, borderRadius: 99, backgroundColor: c.surf2, alignItems: 'center', justifyContent: 'center' }}
          >
            <CloseIcon size={18} color={c.ink} />
          </Pressable>
          <Txt size={17} weight="bold" center style={{ flex: 1 }} numberOfLines={1}>
            {t('create.list')}
          </Txt>
          <View style={{ width: 44 }} />
        </View>

        {/* Photos */}
        <Section title={t('list.sectionPhotos')}>
          <View style={{ padding: 10, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.line2, gap: 10 }}>
            <View style={{ height: 190, borderRadius: 12, overflow: 'hidden' }}>
              <MediaSlot id={SLOT_VIDEO} shape="rounded" radius={12} editable video placeholder={t('list.video')} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, height: 120, borderRadius: 12, overflow: 'hidden' }}>
                <MediaSlot id={SLOT_PHOTO_1} shape="rounded" radius={12} editable placeholder={t('list.photoFront')} />
              </View>
              <View style={{ flex: 1, height: 120, borderRadius: 12, overflow: 'hidden' }}>
                <MediaSlot id={SLOT_PHOTO_2} shape="rounded" radius={12} editable placeholder={t('list.photoBack')} />
              </View>
            </View>
          </View>
          <Note>{t('list.videoTip')}</Note>
        </Section>

        {/* The piece */}
        <Section title={t('list.sectionPresent')}>
          <Field label={t('list.titleField')} value={title} onChangeText={setTitle} placeholder={t('list.titlePlaceholder')} autoCapitalize="sentences" />
          <Field
            label={t('list.description')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('list.descriptionPlaceholder')}
            autoCapitalize="sentences"
            multiline
          />
        </Section>

        {/* Details */}
        <Section title={t('list.sectionDetails')}>
          <PickerRow label={t('list.category')} value={leaf?.label[lang]} onPress={() => setPicker('category')} />
          <PickerRow label={t('list.brand')} value={brand || null} onPress={() => setPicker('brand')} />

          <Block label={t('list.sizes')} hint={leaf ? t('list.sizesHint') : t('list.pickCategoryFirst')}>
            {sizeScale.length ? (
              <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {sizeScale.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    on={sizes.includes(s)}
                    onPress={() => setSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                  />
                ))}
              </View>
            ) : null}
          </Block>

          {leaf && leaf.sizeKind !== 'one' ? (
            <Block label={t('fit.title')}>
              <View style={{ marginTop: 12 }}>
                <FitSlider value={fit} onChange={setFit} />
              </View>
            </Block>
          ) : null}

          <Block label={t('list.occasion')}>
            <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {OCCASIONS.map((o) => (
                <Chip key={o} label={o} on={occasion === o} onPress={() => setOccasion(o)} />
              ))}
            </View>
          </Block>

          <Field
            label={t('list.retail')}
            value={retail}
            onChangeText={setRetail}
            placeholder={t('list.retailPlaceholder')}
            keyboardType="number-pad"
            hint={t('list.valueHint')}
          />

          <PickerRow
            label={t('list.parcel')}
            value={parcel ? t(`list.parcel.${parcel}` as 'list.parcel.s') : null}
            onPress={() => setPicker('parcel')}
          />

          {luxury ? proofBlock : null}
        </Section>

        {/* Price and rules */}
        <Section title={t('list.sectionPrice')}>
          <Block label={t('list.price')}>
            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Amount size={40} color={c.accent} style={{ flex: 1 }}>
                {m(price)}
              </Amount>
              <Stepper
                minusLabel={t('list.priceDown')}
                plusLabel={t('list.priceUp')}
                onMinus={() => setPrice((p) => Math.max(1, p - 1))}
                onPlus={() => setPrice((p) => p + 1)}
              />
            </View>
            <Txt size={13} color={c.ink3} style={{ marginTop: 10 }}>
              {t('list.youKeep')
                .replace('{amount}', m(Math.round(price * 3 * (1 - FEES.lenderServiceRate))))
                .replace('{rate}', String(Math.round(FEES.lenderServiceRate * 100)))}
            </Txt>
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
              {advice ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Txt size={13} weight="semi">
                      {t('list.suggested').replace('{price}', m(advice.best))}
                    </Txt>
                    <Txt size={12} color={c.ink3} style={{ marginTop: 2 }}>
                      {t('list.suggestedRange').replace('{low}', m(advice.low)).replace('{high}', m(advice.high)).replace('{value}', m(purchase))}
                    </Txt>
                  </View>
                  {price !== advice.best ? <GhostButton label={t('list.useSuggested')} tone="accent" onPress={() => setPrice(advice.best)} /> : null}
                </View>
              ) : (
                <Txt size={12} color={c.ink3}>
                  {t('list.suggestNeedsValue')}
                </Txt>
              )}
            </View>
          </Block>

          {pricey && !luxury ? proofBlock : null}

          <Block label={t('list.cleaningTitle')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 3 }}>
              <Txt size={13} color={c.ink3} style={{ flex: 1 }}>
                {t('list.cleaningBody')}
              </Txt>
              <Toggle on={lenderCleans} label={t('list.cleaningTitle')} onPress={() => setLenderCleans((v) => !v)} />
            </View>
            {lenderCleans ? (
              <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Txt style={{ flex: 1 }}>{t('list.cleaningFee')}</Txt>
                <Amount size={16}>{m(cleaningFee)}</Amount>
                <Stepper
                  size={38}
                  minusLabel={t('list.priceDown')}
                  plusLabel={t('list.priceUp')}
                  onMinus={() => setCleaningFee((f) => Math.max(0, f - 1))}
                  onPlus={() => setCleaningFee((f) => f + 1)}
                />
              </View>
            ) : null}
          </Block>

          <Block label={t('list.rules')} hint={t('list.rulesHint')}>
            <View style={{ marginTop: rules.length ? 10 : 0, gap: 8 }}>
              {rules.map((rule) => (
                <View key={rule} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: c.surf2 }}>
                  <Check on />
                  <Txt size={14} style={{ flex: 1 }}>
                    {rule}
                  </Txt>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${t('common.delete')} ${rule}`} onPress={() => setRules((r) => r.filter((x) => x !== rule))} hitSlop={8}>
                    <CloseIcon size={16} color={c.ink3} />
                  </Pressable>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
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
          </Block>
        </Section>

        {error ? (
          <View style={{ marginTop: 18, padding: 12, borderRadius: 12, backgroundColor: c.plumSoft, borderWidth: 1, borderColor: c.plum }}>
            <Txt size={13}>{error}</Txt>
          </View>
        ) : null}

        <View style={{ marginTop: 22 }}>
          <IdentityGate reason="list" returnTo="list">
            <PrimaryButton label={busy ? t('list.publishing') : t('list.publish')} disabled={busy} onPress={publish} />
          </IdentityGate>
        </View>
      </Screen>

      <CategoryPicker visible={picker === 'category'} value={categoryId} onClose={() => setPicker(null)} onPick={chooseCategory} />
      <ParcelPicker
        visible={picker === 'parcel'}
        value={parcel}
        recommended={recommendedParcel(categoryId)}
        onClose={() => setPicker(null)}
        onPick={setParcel}
      />
      <BrandPicker visible={picker === 'brand'} value={brand} onClose={() => setPicker(null)} onPick={setBrand} />
    </View>
  );
}
