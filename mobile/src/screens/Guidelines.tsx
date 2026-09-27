/**
 * Community guidelines — the rules for listings, posts, comments and
 * messages, how moderation works (reviewed by a person, usually within 24 h)
 * and where to go for help. Required reading for App Store Guideline 1.2.
 */
import * as WebBrowser from 'expo-web-browser';
import { Linking, View } from 'react-native';
import { LEGAL_DOCS } from '../data/legalContent';
import { useT, type TranslationKey } from '../i18n';
import { BRAND, LEGAL_URLS } from '../lib/config';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { ShieldCheckIcon } from '../ui/icons';
import { Card, GhostButton, Header, Screen, SectionLabel, Txt } from '../ui/kit';
import { FadeIn } from '../ui/motion';

const PHAROS = 'https://www.internet-signalement.gouv.fr';

const SECTIONS: { title: TranslationKey; items: TranslationKey[] }[] = [
  {
    title: 'guide.moderationTitle',
    items: ['guide.moderation1', 'guide.moderation2', 'guide.moderation3', 'guide.moderation4'],
  },
  { title: 'guide.postsTitle', items: ['guide.posts1', 'guide.posts2', 'guide.posts3'] },
  { title: 'guide.messagesTitle', items: ['guide.messages1', 'guide.messages2', 'guide.messages3'] },
  { title: 'guide.tryonTitle', items: ['guide.tryon'] },
  { title: 'guide.toolsTitle', items: ['guide.tools'] },
];

function Bullets({ items }: { items: string[] }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {items.map((text) => (
        <View key={text} style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: c.accent, marginTop: 8 }} />
          <Txt size={15} color={c.ink2} style={{ flex: 1 }}>
            {text}
          </Txt>
        </View>
      ))}
    </View>
  );
}

export function Guidelines() {
  const { go } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const base = LEGAL_DOCS.community;

  return (
    <Screen bottomInset={40}>
      <Header title={t('guide.title')} onBack={() => go('closet')} />
      <FadeIn>
        <View style={{ marginTop: 14, flexDirection: 'row', gap: 12, padding: 16, borderRadius: 20, backgroundColor: c.accentSoft }}>
          <ShieldCheckIcon size={24} color={c.accent} />
          <Txt size={15} style={{ flex: 1 }}>
            {t('guide.intro')}
          </Txt>
        </View>
      </FadeIn>

      {SECTIONS.map((section, i) => (
        <FadeIn key={section.title} delay={60 + i * 40}>
          <SectionLabel>{t(section.title)}</SectionLabel>
          <Card>
            <Bullets items={section.items.map((k) => t(k))} />
          </Card>
        </FadeIn>
      ))}

      {/* The rental rules drafted with the legal outlines (French). */}
      {lang === 'fr'
        ? base.sections.map((section) => (
            <View key={section.heading}>
              <SectionLabel>{section.heading}</SectionLabel>
              <Card>
                <Bullets items={section.body} />
              </Card>
            </View>
          ))
        : null}

      <Txt size={14} color={c.ink2} style={{ marginTop: 24 }}>
        {t('guide.contact')}
      </Txt>
      <GhostButton
        label={BRAND.supportEmail}
        onPress={() => Linking.openURL(`mailto:${BRAND.supportEmail}`).catch(() => undefined)}
        style={{ marginTop: 12 }}
      />
      <Txt size={13} color={c.ink3} style={{ marginTop: 16 }}>
        {t('guide.illegal')}
      </Txt>
      <GhostButton label="Pharos" onPress={() => WebBrowser.openBrowserAsync(PHAROS)} style={{ marginTop: 10 }} />
      <GhostButton label={LEGAL_URLS.guidelines.replace('https://', '')} onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.guidelines)} style={{ marginTop: 10 }} />
    </Screen>
  );
}
