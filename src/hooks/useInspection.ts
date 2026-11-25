// Everything the inspection screen needs for one car: the car, its checklist, answers and photo checks.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { photoCheckClient } from '@/core/api/clients';
import { aiIsSample } from '@/core/api/mode';
import { buildChecklist, flattenChecklist } from '@/core/checklist/buildChecklist';
import { getModel } from '@/core/data/knowledge';
import { modelComplaintGroups, problemsFor } from '@/core/models/matchModels';
import { sanitizePhotoResult } from '@/core/photoCheck/findings';
import type { PhotoCheckType, Answer } from '@/core/types';
import { topComplaintGroups } from '@/core/vehicle/normalize';
import {
  addPhoto,
  addPhotoCheck,
  clearAnswer,
  getAnswers,
  listPhotoChecks,
  removePhoto,
  setAnswer,
  setDecision,
  setNote,
} from '@/db/answersRepository';
import { getDb } from '@/db/db';
import { deletePhotoFile } from '@/media/photos';

import { carKeys, useCar } from './useCars';
import { track } from '@/analytics/analytics';

export const inspectionKeys = {
  answers: (carId: string) => ['answers', carId] as const,
  photoChecks: (carId: string) => ['photoChecks', carId] as const,
};

export function useInspection(carId: string) {
  const qc = useQueryClient();
  const car = useCar(carId);
  const answers = useQuery({ queryKey: inspectionKeys.answers(carId), queryFn: () => getAnswers(getDb(), carId) });
  const photoChecks = useQuery({ queryKey: inspectionKeys.photoChecks(carId), queryFn: () => listPhotoChecks(getDb(), carId) });

  // Known problem areas: NHTSA's top complaint groups plus the ones our model database lists for this engine/year.
  const model = car.data?.modelId ? getModel(car.data.modelId) : undefined;
  const topGroups = useMemo(() => {
    const c = car.data;
    if (!c) return [];
    return [...new Set([...topComplaintGroups(c.report?.complaints ?? null), ...modelComplaintGroups(model, c.engineId, c.year)])];
  }, [car.data, model]);
  const modelProblems = useMemo(
    () => (model && car.data ? problemsFor(model, car.data.engineId, car.data.year).relevant : []),
    [model, car.data],
  );
  const sections = useMemo(() => (car.data ? buildChecklist({ powertrain: car.data.powertrain }, topGroups) : []), [car.data, topGroups]);
  const entries = useMemo(() => flattenChecklist(sections), [sections]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: inspectionKeys.answers(carId) });
    qc.invalidateQueries({ queryKey: inspectionKeys.photoChecks(carId) });
    qc.invalidateQueries({ queryKey: carKeys.all });
  };

  const answer = useMutation({
    mutationFn: ({ itemId, value, fromAi }: { itemId: string; value: Answer | null; fromAi?: boolean }) =>
      value === null ? clearAnswer(getDb(), carId, itemId) : setAnswer(getDb(), carId, itemId, value, { fromAi }),
    onSuccess: (_r, { itemId, value }) => {
      if (value !== null) track('item_answered', { item_id: itemId, answer: value });
      invalidate();
    },
  });

  const note = useMutation({
    mutationFn: ({ itemId, text }: { itemId: string; text: string }) => setNote(getDb(), carId, itemId, text),
    onSuccess: invalidate,
  });

  /** Saves the photo, then (for photo-check items) asks the AI and stores its findings as suggestions. */
  const photo = useMutation({
    mutationFn: async ({ itemId, uri, photoType }: { itemId: string; uri: string; photoType: PhotoCheckType | null }) => {
      await addPhoto(getDb(), carId, itemId, uri);
      invalidate();
      if (!photoType || !car.data) return;
      const c = car.data;
      const started = Date.now();
      const raw = await photoCheckClient.check({
        imageUri: uri,
        photoType,
        car: { year: c.year, make: c.make, model: c.model, powertrain: c.powertrain },
      });
      const result = sanitizePhotoResult(raw, photoType);
      await addPhotoCheck(getDb(), carId, itemId, uri, result, aiIsSample());
      track('photo_check_completed', {
        photo_type: photoType,
        findings_count: result.findings.length + result.lights.length,
        latency_ms: Date.now() - started,
        sample: aiIsSample(),
      });
    },
    onSettled: invalidate,
  });

  const removePhotoM = useMutation({
    mutationFn: async ({ itemId, uri }: { itemId: string; uri: string }) => {
      await removePhoto(getDb(), carId, itemId, uri);
      deletePhotoFile(uri);
    },
    onSuccess: invalidate,
  });

  /** Confirm or dismiss an AI suggestion. Confirming marks the target item as a problem (CLAUDE.md §2.3). */
  const decide = useMutation({
    mutationFn: async ({
      photoCheckId,
      key,
      decision,
      targetItemId,
    }: {
      photoCheckId: string;
      key: string;
      decision: 'confirmed' | 'dismissed';
      targetItemId: string;
    }) => {
      await setDecision(getDb(), photoCheckId, key, decision);
      if (decision === 'confirmed') await setAnswer(getDb(), carId, targetItemId, 'problem', { fromAi: true });
    },
    onSuccess: (_r, { key, decision }) => {
      track(decision === 'confirmed' ? 'photo_finding_confirmed' : 'photo_finding_dismissed', { code: key });
      invalidate();
    },
  });

  return {
    car,
    model,
    modelProblems,
    topGroups,
    answers,
    photoChecks,
    sections,
    entries,
    answer,
    note,
    photo,
    removePhoto: removePhotoM,
    decide,
  };
}
