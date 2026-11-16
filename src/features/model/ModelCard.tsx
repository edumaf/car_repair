// "About this model" (CLAUDE.md §20.2): strengths, commonly reported problems for the car's engine and year, buying
// tips. Data from data/models/*.json (AI-drafted, mechanic-reviewed); never a diagnosis of this particular car.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getModel } from '@/core/data/knowledge';
import type { ModelProblem } from '@/core/data/knowledgeSchema';
import { getRepairCost } from '@/core/data/seed';
import { problemsFor } from '@/core/models/matchModels';
import { showRepairCosts } from '@/core/region';
import type { CarRecord } from '@/db/carsRepository';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { usd } from '@/design/components/CostRangeBar';
import { Divider } from '@/design/components/Row';
import { SeverityTag, Tag } from '@/design/components/Tag';
import { space, useTheme } from '@/design/tokens';
import { useUpdateCar } from '@/hooks/useCars';
import { useRegion } from '@/hooks/useRegion';
import { tr } from '@/core/i18n/i18n';

export function ProblemRow({ problem, showCost }: { problem: ModelProblem; showCost: boolean }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const cost = problem.repair_cost_id ? getRepairCost(problem.repair_cost_id) : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={tr(problem.title)}
      accessibilityHint={open ? 'Hides details' : 'Shows what to check'}
      onPress={() => setOpen((x) => !x)}
      style={{ gap: space.sm }}>
      <View style={styles.problemHead}>
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {problem.title}
        </AppText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={t.faint} />
      </View>
      <View style={styles.tags}>
        <Tag label={problem.frequency === 'common' ? 'Common' : 'Occasional'} color={problem.frequency === 'common' ? 'warn' : 'slate'} />
        <SeverityTag severity={problem.severity} />
      </View>
      {open ? (
        <View style={{ gap: space.xs }}>
          <AppText variant="overline" tone="muted">
            Signs
          </AppText>
          {problem.symptoms.map((x, i) => (
            <AppText key={i} variant="label">
              • {x}
            </AppText>
          ))}
          <AppText variant="overline" tone="muted">
            What to check
          </AppText>
          {problem.what_to_check.map((x, i) => (
            <AppText key={i} variant="label" tone="brand">
              ✓ {x}
            </AppText>
          ))}
          {showCost && cost ? (
            <AppText variant="caption" tone="muted">
              If it needs fixing: {cost.name}, typically {usd(cost.low)}–{usd(cost.high)} in the US.
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export function ModelCard({ car }: { car: CarRecord }) {
  const region = useRegion();
  const update = useUpdateCar(car.id);
  const [showOther, setShowOther] = useState(false);
  const model = car.modelId ? getModel(car.modelId) : undefined;

  if (!model) {
    return (
      <Card>
        <AppText variant="overline" tone="muted">
          Known problems for this model
        </AppText>
        <AppText variant="label">Choose the exact model to see its common problems and what to check.</AppText>
        <Button
          label="Choose the model"
          kind="secondary"
          icon="list-outline"
          onPress={() => router.push({ pathname: '/add/model', params: { carId: car.id } })}
        />
      </Card>
    );
  }

  const engine = model.engines.find((e) => e.id === car.engineId) ?? null;
  const { relevant, other } = problemsFor(model, engine?.id ?? null, car.year);
  const fuelEngines = model.engines.filter((e) => e.fuel === car.powertrain);
  const chooseFrom = fuelEngines.length ? fuelEngines : model.engines;
  const showCost = showRepairCosts(region);

  return (
    <Card>
      <AppText variant="overline" tone="muted">
        About the {model.make} {model.model} · {model.generation}
      </AppText>
      {!engine ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="label">Which engine? Problems differ a lot between engines.</AppText>
          <View style={styles.tags}>
            {chooseFrom.map((e) => (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                accessibilityLabel={tr('Engine: {name}', { name: e.name })}
                onPress={() => update.mutate({ engineId: e.id })}
                style={styles.engineChip}>
                <Tag label={e.name} color="brand" />
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('Engine {name}. Tap to change.', { name: engine.name })}
          onPress={() => update.mutate({ engineId: null })}>
          <AppText variant="label" tone="muted">
            Engine: {engine.name} · Change
          </AppText>
        </Pressable>
      )}

      <AppText variant="overline" tone="muted">
        Good to know
      </AppText>
      {model.strengths.map((x, i) => (
        <AppText key={i} variant="label">
          + {x}
        </AppText>
      ))}

      <AppText variant="overline" tone="muted">
        Commonly reported problems{engine ? ` (${engine.name})` : ''}
      </AppText>
      {relevant.map((p, i) => (
        <View key={p.id} style={{ gap: space.sm }}>
          {i > 0 ? <Divider /> : null}
          <ProblemRow problem={p} showCost={showCost} />
        </View>
      ))}
      {other.length ? (
        <Button
          label={showOther ? 'Hide other engines and years' : tr('Show {n} more for other engines/years', { n: other.length })}
          kind="ghost"
          onPress={() => setShowOther((x) => !x)}
        />
      ) : null}
      {showOther
        ? other.map((p) => (
            <View key={p.id} style={{ gap: space.sm }}>
              <Divider />
              <ProblemRow problem={p} showCost={showCost} />
            </View>
          ))
        : null}

      {model.buying_tips.length ? (
        <>
          <AppText variant="overline" tone="muted">
            Buying tips
          </AppText>
          {model.buying_tips.map((x, i) => (
            <AppText key={i} variant="label">
              → {x}
            </AppText>
          ))}
        </>
      ) : null}
      <AppText variant="caption" tone="muted">
        Commonly reported issues for this model, from general knowledge. Not a diagnosis of this car: a mechanic’s inspection is what tells
        you its real condition.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  problemHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  engineChip: { minHeight: 36, justifyContent: 'center' },
});
