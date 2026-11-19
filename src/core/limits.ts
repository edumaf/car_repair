// Free tier (CLAUDE.md §9). Enforced locally for now; the server (/quota) becomes the source of truth for anything
// that costs money (photo checks, screenshots) once the backend exists.
export const FREE_PHOTO_CHECKS_PER_INSPECTION = 10;

export type PaywallPlacement = 'first_report' | 'second_inspection' | 'photo_limit' | 'premium_feature';

/** Can this car be inspected for free? Only the first inspected car is free (lifetime). */
export function canInspectFree(freeCarId: string | null, carId: string): boolean {
  return freeCarId === null || freeCarId === carId;
}

export function canRunPhotoCheck(premium: boolean, photoChecksForCar: number): boolean {
  return premium || photoChecksForCar < FREE_PHOTO_CHECKS_PER_INSPECTION;
}

/** Paywall headline personalised from the onboarding "biggest worry" answer (§9). */
export function paywallHeadline(worry: string | undefined): string {
  switch (worry) {
    case 'scams':
      return 'Spot the scams before you pay';
    case 'overpaying':
      return 'Never overpay for a used car';
    case 'hidden':
      return 'Find hidden problems before you buy';
    case 'paperwork':
      return 'Get the checks and paperwork right';
    default:
      return 'Check every car before you hand over the money';
  }
}
