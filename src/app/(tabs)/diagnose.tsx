// Diagnose (CLAUDE.md §20.2): look up an error code, or describe what the car is doing.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { SYMPTOMS } from '@/core/data/knowledge';
import { CODE_PATTERN, normalizeCode, searchCodes } from '@/core/diagnose/codes';
import { AppText } from '@/design/components/AppText';
import { Card } from '@/design/components/Card';
import { Divider, Row } from '@/design/components/Row';
import { Screen } from '@/design/components/Screen';
import { radius, space, useTheme } from '@/design/tokens';
import { type } from '@/design/typography';

const CATEGORY_ICON: Record<
  string,
  | 'warning-outline'
  | 'pulse-outline'
  | 'volume-high-outline'
  | 'cloud-outline'
  | 'water-outline'
  | 'key-outline'
  | 'speedometer-outline'
  | 'settings-outline'
  | 'flash-outline'
> = {
  'Warning lights': 'warning-outline',
  'Shaking & vibration': 'pulse-outline',
  Noises: 'volume-high-outline',
  'Smoke & smells': 'cloud-outline',
  Leaks: 'water-outline',
  Starting: 'key-outline',
  Driving: 'speedometer-outline',
  Gearbox: 'settings-outline',
  'Climate & electrical': 'flash-outline',
};

export default function DiagnoseScreen() {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCodes(query), [query]);
  const exact = normalizeCode(query);
  const categories = useMemo(() => [...new Set(SYMPTOMS.map((s) => s.category))], []);

  const openCode = (code: string) => router.push({ pathname: '/diagnose/code/[code]', params: { code } });

  return (
    <Screen overline="Diagnose" title="What’s wrong with the car?">
      <Card>
        <AppText variant="overline" tone="muted">
          I have an error code
        </AppText>
        <View style={[styles.search, { backgroundColor: t.sunken, borderColor: t.border }]}>
          <Ionicons name="search" size={18} color={t.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. P0301 or “misfire”"
            placeholderTextColor={t.faint}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => CODE_PATTERN.test(exact) && openCode(exact)}
            accessibilityLabel="Search error codes"
            style={[type.mono, { flex: 1, color: t.ink, paddingVertical: space.sm }]}
          />
        </View>
        {CODE_PATTERN.test(exact) && !results.some((r) => r.code === exact) ? (
          <Row icon="search-outline" title={`Look up ${exact}`} onPress={() => openCode(exact)} />
        ) : null}
        {results.map((c, i) => (
          <Fragment key={c.code}>
            {i > 0 ? <Divider /> : null}
            <Row title={`${c.code} · ${c.title}`} subtitle={c.system} onPress={() => openCode(c.code)} />
          </Fragment>
        ))}
        <AppText variant="caption" tone="muted">
          Check-engine light on? You need the code first: plug a cheap OBD2 reader (about $20 / 100 lei) into the socket under the
          dashboard, or ask a parts store or mechanic to read it.
        </AppText>
      </Card>

      <AppText variant="heading">Or describe what’s happening</AppText>
      {categories.map((cat) => (
        <Card key={cat}>
          <View style={styles.catHead}>
            <Ionicons name={CATEGORY_ICON[cat] ?? 'help-circle-outline'} size={18} color={t.brand} />
            <AppText variant="overline" tone="muted">
              {cat}
            </AppText>
          </View>
          {SYMPTOMS.filter((s) => s.category === cat).map((s, i) => (
            <Fragment key={s.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={s.title}
                onPress={() => router.push({ pathname: '/diagnose/symptom/[id]', params: { id: s.id } })}
                style={({ pressed }) => [styles.symptom, pressed && { opacity: 0.7 }]}>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>
                  {s.title}
                </AppText>
                {s.urgency_hint === 'stop_now' ? <Ionicons name="warning" size={18} color={t.stop} accessibilityLabel="Urgent" /> : null}
                <Ionicons name="chevron-forward" size={18} color={t.faint} />
              </Pressable>
            </Fragment>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
  },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  symptom: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
});
