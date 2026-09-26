/**
 * Vinted-style pickers for the listing form: a row that opens a full-screen
 * list, a category tree you drill into (or search), a brand list you can
 * search or type past, and the fit slider.
 */
import { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, PanResponder, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BRANDS,
  CATEGORY_LEAVES,
  CATEGORY_TREE,
  findLeaf,
  isLuxury,
  normalizeBrand,
  POPULAR_BRANDS,
  type CategoryNode,
} from '../data/taxonomy';
import { useT } from '../i18n';
import { useTheme } from '../theme/useTheme';
import { FONT } from '../theme/tokens';
import { Radio, Txt } from './kit';

/** The bordered "Catégorie  ＋" row from Vinted's listing form. */
export function PickerRow({ label, value, onPress }: { label: string; value?: string | null; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 58,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.line2,
        backgroundColor: c.surf,
      }}
    >
      <Txt weight="semi">{label}</Txt>
      <Txt size={14} color={c.ink3} numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>
        {value ?? ''}
      </Txt>
      <Txt size={value ? 16 : 22} color={c.ink2}>
        {value ? '✎' : '+'}
      </Txt>
    </Pressable>
  );
}

function PickerModal({
  visible,
  title,
  onBack,
  children,
}: {
  visible: boolean;
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" style={{ width: 40 }}>
            <Txt size={24}>←</Txt>
          </Pressable>
          <Txt size={17} weight="bold" center style={{ flex: 1 }} numberOfLines={1}>
            {title}
          </Txt>
          <View style={{ width: 40 }} />
        </View>
        {children}
      </View>
    </Modal>
  );
}

function SearchBox({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  const { c, fs } = useTheme();
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, height: 46, borderRadius: 12, backgroundColor: c.surf2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Txt color={c.ink3}>⌕</Txt>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.ink3}
        autoFocus={autoFocus}
        autoCorrect={false}
        style={{ flex: 1, color: c.ink, fontFamily: FONT.sansSemi, fontSize: fs(16), padding: 0 }}
      />
    </View>
  );
}

function ListRow({
  title,
  subtitle,
  right,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right: 'chevron' | 'radio';
  selected?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}
    >
      <View style={{ flex: 1 }}>
        <Txt size={16}>{title}</Txt>
        {subtitle ? (
          <Txt size={13} color={right === 'chevron' ? c.accent : c.ink3} style={{ marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right === 'chevron' ? <Txt size={20} color={c.ink3}>›</Txt> : <Radio on={!!selected} />}
    </Pressable>
  );
}

// ── Category ───────────────────────────────────────────────────

export function CategoryPicker({
  visible,
  value,
  onClose,
  onPick,
}: {
  visible: boolean;
  value: string | null;
  onClose: () => void;
  onPick: (leafId: string) => void;
}) {
  const { t, lang } = useT();
  const [trail, setTrail] = useState<CategoryNode[]>([]);
  const [query, setQuery] = useState('');
  const current = trail[trail.length - 1];
  const nodes = current?.children ?? CATEGORY_TREE;
  const selected = findLeaf(value);

  const results = useMemo(() => {
    const q = normalizeBrand(query);
    if (!q) return [];
    return CATEGORY_LEAVES.filter((l) => normalizeBrand([l.label[lang], ...l.path.map((p) => p[lang])].join(' ')).includes(q));
  }, [query, lang]);

  const back = () => {
    if (query) return setQuery('');
    if (trail.length) return setTrail((tr) => tr.slice(0, -1));
    onClose();
  };
  const pick = (id: string) => {
    onPick(id);
    setTrail([]);
    setQuery('');
    onClose();
  };

  return (
    <PickerModal visible={visible} title={current ? current.label[lang] : t('list.category')} onBack={back}>
      <SearchBox value={query} onChange={setQuery} placeholder={t('pick.findCategory')} />
      {query ? (
        <FlatList
          data={results}
          keyExtractor={(l) => l.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ListRow
              title={item.label[lang]}
              subtitle={item.path.map((p) => p[lang]).join(' › ')}
              right="radio"
              selected={item.id === value}
              onPress={() => pick(item.id)}
            />
          )}
          ListEmptyComponent={<Txt center style={{ marginTop: 24 }}>{t('pick.noResult')}</Txt>}
        />
      ) : (
        <FlatList
          data={nodes}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => {
            const within = selected && selected.id.startsWith(`${item.id}.`);
            return item.children ? (
              <ListRow
                title={`${item.icon ? `${item.icon}  ` : ''}${item.label[lang]}`}
                subtitle={within ? selected.label[lang] : undefined}
                right="chevron"
                onPress={() => setTrail((tr) => [...tr, item])}
              />
            ) : (
              <ListRow title={item.label[lang]} right="radio" selected={item.id === value} onPress={() => pick(item.id)} />
            );
          }}
        />
      )}
    </PickerModal>
  );
}

// ── Brand ──────────────────────────────────────────────────────

export function BrandPicker({
  visible,
  value,
  onClose,
  onPick,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onPick: (brand: string) => void;
}) {
  const { c } = useTheme();
  const { t } = useT();
  const [query, setQuery] = useState('');
  const q = normalizeBrand(query);

  const list = useMemo(() => {
    if (!q) {
      const popular = POPULAR_BRANDS.map((name) => BRANDS.find((b) => b.name === name)!).filter(Boolean);
      return [...popular.map((b) => ({ ...b, key: `pop-${b.name}` })), ...BRANDS.map((b) => ({ ...b, key: b.name }))];
    }
    const starts = BRANDS.filter((b) => normalizeBrand(b.name).startsWith(q));
    const contains = BRANDS.filter((b) => !normalizeBrand(b.name).startsWith(q) && normalizeBrand(b.name).includes(q));
    return [...starts, ...contains].map((b) => ({ ...b, key: b.name }));
  }, [q]);

  const exact = BRANDS.some((b) => normalizeBrand(b.name) === q);
  const pick = (name: string) => {
    onPick(name);
    setQuery('');
    onClose();
  };

  return (
    <PickerModal visible={visible} title={t('list.brand')} onBack={onClose}>
      <SearchBox value={query} onChange={setQuery} placeholder={t('pick.findBrand')} autoFocus />
      <FlatList
        data={list}
        keyExtractor={(b) => b.key}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {query.trim() && !exact ? (
              <ListRow
                title={t('pick.useTyped').replace('{brand}', query.trim())}
                subtitle={isLuxury(query) ? t('pick.proofNeeded') : t('pick.notListed')}
                right="radio"
                onPress={() => pick(query.trim())}
              />
            ) : null}
            {!query ? (
              <ListRow title={t('pick.noBrand')} right="radio" selected={!value} onPress={() => pick('')} />
            ) : null}
          </>
        }
        renderItem={({ item, index }) => (
          <View>
            {!query && (index === 0 || index === POPULAR_BRANDS.length) ? (
              <Txt size={12} weight="semi" upper color={c.ink3} style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
                {index === 0 ? t('pick.popular') : t('pick.allBrands')}
              </Txt>
            ) : null}
            <ListRow
              title={item.name}
              subtitle={item.luxury ? t('pick.proofNeeded') : undefined}
              right="radio"
              selected={item.name === value}
              onPress={() => pick(item.name)}
            />
          </View>
        )}
      />
    </PickerModal>
  );
}

// ── Fit ────────────────────────────────────────────────────────

export const FIT_STEPS = [-2, -1, 0, 1, 2] as const;

/** A ball on a bar: runs small ← true to size → runs large. Drag it or tap the bar. */
export function FitSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const BALL = 28;

  const toStep = (x: number) => {
    const w = widthRef.current - BALL;
    if (w <= 0) return 0;
    const ratio = Math.min(1, Math.max(0, (x - BALL / 2) / w));
    return Math.round(ratio * 4) - 2;
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => onChangeRef.current(toStep(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => onChangeRef.current(toStep(e.nativeEvent.locationX)),
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const left = width > BALL ? ((value + 2) / 4) * (width - BALL) : 0;
  return (
    <View>
      <Txt size={15} weight="bold" center style={{ marginBottom: 12 }}>
        {t(`fit.${value}` as 'fit.0')}
      </Txt>
      <View
        {...pan.panHandlers}
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width;
          setWidth(e.nativeEvent.layout.width);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel={t('fit.title')}
        accessibilityValue={{ text: t(`fit.${value}` as 'fit.0') }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          onChange(Math.max(-2, Math.min(2, value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))
        }
        style={{ height: BALL + 12, justifyContent: 'center' }}
      >
        <View style={{ height: 6, borderRadius: 99, backgroundColor: c.surf2, marginHorizontal: BALL / 2 }} />
        {FIT_STEPS.map((s) => (
          <View
            key={s}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: width > BALL ? ((s + 2) / 4) * (width - BALL) + BALL / 2 - 3 : 0,
              width: 6,
              height: 6,
              borderRadius: 99,
              backgroundColor: c.line2,
            }}
          />
        ))}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left,
            width: BALL,
            height: BALL,
            borderRadius: 99,
            backgroundColor: c.accent,
            borderWidth: 3,
            borderColor: c.bg,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Txt size={12} color={c.ink3}>
          {t('fit.small')}
        </Txt>
        <Txt size={12} color={c.ink3}>
          {t('fit.true')}
        </Txt>
        <Txt size={12} color={c.ink3}>
          {t('fit.large')}
        </Txt>
      </View>
    </View>
  );
}
