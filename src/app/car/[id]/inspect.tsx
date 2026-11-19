// Guided inspection (CLAUDE.md §6.4): one checklist item at a time, section chips with progress, answers, notes,
// photos and AI photo suggestions the user confirms or dismisses. Saves continuously; works offline except AI checks.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Fragment, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { progress, type ChecklistEntry } from '@/core/checklist/buildChecklist';
import { getChecklistItem } from '@/core/data/seed';
import { LIGHT_LABEL, mapDashboardLights } from '@/core/photoCheck/dashboard';
import { INFO_FINDINGS, findingLabel } from '@/core/photoCheck/findings';
import type { Answer } from '@/core/types';
import { checkVin } from '@/core/vin/vin';
import { confirmedAnswers, type AnswerRecord, type PhotoCheckRecord } from '@/db/answersRepository';
import { AnswerBar } from '@/design/components/AnswerBar';
import { AppText } from '@/design/components/AppText';
import { SECTION_ZONE, WalkaroundMap } from '@/design/components/WalkaroundMap';
import { Button } from '@/design/components/Button';
import { MiniSignal } from '@/design/components/MiniSignal';
import { PhotoFindingChip } from '@/design/components/PhotoFindingChip';
import { ErrorState, LoadingState } from '@/design/components/States';
import { SeverityTag, Tag } from '@/design/components/Tag';
import { hairline, minTouch, radius, space, useTheme } from '@/design/tokens';
import { type } from '@/design/typography';
import { ApiError } from '@/core/api/types';
import { canRunPhotoCheck } from '@/core/limits';
import { useInspection } from '@/hooks/useInspection';
import { useKeyboardShown } from '@/hooks/useKeyboardShown';
import { usePremium } from '@/hooks/usePremium';
import { capturePhoto, PhotoPermissionError, type PhotoSource } from '@/media/photos';
import { tr } from '@/core/i18n/i18n';
import { formatNumber } from '@/core/region';

type Inspection = ReturnType<typeof useInspection>;

function SectionChips({
  inspection,
  answers,
  currentSection,
  onJump,
}: {
  inspection: Inspection;
  answers: Record<string, Answer>;
  currentSection: string;
  onJump: (sectionId: string) => void;
}) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {inspection.sections.map((s) => {
        const p = progress(s.entries, answers);
        const on = s.section.id === currentSection;
        const done = p.touched === p.total;
        return (
          <Pressable
            key={s.section.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tr('{section}, {done} of {total} done', { section: tr(s.section.title), done: p.touched, total: p.total })}
            onPress={() => onJump(s.section.id)}
            style={[styles.chip, { backgroundColor: on ? t.ink : t.surface, borderColor: on ? t.ink : t.border }]}>
            {done ? <Ionicons name="checkmark-circle" size={14} color={on ? t.bg : t.go} /> : null}
            <AppText variant="label" style={{ color: on ? t.bg : t.ink }}>
              {s.section.title}
            </AppText>
            <AppText variant="caption" style={{ color: on ? t.bg : t.muted, fontVariant: ['tabular-nums'] }}>
              {p.touched}/{p.total}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function OverallBar({ checked, total }: { checked: number; total: number }) {
  const t = useTheme();
  return (
    <View style={styles.overall} accessible accessibilityLabel={tr('{checked} of {total} items checked', { checked, total })}>
      <View style={[styles.track, { backgroundColor: t.sunken }]}>
        <View style={[styles.fill, { width: `${total ? (checked / total) * 100 : 0}%`, backgroundColor: t.brand }]} />
      </View>
      <AppText variant="caption" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
        {checked}/{total} checked
      </AppText>
    </View>
  );
}

function PhotoResults({
  checks,
  inspection,
  applicable,
  carVin,
}: {
  checks: PhotoCheckRecord[];
  inspection: Inspection;
  applicable: Set<string>;
  carVin: string | null;
}) {
  return (
    <>
      {checks.map((pc) => {
        const r = pc.result;
        const lights = mapDashboardLights(r.lights, applicable);
        const trx = r.transcriptions ?? {};
        const readVin = trx.vin_text ? checkVin(trx.vin_text.replace(/\?/g, '')).vin : null;
        return (
          <View key={pc.id} style={styles.results}>
            {pc.sample ? <Tag label="Sample AI result" color="slate" icon="flask-outline" /> : null}
            {!r.quality.ok ? (
              <AppText variant="label" tone="caution">
                Photo unclear. {r.quality.retake_tip ?? 'Try again with more light, closer.'}
              </AppText>
            ) : null}
            {r.findings
              .filter((f) => !INFO_FINDINGS.has(f.code))
              .map((f) => (
                <PhotoFindingChip
                  key={f.code}
                  title={findingLabel(f.code)}
                  detail={`${f.description} (${f.confidence} confidence)`}
                  decision={pc.decisions[f.code]}
                  onConfirm={() =>
                    inspection.decide.mutate({ photoCheckId: pc.id, key: f.code, decision: 'confirmed', targetItemId: pc.itemId })
                  }
                  onDismiss={() =>
                    inspection.decide.mutate({ photoCheckId: pc.id, key: f.code, decision: 'dismissed', targetItemId: pc.itemId })
                  }
                />
              ))}
            {lights.stopDriving ? (
              <AppText variant="bodyStrong" tone="stop">
                A red warning light is on. Stop driving, and don’t buy without a mechanic’s check.
              </AppText>
            ) : null}
            {lights.suggestions.map((s) => (
              <PhotoFindingChip
                key={`${s.light}-${s.itemId}`}
                title={tr('{light} light is on', { light: tr(LIGHT_LABEL[s.light]) })}
                detail={`Marks “${getChecklistItem(s.itemId)?.title ?? s.itemId}” as a problem if you confirm.`}
                decision={pc.decisions[`light:${s.light}:${s.itemId}`]}
                onConfirm={() =>
                  inspection.decide.mutate({
                    photoCheckId: pc.id,
                    key: `light:${s.light}:${s.itemId}`,
                    decision: 'confirmed',
                    targetItemId: s.itemId,
                  })
                }
                onDismiss={() =>
                  inspection.decide.mutate({
                    photoCheckId: pc.id,
                    key: `light:${s.light}:${s.itemId}`,
                    decision: 'dismissed',
                    targetItemId: s.itemId,
                  })
                }
              />
            ))}
            {lights.recheck.length ? (
              <AppText variant="label" tone="muted">
                {lights.recheck.map((l) => LIGHT_LABEL[l]).join(' and ')} light on: this can be normal right after starting. Look again
                after 10 seconds.
              </AppText>
            ) : null}
            {trx.odometer_value != null ? (
              <AppText variant="label">
                AI read the odometer: {formatNumber(trx.odometer_value)} {trx.odometer_unit ?? ''}
              </AppText>
            ) : null}
            {trx.dot_code ? <AppText variant="label">AI read the tire date code: {trx.dot_code}</AppText> : null}
            {readVin ? (
              <AppText variant="label" tone={carVin && readVin !== carVin ? 'stop' : 'ink'}>
                AI read the VIN: {readVin}
                {carVin ? (readVin === carVin ? ' (matches)' : tr(' — doesn’t match {vin}. Check it yourself.', { vin: carVin })) : ''}
              </AppText>
            ) : null}
            {trx.title_brand_words?.length ? (
              <AppText variant="bodyStrong" tone="stop">
                Title words spotted: {trx.title_brand_words.join(', ')}
              </AppText>
            ) : null}
            {r.findings.length === 0 && r.lights.length === 0 && r.quality.ok && !readVin && trx.odometer_value == null ? (
              <AppText variant="label" tone="muted">
                AI didn’t spot anything in this photo. That doesn’t mean there’s nothing there: check it yourself too.
              </AppText>
            ) : null}
          </View>
        );
      })}
    </>
  );
}

function ItemCard({
  entry,
  record,
  checks,
  inspection,
  sectionTitle,
  position,
}: {
  entry: ChecklistEntry;
  record: AnswerRecord | undefined;
  checks: PhotoCheckRecord[];
  inspection: Inspection;
  sectionTitle: string;
  position: string;
}) {
  const t = useTheme();
  const { item } = entry;
  const [noteOpen, setNoteOpen] = useState(!!record?.note);
  const [noteText, setNoteText] = useState(record?.note ?? '');
  // Save the note when leaving the item too: tapping Next/Back with the keyboard still open doesn't always blur
  // the field first, and the card is replaced right away.
  const unsavedNote = useRef<string | null>(null);
  const saveNote = inspection.note.mutate;
  useEffect(
    () => () => {
      if (unsavedNote.current !== null) saveNote({ itemId: item.id, text: unsavedNote.current });
    },
    [item.id, saveNote],
  );
  const busy = inspection.photo.isPending && inspection.photo.variables?.itemId === item.id;
  const premium = usePremium();
  const applicable = useMemo(() => new Set(inspection.entries.map((e) => e.item.id)), [inspection.entries]);
  // (The parent keys this card by item id, so note state starts fresh for every item.)

  const addPhoto = async (source: PhotoSource) => {
    try {
      const uri = await capturePhoto(source, item.id);
      if (!uri) return;
      // Free tier: 10 AI photo checks per free inspection; the photo is always saved.
      const allowAi = canRunPhotoCheck(premium, inspection.photoChecks.data?.length ?? 0);
      inspection.photo.mutate(
        { itemId: item.id, uri, photoType: allowAi ? item.photo_check : null },
        {
          // The server is the source of truth for free checks once the backend is live.
          onError: (e) => {
            if (e instanceof ApiError && e.code === 'quota_exceeded')
              router.push({ pathname: '/paywall', params: { placement: 'photo_limit' } });
          },
        },
      );
      if (item.photo_check && !allowAi) router.push({ pathname: '/paywall', params: { placement: 'photo_limit' } });
    } catch (e) {
      Alert.alert(
        e instanceof PhotoPermissionError ? 'Permission needed' : 'Couldn’t add the photo',
        e instanceof PhotoPermissionError
          ? tr('{message} Turn it on in the iPhone Settings app.', { message: tr(e.message) })
          : tr((e as Error).message),
      );
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <AppText variant="overline" tone="muted">
            {sectionTitle} · {position}
          </AppText>
          <View style={styles.tags}>
            <SeverityTag severity={item.severity} />
          </View>
          <AppText variant="title" accessibilityRole="header">
            {item.title}
          </AppText>
        </View>
        <WalkaroundMap zone={SECTION_ZONE[item.section]} />
      </View>
      {entry.knownProblemArea ? <Tag label="Known problem area for this model" color="brand" icon="flag" /> : null}

      <AppText variant="overline" tone="muted">
        How to check
      </AppText>
      {item.how_to_check.map((step, i) => (
        <View key={i} style={styles.step}>
          <AppText variant="bodyStrong" tone="brand" style={styles.stepNum}>
            {i + 1}
          </AppText>
          <AppText style={{ flex: 1 }}>{step}</AppText>
        </View>
      ))}

      <AppText variant="overline" tone="muted">
        Bad signs
      </AppText>
      {item.bad_signs.map((b, i) => (
        <View key={i} style={styles.step}>
          <Ionicons name="alert-circle-outline" size={18} color={t.warn} style={{ marginTop: 2 }} />
          <AppText style={{ flex: 1 }}>{b}</AppText>
        </View>
      ))}

      {(() => {
        const notes = item.complaint_group
          ? inspection.modelProblems.filter((p) => p.complaint_group === item.complaint_group).slice(0, 2)
          : [];
        return notes.length ? (
          <View style={[styles.modelNotes, { backgroundColor: t.tint.brand }]}>
            <AppText variant="overline" tone="brand">
              Known for this model
            </AppText>
            {notes.map((p) => (
              <View key={p.id} style={{ gap: 2 }}>
                <AppText variant="bodyStrong">{p.title}</AppText>
                {p.what_to_check.slice(0, 2).map((c, i) => (
                  <AppText key={i} variant="label">
                    ✓ {c}
                  </AppText>
                ))}
              </View>
            ))}
          </View>
        ) : null;
      })()}

      {item.section === 'test_drive' ? (
        <AppText variant="label" tone="muted">
          Only drive where it’s safe and legal, with the seller’s OK. If a red warning light comes on, stop and don’t buy without a
          mechanic’s check.
        </AppText>
      ) : null}

      <View style={styles.photoRow}>
        {(record?.photoUris ?? []).map((uri) => (
          <Pressable
            key={uri}
            accessibilityRole="imagebutton"
            accessibilityLabel={tr('Photo. Long-press to remove.')}
            onLongPress={() =>
              Alert.alert('Remove this photo?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => inspection.removePhoto.mutate({ itemId: item.id, uri }) },
              ])
            }>
            <Image source={{ uri }} style={[styles.thumb, { borderColor: t.border }]} contentFit="cover" />
          </Pressable>
        ))}
        {busy ? (
          <View style={[styles.thumb, styles.thumbBusy, { borderColor: t.border, backgroundColor: t.sunken }]}>
            <ActivityIndicator color={t.brand} />
          </View>
        ) : null}
      </View>
      <View style={styles.photoButtons}>
        <Pressable accessibilityRole="button" onPress={() => addPhoto('camera')} style={[styles.photoBtn, { borderColor: t.borderStrong }]}>
          <Ionicons name="camera-outline" size={18} color={t.brand} />
          <AppText variant="label" tone="brand">
            {item.photo_check ? 'Take photo · AI check' : 'Take photo'}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('Choose a photo from your library')}
          onPress={() => addPhoto('library')}
          style={[styles.photoBtn, { borderColor: t.borderStrong }]}>
          <Ionicons name="images-outline" size={18} color={t.brand} />
        </Pressable>
      </View>
      {busy ? (
        <AppText variant="caption" tone="muted">
          {item.photo_check ? 'Checking the photo…' : 'Saving…'}
        </AppText>
      ) : null}
      {inspection.photo.isError && inspection.photo.variables?.itemId === item.id ? (
        <AppText variant="caption" tone="stop">
          {inspection.photo.error instanceof ApiError && inspection.photo.error.code === 'quota_exceeded'
            ? 'Photo saved. You’ve used your free AI photo checks.'
            : tr('Photo saved, but the AI check failed: {error}', { error: (inspection.photo.error as Error).message })}
        </AppText>
      ) : null}
      <PhotoResults checks={checks} inspection={inspection} applicable={applicable} carVin={inspection.car.data?.vin ?? null} />

      {noteOpen ? (
        <TextInput
          value={noteText}
          onChangeText={(v) => {
            setNoteText(v);
            unsavedNote.current = v;
          }}
          onBlur={() => {
            inspection.note.mutate({ itemId: item.id, text: noteText });
            unsavedNote.current = null;
          }}
          placeholder={tr('What did you notice?')}
          placeholderTextColor={t.faint}
          multiline
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          accessibilityLabel={tr('Note')}
          style={[type.body, styles.note, { color: t.ink, borderColor: t.border, backgroundColor: t.surface }]}
        />
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setNoteOpen(true)} style={styles.addNote}>
          <Ionicons name="create-outline" size={18} color={t.brand} />
          <AppText variant="label" tone="brand">
            Add a note
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

export default function Inspect() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const inspection = useInspection(id);
  const { entries, sections } = inspection;
  const records = inspection.answers.data ?? {};
  const answers = confirmedAnswers(records);
  const [chosen, setChosen] = useState<number | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // While typing a note: hide the answer bar (it would cover the note) and bring the note up above the keyboard.
  const typing = useKeyboardShown(() => scroll.current?.scrollToEnd({ animated: true }));

  // Until the user moves, show the first unanswered item.
  const firstOpen = entries.findIndex((e) => !answers[e.item.id]);
  const index = chosen ?? (inspection.answers.isSuccess && entries.length ? (firstOpen === -1 ? 0 : firstOpen) : null);

  if (inspection.car.isPending || inspection.answers.isPending) return <LoadingState label="Building your checklist…" />;
  if (!inspection.car.data) return <ErrorState title="Car not found" message="It may have been removed." />;
  if (index === null || entries.length === 0) return <LoadingState label="Building your checklist…" />;

  const entry = entries[index];
  const section = sections.find((s) => s.entries.some((e) => e.item.id === entry.item.id))!;
  const inSection = section.entries.findIndex((e) => e.item.id === entry.item.id);
  const p = progress(entries, answers);
  const isLast = index === entries.length - 1;
  const current = answers[entry.item.id] ?? null;
  const answeredHere = current === 'ok' || current === 'problem' || current === 'not_sure';

  const goTo = (i: number) => {
    setChosen(Math.max(0, Math.min(entries.length - 1, i)));
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const toVerdict = () => router.push({ pathname: '/car/[id]/verdict', params: { id } });

  const onAnswer = (a: Answer) => {
    const same = answers[entry.item.id] === a;
    setChosen(index); // stay on this item even though it's no longer the first unanswered one
    inspection.answer.mutate({ itemId: entry.item.id, value: same ? null : a });
    // Tapping the selected answer again clears it. Only "Skip" moves on by itself; after any other answer we stay,
    // so the user can still add a note or a photo (owner, phone test 2026-11-19), and Next item is the way on.
    if (!same && !isLast && a === 'skip') setTimeout(() => goTo(index + 1), 220);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          headerRight: () => (
            // A small traffic light makes the way to the verdict easy to spot (owner, phone test 2026-11-19).
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('See the verdict')}
              onPress={toVerdict}
              hitSlop={10}
              style={styles.verdictBtn}>
              <MiniSignal />
              <AppText variant="bodyStrong" tone="brand">
                Verdict
              </AppText>
            </Pressable>
          ),
        }}
      />
      <View style={[styles.top, { borderBottomColor: t.border }]}>
        <SectionChips
          inspection={inspection}
          answers={answers}
          currentSection={section.section.id}
          onJump={(sid) => goTo(entries.findIndex((e) => e.item.section === sid))}
        />
        <OverallBar checked={p.checked} total={p.total} />
      </View>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Fragment key={entry.item.id}>
          <ItemCard
            entry={entry}
            record={records[entry.item.id]}
            checks={(inspection.photoChecks.data ?? []).filter((c) => c.itemId === entry.item.id)}
            inspection={inspection}
            sectionTitle={section.section.title}
            position={tr('{n} of {total}', { n: inSection + 1, total: section.entries.length })}
          />
        </Fragment>
      </ScrollView>
      {typing ? null : (
        <SafeAreaView edges={['bottom']} style={[styles.bottom, { backgroundColor: t.surface, borderTopColor: t.border }]}>
          {answeredHere ? (
            <AppText variant="caption" tone="muted" align="center">
              {current === 'problem'
                ? 'Saved as a problem. Add a photo or a note above if you like, then go on.'
                : current === 'not_sure'
                  ? 'Saved as not sure. Add a note if you like, then go on.'
                  : 'Saved as OK. Add a note if you like, then go on.'}
            </AppText>
          ) : null}
          <AnswerBar value={current} onChange={onAnswer} />
          <View style={styles.nav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('Previous item')}
              disabled={index === 0}
              onPress={() => goTo(index - 1)}
              style={[styles.navBtn, { opacity: index === 0 ? 0.3 : 1 }]}>
              <Ionicons name="chevron-back" size={22} color={t.ink} />
              <AppText variant="label">Back</AppText>
            </Pressable>
            {isLast || p.checked === p.total ? (
              <View style={{ flex: 1 }}>
                <Button label="See the verdict" icon="arrow-forward" onPress={toVerdict} />
              </View>
            ) : answeredHere ? (
              // We stay on this item after an answer (for a photo or note): make the way on unmissable.
              <View style={{ flex: 1 }}>
                <Button label="Next item" icon="arrow-forward" onPress={() => goTo(index + 1)} />
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr('Next item')}
                onPress={() => goTo(index + 1)}
                style={styles.navBtn}>
                <AppText variant="label">Next</AppText>
                <Ionicons name="chevron-forward" size={22} color={t.ink} />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  verdictBtn: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: minTouch, paddingHorizontal: space.xs },
  top: { borderBottomWidth: hairline, paddingBottom: space.sm },
  chips: { paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    minHeight: minTouch,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  overall: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  track: { flex: 1, height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  content: { padding: space.xl, paddingBottom: space.xxxl },
  card: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  headText: { flex: 1, gap: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepNum: { width: 18, textAlign: 'center' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  thumb: { width: 76, height: 76, borderRadius: radius.sm, borderWidth: 1 },
  thumbBusy: { alignItems: 'center', justifyContent: 'center' },
  photoButtons: { flexDirection: 'row', gap: space.sm },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: minTouch,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  results: { gap: space.sm },
  modelNotes: { borderRadius: radius.md, padding: space.md, gap: space.sm },
  note: { minHeight: 80, borderWidth: 1, borderRadius: radius.md, padding: space.md, textAlignVertical: 'top' },
  addNote: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: minTouch },
  bottom: { borderTopWidth: hairline, paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingBottom: space.xs },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: minTouch, paddingHorizontal: space.sm },
});
