// React Query hooks over the local cars table. Reads are cached; every write invalidates the car lists.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type CarPatch, createCar, deleteCar, getCar, listCars, type NewCar, updateCar } from '@/db/carsRepository';
import { getDb } from '@/db/db';

export const carKeys = {
  all: ['cars'] as const,
  one: (id: string) => ['cars', id] as const,
};

export function useCars() {
  return useQuery({ queryKey: carKeys.all, queryFn: () => listCars(getDb()) });
}

export function useCar(id: string | undefined) {
  return useQuery({ queryKey: carKeys.one(id ?? ''), queryFn: () => getCar(getDb(), id as string), enabled: !!id });
}

export function useCreateCar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewCar) => createCar(getDb(), input),
    onSuccess: () => qc.invalidateQueries({ queryKey: carKeys.all }),
  });
}

export function useUpdateCar(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: CarPatch) => updateCar(getDb(), id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: carKeys.all }),
  });
}

export function useDeleteCar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCar(getDb(), id),
    onSuccess: () => qc.invalidateQueries({ queryKey: carKeys.all }),
  });
}
