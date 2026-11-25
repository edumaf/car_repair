// "All checks": every check of the inspection in one list, grouped by section, with its answer, a search box and
// an "only unanswered" filter. Tap a check to jump to it. Opens as an iOS sheet (swipe down or Done to close).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState, type ComponentProps } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';

import type { ChecklistSection, ConfirmedAnswers } from '@/core/checklist/buildChecklist';
import { checksList } from '@/core/checklist/checksList';
import { tr } from '@/core/i18n/i18n';
import type { Answer } from '@/core/types';
import { ANSWER_LABEL } from '@/design/components/AnswerBar';
import { AppText } from '@/design/components/AppText';
import { hairline, minTouch, radius, space, useTheme, type SignalColor } from '@/design/tokens';
import { type } from '@/design/typography';

const STATUS: Record<Answer, { icon: ComponentProps<typeof Ionicons>['name']; color: SignalColor }> = {
  ok: { icon: 'checkmark-circle', color: 'go' },
  problem: { icon: 'alert-circle', color: 'warn' },
  not_sure: { icon: 'help-circle', color: 'caution' },
  skip: { icon: 'play-skip-forward-circle', color: 'slate' },
};

export function AllChecksSheet({
  visible,
  sections,
  answers,
  currentItemId,
  onPick,
  onClose,
}: {
  visible: boolean;
  sections: readonly ChecklistSection[];
  answers: ConfirmedAnswers;
  currentItemId: string;
  onPick: (itemId: string) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const list = useRef<SectionList>(null);
  const data = checksList(sections, answers, { query, onlyOpen }, tr).map((s) => ({ ...s, data: s.entries }));
  const open = sections.reduce((n, s) => n + s.entries.filter((e) => !answers[e.item.id]).length, 0);

  // Start at the check you're on, so the list opens where you are.
  const showCurrent = () => {
    const sectionIndex = data.findIndex((s) => s.entries.some((e) => e.item.id === currentItemId));
    if (sectionIndex < 0) return;
    const itemIndex = data[sectionIndex].entries.findIndex((e) => e.item.id === currentItemId);
    list.current?.scrollToLocation({ sectionIndex, itemIndex, viewPosition: 0.3, animated: false });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} onShow={showCurrent}>
      <View style={[styles.sheet, { backgroundColor: t.bg }]}>
        <View style={styles.header}>
          <AppText variant="title" accessibilityRole="header" style={{ flex: 1 }}>
            All checks
          </AppText>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={styles.done}>
            <AppText variant="bodyStrong" tone="brand">
              Done
            </AppText>
          </Pressable>
        </View>

        <View style={[styles.search, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Ionicons name="search" size={18} color={t.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={tr('Search, e.g. “tire” or “rust”')}
            placeholderTextColor={t.faint}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            submitBehavior="blurAndSubmit"
            clearButtonMode="while-editing"
            accessibilityLabel={tr('Search the checks')}
            style={[type.body, styles.searchInput, { color: t.ink }]}
          />
        </View>

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: onlyOpen }}
          onPress={() => setOnlyOpen(!onlyOpen)}
          style={[styles.filter, { backgroundColor: onlyOpen ? t.ink : t.surface, borderColor: onlyOpen ? t.ink : t.border }]}>
          <Ionicons name={onlyOpen ? 'checkmark' : 'ellipse-outline'} size={16} color={onlyOpen ? t.bg : t.muted} />
          <AppText variant="label" style={{ color: onlyOpen ? t.bg : t.ink }}>
            {tr('Only unanswered ({n})', { n: open })}
          </AppText>
        </Pressable>

        <SectionList
          ref={list}
          sections={data}
          keyExtractor={(e) => e.item.id}
          initialNumToRender={80}
          stickySectionHeadersEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={() => {}}
          ListEmptyComponent={
            <AppText tone="muted" align="center" style={{ padding: space.xl }}>
              {onlyOpen && !query ? tr('Every check has an answer.') : tr('No checks match “{q}”.', { q: query })}
            </AppText>
          }
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHead, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
              <AppText variant="overline" tone="muted" style={{ flex: 1 }}>
                {section.title}
              </AppText>
              <AppText variant="caption" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
                {section.done}/{section.total}
              </AppText>
            </View>
          )}
          renderItem={({ item: entry }) => {
            const a = answers[entry.item.id];
            const status = a ? STATUS[a] : null;
            const here = entry.item.id === currentItemId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${tr(entry.item.title)}, ${a ? tr(ANSWER_LABEL[a]) : tr('Not answered yet')}`}
                onPress={() => onPick(entry.item.id)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: t.border },
                  here && { backgroundColor: t.tint.brand },
                  pressed && { opacity: 0.6 },
                ]}>
                {status ? (
                  <Ionicons name={status.icon} size={24} color={t[status.color]} />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color={t.faint} />
                )}
                <View style={{ flex: 1 }}>
                  <AppText variant={here ? 'bodyStrong' : 'body'}>{entry.item.title}</AppText>
                  {here ? (
                    <AppText variant="caption" tone="brand">
                      You’re here
                    </AppText>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.faint} />
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.sm },
  done: { minHeight: minTouch, justifyContent: 'center', paddingHorizontal: space.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.xl,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: minTouch + 4,
  },
  searchInput: { flex: 1, paddingVertical: space.sm },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    marginHorizontal: space.xl,
    marginTop: space.md,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    minHeight: minTouch,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  listContent: { paddingBottom: space.xxxl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.sm,
    borderBottomWidth: hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    minHeight: 56,
    borderBottomWidth: hairline,
  },
});
