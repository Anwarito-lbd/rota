/**
 * "Supprimer votre compte ?" (Figma 09). In-app deletion, as Apple 5.1.1(v)
 * requires: the `account` Edge Function erases the profile, listings, posts,
 * messages and photos at once, and refuses while a rental or payout is
 * still running. Receipts stay, pseudonymised, as accounting law requires.
 */
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { closeAccount } from '../data/account';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { GhostButton, PrimaryButton, Sheet, Txt } from './kit';

const TrashIcon = ({ color }: { color: string }) => (
  <Svg width={26} height={26} viewBox="0 0 24 24">
    <Path d="M4 7h16M9 7V4.8h6V7M6.5 7l1 12.5h9l1-12.5" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
    <Path d="M10 10.5v6M14 10.5v6" stroke={color} strokeWidth={1.8} />
  </Svg>
);

const Glyph = ({ d, color }: { d: string; color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path d={d} stroke={color} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

function Line({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ marginTop: 1 }}>{icon}</View>
      <Txt size={15} color={c.ink2} style={{ flex: 1 }}>
        {children}
      </Txt>
    </View>
  );
}

export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { t, lang } = useT();
  const { signOut } = useAuth();
  const { set } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmWord = lang === 'en' ? 'DELETE' : lang === 'es' ? 'ELIMINAR' : 'SUPPRIMER';

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!supabase) {
        // Demo mode: nothing is stored anywhere, so leaving is enough.
        onClose();
        set({ screen: 'onboard', obStep: 0, signedIn: false });
        return;
      }
      await closeAccount(confirmWord);
      await signOut().catch(() => undefined);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(
        code === 'active_rentals' || code === 'open_claims'
          ? t('set.deleteBlockedRentals')
          : code === 'payouts_pending'
            ? t('set.deleteBlockedPayouts')
            : friendlyError(e, t),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 64, height: 64, borderRadius: 99, backgroundColor: c.plumSoft, alignItems: 'center', justifyContent: 'center' }}>
          <TrashIcon color={c.plum} />
        </View>
        <Txt size={22} weight="bold" center style={{ marginTop: 14 }}>
          {t('del.title')}
        </Txt>
      </View>
      <View style={{ marginTop: 18, gap: 14 }}>
        <Line icon={<Glyph color={c.ink3} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />}>{t('del.l1')}</Line>
        <Line icon={<Glyph color={c.ink3} d="M5 6h14v14H5zM5 10h14M9 3.5V7M15 3.5V7" />}>{t('del.l2')}</Line>
        <Line icon={<Glyph color={c.ink3} d="M7 3.5h7l4 4V20.5H7zM14 3.5V8h4M9.5 12.5h6M9.5 16h6" />}>{t('del.l3')}</Line>
        <Line icon={<Glyph color={c.ink3} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" />}>{t('del.l4')}</Line>
      </View>
      {error ? (
        <Txt size={13} color={c.plum} style={{ marginTop: 14 }}>
          {error}
        </Txt>
      ) : null}
      <PrimaryButton
        label={busy ? t('common.loading') : t('del.cta')}
        tone="plum"
        disabled={busy}
        onPress={remove}
        style={{ marginTop: 22 }}
      />
      <GhostButton label={t('common.cancel')} onPress={onClose} style={{ marginTop: 8, borderWidth: 0 }} />
    </Sheet>
  );
}

