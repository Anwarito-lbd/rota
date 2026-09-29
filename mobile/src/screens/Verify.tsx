/**
 * Identity verification (Stripe Identity: document + selfie). Rota only ever
 * receives the outcome; the documents stay with Stripe. Required to rent,
 * to list a piece, and to publish without waiting for review.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { paymentsConfigured } from '../data/payments';
import { useSocial } from '../data/social';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { ShieldCheckIcon } from '../ui/icons';
import { Display, Header, Note, PrimaryButton, Screen, Txt } from '../ui/kit';
import { FadeIn, NATIVE_DRIVER, Pop, tap } from '../ui/motion';

function Spinner() {
  const { c } = useTheme();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 112,
        height: 112,
        borderRadius: 99,
        borderWidth: 3,
        borderColor: c.accentSoft,
        borderTopColor: c.accent,
        transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    />
  );
}

export function Verify() {
  const { state, set, go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const social = useSocial();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = social.identity;
  const canRun = social.demo || paymentsConfigured;

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await social.verifyId();
      if (result === 'verified') tap('success');
    } catch {
      setError(t('verify.unavailable'));
    } finally {
      setBusy(false);
    }
  };

  const next = () => go(state.afterVerify ?? 'feed');
  const pending = busy || status === 'pending';

  return (
    <Screen bottomInset={40}>
      <Header title="" onBack={next} />
      <FadeIn style={{ alignItems: 'center', marginTop: 10 }}>
        <View style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center' }}>
          {pending ? <Spinner /> : null}
          <Pop active={status === 'verified'}>
            <View
              style={{
                width: 92,
                height: 92,
                borderRadius: 99,
                backgroundColor: status === 'verified' ? c.accent : c.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheckIcon size={44} color={status === 'verified' ? c.onAccent : c.accent} />
            </View>
          </Pop>
        </View>
        <Display size={34} style={{ marginTop: 18, textAlign: 'center' }}>
          {status === 'verified' ? t('verify.done') : pending ? t('verify.pending') : t('verify.title')}
        </Display>
        <Txt center color={c.ink2} style={{ marginTop: 8 }}>
          {status === 'verified' ? t('verify.doneBody') : t('verify.subtitle')}
        </Txt>
      </FadeIn>

      {status !== 'verified' ? (
        <>
          <FadeIn delay={80} style={{ marginTop: 22 }}>
            <Txt size={15} color={c.ink2}>
              {t('verify.why')}
            </Txt>
          </FadeIn>
          <View style={{ marginTop: 18, gap: 10 }}>
            {[t('verify.step1'), t('verify.step2'), t('verify.step3')].map((s, i) => (
              <FadeIn key={s} delay={140 + i * 70}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: c.surf }}>
                  <View style={{ width: 30, height: 30, borderRadius: 99, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt size={14} weight="bold" color={c.accent}>
                      {i + 1}
                    </Txt>
                  </View>
                  <Txt style={{ flex: 1 }}>{s}</Txt>
                </View>
              </FadeIn>
            ))}
          </View>
          <View style={{ marginTop: 16 }}>
            <Note>{t('verify.privacy')}</Note>
          </View>
          {social.demo ? (
            <View style={{ marginTop: 10 }}>
              <Note tone="accent">{t('verify.demo')}</Note>
            </View>
          ) : null}
          {status === 'rejected' ? (
            <Txt size={13} color={c.plum} style={{ marginTop: 12 }}>
              {t('verify.rejected')}
            </Txt>
          ) : null}
          {error || !canRun ? (
            <Txt size={13} color={c.plum} style={{ marginTop: 12 }}>
              {error ?? t('verify.unavailable')}
            </Txt>
          ) : null}
          <PrimaryButton
            label={pending ? t('verify.pending') : t('verify.start')}
            onPress={start}
            disabled={pending || !canRun}
            style={{ marginTop: 20 }}
          />
        </>
      ) : (
        <PrimaryButton label={t('verify.continue')} onPress={next} style={{ marginTop: 28 }} />
      )}
    </Screen>
  );
}

/**
 * Wrap an action that needs a verified identity. Renders `children` once
 * verified; otherwise a short explanation and a button to the check.
 */
export function IdentityGate({
  reason,
  returnTo,
  children,
}: {
  reason: 'rent' | 'list';
  returnTo: 'checkout' | 'list' | 'booking';
  children: React.ReactNode;
}) {
  const { set } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const social = useSocial();
  if (social.identity === 'verified') return <>{children}</>;
  return (
    // Lives in a footer bar: one short line and the button, never a card
    // that would push the footer over the form.
    <FadeIn>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ShieldCheckIcon size={15} color={c.accent} />
          <Txt size={13} color={c.ink2} numberOfLines={2} style={{ flex: 1 }}>
            {reason === 'rent' ? t('verify.gateRent') : t('verify.gateList')}
          </Txt>
        </View>
        <PrimaryButton
          label={social.identity === 'pending' ? t('verify.pending') : t('verify.gateCta')}
          onPress={() => set({ screen: 'verify', afterVerify: returnTo })}
        />
      </View>
    </FadeIn>
  );
}
