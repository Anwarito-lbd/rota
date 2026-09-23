import { View } from 'react-native';
import { useT } from '../i18n';
import { useTheme } from '../theme/useTheme';
import { TabMessagesIcon } from '../ui/icons';
import { Display, Screen, Txt } from '../ui/kit';

export function Messages() {
  const { c } = useTheme();
  const { t } = useT();

  return (
    <Screen>
      <Display size={34}>{t('messages.title')}</Display>

      <View style={{ marginTop: 70, alignItems: 'center', paddingHorizontal: 20 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: c.surf,
            borderWidth: 1,
            borderColor: c.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TabMessagesIcon color={c.ink3} />
        </View>
        <Display size={26} style={{ marginTop: 18, textAlign: 'center' }}>
          {t('messages.empty')}
        </Display>
        <Txt size={14} center color={c.ink2} style={{ marginTop: 8 }}>
          {t('messages.emptyBody')}
        </Txt>
      </View>
    </Screen>
  );
}
