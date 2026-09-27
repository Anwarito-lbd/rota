/** Opens (or creates) the conversation with a member, then shows it. */
import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { startConversation } from '../data/messages';
import { useSocial } from '../data/social';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { TabMessagesIcon } from './icons';
import { Txt } from './kit';
import { PressScale } from './motion';

export function MessageButton({
  memberId,
  listingId,
  label,
  style,
}: {
  memberId: string;
  listingId?: string | null;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { set } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const social = useSocial();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!social.meId || memberId === social.meId || social.isBlocked(memberId)) return null;

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = await startConversation(memberId, listingId);
      set({ screen: 'messages', thread: id, profileId: null });
    } catch (e) {
      setError(e instanceof Error && e.message === 'blocked' ? t('msg.blocked') : t('msg.startFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PressScale
        haptic="light"
        onPress={open}
        disabled={busy}
        accessibilityLabel={label ?? t('msg.write')}
        style={[
          {
            minHeight: 46,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c.line2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingHorizontal: 16,
            opacity: busy ? 0.6 : 1,
          },
          style,
        ]}
      >
        <TabMessagesIcon color={c.ink} />
        <Txt weight="bold">{label ?? t('msg.write')}</Txt>
      </PressScale>
      {error ? (
        <Txt size={12} color={c.plum} style={{ marginTop: 6 }}>
          {error}
        </Txt>
      ) : null}
    </>
  );
}
