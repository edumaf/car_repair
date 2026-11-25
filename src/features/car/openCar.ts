// Opens a car's inspection or verdict with the car report underneath, so Back always lands on the report (with the
// car's year, engine, recalls and known problems) instead of the Garage. Owner, phone test 2026-11-25.
import { router } from 'expo-router';

export function openCarStep(id: string, step: 'inspect' | 'verdict'): void {
  router.push({ pathname: '/car/[id]', params: { id } });
  router.push({ pathname: step === 'inspect' ? '/car/[id]/inspect' : '/car/[id]/verdict', params: { id } });
}
