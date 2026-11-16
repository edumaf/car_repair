// Everything the inspection screen needs for one car: the car, its checklist, answers and photo checks.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { photoCheckClient } from '@/core/api/clients';
import { aiIsSample } from '@/core/api/mode';
import { buildChecklist, flattenChecklist } from '@/core/checklist/buildChecklist';
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

export const inspectionKeys = {
  answers: (carId: string) => ['answers', carId] as const,
  photoChecks: (carId: string) => ['photoChecks', carId] as const,
};

export function useInspection(carId: string) {
  const qc = useQueryClient();
  const car = useCar(carId);
  const answers = useQuery({ queryKey: inspectionKeys.answers(carId), queryFn: () => getAnswers(getDb(), carId) });
  const photoChecks = useQuery({ queryKey: inspectionKeys.photoChecks(carId), queryFn: () => listPhotoChecks(getDb(), carId) });

  const sections = useMemo(
    () => (car.data ? buildChecklist({ powertrain: car.data.powertrain }, topComplaintGroups(car.data.report?.complaints ?? null)) : []),
    [car.data],
  );
  const entries = useMemo(() => flattenChecklist(sections), [sections]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: inspectionKeys.answers(carId) });
    qc.invalidateQueries({ queryKey: inspectionKeys.photoChecks(carId) });
    qc.invalidateQueries({ queryKey: carKeys.all });
  };

  const answer = useMutation({
    mutationFn: ({ itemId, value, fromAi }: { itemId: string; value: Answer | null; fromAi?: boolean }) =>
      value === null ? clearAnswer(getDb(), carId, itemId) : setAnswer(getDb(), carId, itemId, value, { fromAi }),
    onSuccess: invalidate,
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
      const raw = await photoCheckClient.check({
        imageUri: uri,
        photoType,
        car: { year: c.year, make: c.make, model: c.model, powertrain: c.powertrain },
      });
      await addPhotoCheck(getDb(), carId, itemId, uri, sanitizePhotoResult(raw, photoType), aiIsSample());
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
    onSuccess: invalidate,
  });

  return { car, answers, photoChecks, sections, entries, answer, note, photo, removePhoto: removePhotoM, decide };
}
