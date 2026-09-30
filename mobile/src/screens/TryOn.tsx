/**
 * Virtual try-on. Live mode (web) streams the camera to Decart's
 * lucy-vton-3.5 and shows the dressed stream back; Photo mode (everywhere)
 * sends one selfie and the garment photo to lucy-image-2.
 *
 * Nothing is stored: the selfie goes to Decart for this request only.
 */
import { createDecartClient, models } from '@decartai/sdk';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { createElement, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { useListing } from '../data/listings';
import { useT } from '../i18n';
import { TRYON_LIVE_MODEL, TRYON_PHOTO_MODEL, garmentPrompt, getTryOnToken, tryOnConfigured } from '../lib/tryon';
import { useStore } from '../state/store';
import { OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { CameraIcon, CrownIcon, ImagesIcon, SparkleIcon } from '../ui/icons';
import { PurchaseUnavailable, TRYON_PRICE_EUR, useCommunity } from '../data/community';
import { Display, GhostButton, Header, Note, PrimaryButton, Screen, Txt } from '../ui/kit';
import { FadeIn, Pulse, PressScale, Segmented, tap } from '../ui/motion';

type Mode = 'live' | 'photo';
const WEB = Platform.OS === 'web';

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

type RealtimeHandle = { disconnect: () => void; set: (input: { prompt?: string; image?: Blob | string | null }) => Promise<void> };

function LiveTryOn({ prompt, garment }: { prompt: string; garment: string }) {
  const { c } = useTheme();
  const { t } = useT();
  const { width } = useWindowDimensions();
  const outRef = useRef<HTMLVideoElement | null>(null);
  const inRef = useRef<HTMLVideoElement | null>(null);
  const rt = useRef<RealtimeHandle | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');

  const stop = () => {
    rt.current?.disconnect();
    rt.current = null;
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    setState('idle');
  };

  useEffect(() => stop, []);

  const start = async () => {
    setState('connecting');
    try {
      const apiKey = await getTryOnToken();
      const model = models.realtime(TRYON_LIVE_MODEL);
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { frameRate: model.fps, width: model.width, height: model.height, facingMode: 'user' },
      });
      stream.current = media;
      if (inRef.current) inRef.current.srcObject = media;
      const client = createDecartClient({ apiKey });
      const garmentBlob = await fetch(garment).then((r) => r.blob());
      const conn = await client.realtime.connect(media, {
        model,
        mirror: 'auto',
        onRemoteStream: (out: MediaStream) => {
          if (outRef.current) outRef.current.srcObject = out;
          setState('live');
        },
      });
      rt.current = conn as unknown as RealtimeHandle;
      await rt.current.set({ prompt, image: garmentBlob });
      tap('success');
    } catch {
      stop();
      setState('error');
    }
  };

  const h = Math.min(width, 720) * 1.2;
  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ height: h, borderRadius: 24, overflow: 'hidden', backgroundColor: c.surf2, alignItems: 'center', justifyContent: 'center' }}>
        {createElement('video', {
          ref: outRef,
          autoPlay: true,
          playsInline: true,
          muted: true,
          style: { width: '100%', height: '100%', objectFit: 'cover', display: state === 'live' ? 'block' : 'none' },
        })}
        {state !== 'live' ? (
          <View style={{ position: 'absolute', alignItems: 'center', gap: 10, paddingHorizontal: 24 }}>
            {state === 'connecting' ? (
              <Pulse>
                <SparkleIcon size={46} color={c.accent} />
              </Pulse>
            ) : (
              <SparkleIcon size={46} color={c.accent} />
            )}
            <Txt center color={c.ink2}>
              {state === 'connecting' ? t('tryon.connecting') : state === 'error' ? t('tryon.failed') : t('tryon.subtitle')}
            </Txt>
          </View>
        ) : null}
        <View style={{ position: 'absolute', right: 10, bottom: 10, width: 90, height: 120, borderRadius: 14, overflow: 'hidden', opacity: state === 'live' ? 1 : 0 }}>
          {createElement('video', {
            ref: inRef,
            autoPlay: true,
            playsInline: true,
            muted: true,
            style: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
          })}
        </View>
        {state === 'live' ? (
          <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: 'rgba(12,10,13,0.6)' }}>
            <Pulse style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: '#FF5C7A' }} />
            <Txt size={11} weight="bold" color={OVER_INK}>
              LIVE · {t('tryon.aiLabel')}
            </Txt>
          </View>
        ) : null}
      </View>
      {state === 'live' ? (
        <GhostButton label={t('tryon.stop')} onPress={stop} style={{ marginTop: 14 }} />
      ) : (
        <PrimaryButton label={t('tryon.start')} onPress={start} disabled={state === 'connecting'} style={{ marginTop: 14 }} />
      )}
    </View>
  );
}

function PhotoTryOn({ prompt, garment }: { prompt: string; garment: string }) {
  const { c } = useTheme();
  const { t } = useT();
  const { width } = useWindowDimensions();
  const [selfie, setSelfie] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBefore, setShowBefore] = useState(false);

  const run = async (asset: ImagePicker.ImagePickerAsset) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const apiKey = await getTryOnToken();
      const client = createDecartClient({ apiKey });
      const data = WEB
        ? await fetch(asset.uri).then((r) => r.blob())
        : { uri: asset.uri, type: asset.mimeType ?? 'image/jpeg', name: asset.fileName ?? 'selfie.jpg' };
      const blob = await client.process({
        model: models.image(TRYON_PHOTO_MODEL),
        prompt,
        data,
        reference_image: garment,
      });
      setResult(WEB ? URL.createObjectURL(blob) : await blobToDataUrl(blob));
      tap('success');
    } catch {
      setError(t('tryon.failed'));
    } finally {
      setBusy(false);
    }
  };

  const pick = async (source: 'camera' | 'library') => {
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, cameraType: ImagePicker.CameraType.front }).catch(() => null)
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 }).catch(() => null);
    const asset = res && !res.canceled ? res.assets[0] : null;
    if (!asset) return;
    setSelfie(asset);
    run(asset);
  };

  const h = Math.min(width, 720) * 1.2;
  const shown = showBefore ? selfie?.uri : (result ?? selfie?.uri);

  return (
    <View style={{ marginTop: 16 }}>
      <Pressable
        onPressIn={() => setShowBefore(true)}
        onPressOut={() => setShowBefore(false)}
        disabled={!result}
        style={{ height: h, borderRadius: 24, overflow: 'hidden', backgroundColor: c.surf2, alignItems: 'center', justifyContent: 'center' }}
      >
        {shown ? <Image source={{ uri: shown }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} /> : null}
        {!selfie ? (
          <View style={{ position: 'absolute', alignItems: 'center', gap: 10, paddingHorizontal: 24 }}>
            <SparkleIcon size={46} color={c.accent} />
            <Txt center color={c.ink2}>
              {t('tryon.subtitle')}
            </Txt>
          </View>
        ) : null}
        {busy ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,10,13,0.45)', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Pulse>
              <SparkleIcon size={52} color={OVER_INK} />
            </Pulse>
            <Txt weight="bold" color={OVER_INK}>
              {t('tryon.generating')}
            </Txt>
          </View>
        ) : null}
        {result ? (
          <View style={{ position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: 'rgba(12,10,13,0.6)' }}>
            <Txt size={11} weight="bold" color={OVER_INK}>
              {showBefore ? 'AVANT' : `${t('tryon.aiLabel')} · appuyez pour comparer`}
            </Txt>
          </View>
        ) : null}
      </Pressable>
      {error ? (
        <Txt size={13} color={c.plum} style={{ marginTop: 10 }}>
          {error}
        </Txt>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <PressScale
          onPress={() => pick('camera')}
          disabled={busy}
          style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: 16, backgroundColor: c.accent }}
        >
          <CameraIcon size={19} color={c.onAccent} />
          <Txt weight="bold" color={c.onAccent}>
            {selfie ? t('tryon.retry') : t('tryon.selfie')}
          </Txt>
        </PressScale>
        <PressScale
          onPress={() => pick('library')}
          disabled={busy}
          style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: 16, backgroundColor: c.surf2 }}
        >
          <ImagesIcon size={19} color={c.ink} />
          <Txt weight="bold">{t('tryon.choose')}</Txt>
        </PressScale>
      </View>
    </View>
  );
}

export function TryOn() {
  const { state, set, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const listing = useListing(state.tryOnListingId);
  const [mode, setMode] = useState<Mode>(WEB ? 'live' : 'photo');
  // Apple 5.1.2(i) / EU AI Act art. 50: name the AI provider and get consent
  // before any image leaves the device. Asked once per visit.
  const [consented, setConsented] = useState(false);
  const community = useCommunity();
  // Rota Pro includes try-on; otherwise one credit per session.
  const [unlocked, setUnlocked] = useState(community.pro || !community.purchasesAvailable);
  const [payNote, setPayNote] = useState<string | null>(null);
  const garment = listing?.photos[0];
  const unlockWithCredit = async () => {
    if (await community.consumeTryOn()) setUnlocked(true);
  };
  const buyOne = async () => {
    setPayNote(null);
    try {
      await community.buyTryOn(1);
      setUnlocked(true);
    } catch (e) {
      setPayNote(e instanceof PurchaseUnavailable ? t('pro.iapSoon') : String(e));
    }
  };

  return (
    <Screen bottomInset={40}>
      <Header title={t('tryon.title')} onBack={() => set({ screen: listing ? 'detail' : 'feed', activeId: listing?.id ?? state.activeId })} />

      {listing ? (
        <FadeIn>
          <View style={{ marginTop: 12, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, borderRadius: 18, backgroundColor: c.surf }}>
            <Image source={{ uri: garment }} style={{ width: 54, height: 66, borderRadius: 12 }} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Txt size={11} weight="bold" upper color={c.accent}>
                {listing.brand ?? listing.category}
              </Txt>
              <Txt weight="semi" numberOfLines={1}>
                {listing.title}
              </Txt>
              <Txt size={13} color={c.ink3}>
                {m(listing.price)} {t('common.perDay')}
              </Txt>
            </View>
            <PressScale
              onPress={() => set({ screen: 'detail', activeId: listing.id })}
              style={{ paddingHorizontal: 14, minHeight: 38, borderRadius: 999, backgroundColor: c.accent, justifyContent: 'center' }}
            >
              <Txt size={13} weight="bold" color={c.onAccent}>
                {t('feed.rent')}
              </Txt>
            </PressScale>
          </View>
        </FadeIn>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <Segmented
          items={[
            { key: 'live', label: `${t('tryon.live')}` },
            { key: 'photo', label: t('tryon.photo') },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>

      {!tryOnConfigured ? (
        <View style={{ marginTop: 16 }}>
          <Note tone="accent">{t('tryon.notConfigured')}</Note>
        </View>
      ) : null}

      {listing && garment && !unlocked && !community.pro && community.purchasesAvailable ? (
        <FadeIn style={{ marginTop: 16, padding: 18, borderRadius: 20, backgroundColor: c.surf, borderWidth: 1, borderColor: c.accent, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CrownIcon size={22} color={c.accent} />
            <Txt size={17} weight="bold">
              {t('tryon.gateTitle')}
            </Txt>
          </View>
          <Txt size={14} color={c.ink2}>
            {t('tryon.gateBody')}
          </Txt>
          <PrimaryButton label={t('pro.subscribe')} onPress={() => set({ screen: 'pro', proFrom: 'tryon' })} />
          {community.tryOnCredits > 0 ? (
            <GhostButton label={`${t('pro.credits').replace('{n}', String(community.tryOnCredits))}`} tone="accent" onPress={unlockWithCredit} />
          ) : (
            <GhostButton label={`${t('pro.buyOne')} · ${m(TRYON_PRICE_EUR)}`} tone="accent" onPress={buyOne} />
          )}
          {payNote ? (
            <Txt size={13} color={c.plum}>
              {payNote}
            </Txt>
          ) : null}
        </FadeIn>
      ) : listing && garment && !consented ? (
        <FadeIn style={{ marginTop: 16, padding: 18, borderRadius: 20, backgroundColor: c.surf, borderWidth: 1, borderColor: c.accent, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SparkleIcon size={22} color={c.accent} />
            <Txt size={17} weight="bold">
              {t('tryon.consentTitle')}
            </Txt>
          </View>
          <Txt size={14} color={c.ink2}>
            {t('tryon.consentBody')}
          </Txt>
          <Txt size={12} color={c.ink3}>
            {t('tryon.adult')}
          </Txt>
          <PrimaryButton label={t('tryon.consentAccept')} onPress={() => setConsented(true)} style={{ marginTop: 4 }} />
        </FadeIn>
      ) : !listing || !garment ? (
        <Display size={22} style={{ marginTop: 24 }}>
          {t('post.notFound')}
        </Display>
      ) : mode === 'live' && WEB ? (
        <LiveTryOn prompt={garmentPrompt(listing)} garment={garment} />
      ) : mode === 'live' ? (
        <View style={{ marginTop: 16 }}>
          <Note>{t('tryon.nativeLive')}</Note>
        </View>
      ) : (
        <PhotoTryOn prompt={garmentPrompt(listing)} garment={garment} />
      )}

      <View style={{ marginTop: 16, gap: 8 }}>
        <Note>{t('tryon.privacy')}</Note>
        <Txt size={12} color={c.ink3}>
          {t('tryon.adult')}
        </Txt>
      </View>
    </Screen>
  );
}
