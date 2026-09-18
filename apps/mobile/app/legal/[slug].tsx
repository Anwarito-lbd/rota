import { useLocalSearchParams, Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';
import {
  LEGAL_BANNER,
  LEGAL_DOCS,
  type LegalSlug,
} from '../../lib/legalContent';

function isSlug(v: string): v is LegalSlug {
  return v in LEGAL_DOCS;
}

export default function LegalDocScreen() {
  const { slug: raw } = useLocalSearchParams<{ slug: string }>();
  const slug = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';

  if (!slug || !isSlug(slug)) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: 'Légal' }} />
        <Text style={styles.missing}>Document introuvable.</Text>
      </View>
    );
  }

  const doc = LEGAL_DOCS[slug];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: doc.title,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
        }}
      />

      <View style={styles.banner}>
        <Text style={styles.bannerText}>{LEGAL_BANNER}</Text>
      </View>

      <Text style={styles.title}>{doc.title}</Text>
      <Text style={styles.subtitle}>{doc.subtitle}</Text>
      <Text style={styles.source}>Source : {doc.source}</Text>

      {doc.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading}>{section.heading}</Text>
          {section.callout ? (
            <View
              style={[
                styles.callout,
                section.callout.tone === 'warn' && styles.calloutWarn,
                section.callout.tone === 'draft' && styles.calloutDraft,
                section.callout.tone === 'info' && styles.calloutInfo,
              ]}
            >
              <Text style={styles.calloutText}>{section.callout.text}</Text>
            </View>
          ) : null}
          {section.body.map((p) => (
            <Text key={p.slice(0, 48)} style={styles.para}>
              {p}
            </Text>
          ))}
          {section.table ? (
            <View style={styles.table}>
              <View style={[styles.tr, styles.trHead]}>
                {section.table.headers.map((h) => (
                  <Text key={h} style={[styles.td, styles.th]}>
                    {h}
                  </Text>
                ))}
              </View>
              {section.table.rows.map((row) => (
                <View key={row.join('|')} style={styles.tr}>
                  {row.map((cell, i) => (
                    <Text key={`${row[0]}-${i}`} style={styles.td}>
                      {cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}

      <Text style={styles.footer}>
        Ces textes sont des synthèses des outlines docs/legal. Ils ne remplacent
        pas une revue avocat avant App Store / encaissement réel.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 48 },
  missing: { color: colors.ink2, padding: 24 },
  banner: {
    backgroundColor: 'rgba(224,112,112,0.14)',
    borderColor: 'rgba(224,112,112,0.35)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bannerText: { color: colors.danger, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  title: { color: colors.ink, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.ink2, marginTop: 6, fontSize: 15 },
  source: { color: colors.ink3, marginTop: 8, fontSize: 12 },
  section: { marginTop: 22 },
  heading: { color: colors.clay, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  para: { color: colors.ink2, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  callout: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  calloutWarn: {
    backgroundColor: 'rgba(224,112,112,0.12)',
    borderColor: 'rgba(224,112,112,0.3)',
  },
  calloutDraft: {
    backgroundColor: 'rgba(196,164,132,0.14)',
    borderColor: 'rgba(196,164,132,0.4)',
  },
  calloutInfo: {
    backgroundColor: 'rgba(139,107,122,0.16)',
    borderColor: 'rgba(139,107,122,0.35)',
  },
  calloutText: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  trHead: { backgroundColor: colors.surf2 },
  td: { flex: 1, color: colors.ink2, fontSize: 12, lineHeight: 16, paddingHorizontal: 4 },
  th: { color: colors.ink, fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  footer: { color: colors.ink3, fontSize: 12, lineHeight: 17, marginTop: 28 },
});
