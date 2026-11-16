// Comparables for a car and the price check result (CLAUDE.md §6.7).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { priceCheck } from '@/core/price/priceCheck';
import { addComparable, deleteComparable, listComparables, type ComparableRecord } from '@/db/comparablesRepository';
import { getDb } from '@/db/db';

import { useCar } from './useCars';

export const comparableKeys = { car: (carId: string) => ['comparables', carId] as const };

export function usePriceCheck(carId: string) {
  const qc = useQueryClient();
  const car = useCar(carId);
  const comps = useQuery({ queryKey: comparableKeys.car(carId), queryFn: () => listComparables(getDb(), carId) });
  const invalidate = () => qc.invalidateQueries({ queryKey: comparableKeys.car(carId) });
  const add = useMutation({ mutationFn: (c: Omit<ComparableRecord, 'id'>) => addComparable(getDb(), carId, c), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => deleteComparable(getDb(), id), onSuccess: invalidate });
  const result =
    car.data && comps.data
      ? priceCheck({ askingPrice: car.data.askingPrice, mileage: car.data.mileage, year: car.data.year }, comps.data)
      : null;
  return { car, comps, add, remove, result };
}
