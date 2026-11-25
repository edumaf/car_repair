import { FIXTURE_REPORTS } from '@/core/api/mocks/mockClients';

import { META, getMeta, setMeta } from './appMeta';
import { carTitle, createCar, deleteCar, getCar, listCars, updateCar } from './carsRepository';
import { createTestDb } from './__testutils__/nodeSqlDb';

describe('carsRepository', () => {
  let db: ReturnType<typeof createTestDb>;
  beforeEach(() => (db = createTestDb()));
  afterEach(() => db.close());

  it('creates a car from a report and reads it back', async () => {
    const id = await createCar(db, { report: FIXTURE_REPORTS.civic_2018, askingPrice: 15900, mileage: 61000, sellerType: 'private' }, 1000);
    const car = await getCar(db, id);
    expect(car).toMatchObject({
      id,
      year: 2018,
      make: 'Honda',
      model: 'Civic',
      trim: 'EX',
      powertrain: 'gas',
      askingPrice: 15900,
      mileage: 61000,
      sellerType: 'private',
      status: 'considering',
      createdAt: 1000,
    });
    expect(car?.report?.recalls?.length).toBe(FIXTURE_REPORTS.civic_2018.recalls?.length);
    expect(carTitle(car!)).toBe('2018 Honda Civic');
  });

  it('lists newest first, filters by status, updates and deletes', async () => {
    const a = await createCar(db, { report: FIXTURE_REPORTS.civic_2018 }, 1);
    const b = await createCar(db, { report: FIXTURE_REPORTS.prius_2017, powertrain: 'hybrid' }, 2);
    expect((await listCars(db)).map((c) => c.id)).toEqual([b, a]);

    await updateCar(db, a, { status: 'passed', askingPrice: null, nickname: 'Blue Civic' }, 3);
    expect((await listCars(db)).map((c) => c.id)).toEqual([a, b]);
    expect((await listCars(db, 'passed')).map((c) => c.id)).toEqual([a]);
    const updated = await getCar(db, a);
    expect(updated).toMatchObject({ status: 'passed', askingPrice: null, nickname: 'Blue Civic', updatedAt: 3 });
    expect(carTitle(updated!)).toBe('Blue Civic');

    await deleteCar(db, a);
    expect(await getCar(db, a)).toBeNull();
  });

  it('rejects invalid enum values at the database level', async () => {
    const id = await createCar(db, { report: FIXTURE_REPORTS.civic_2018 });
    await expect(updateCar(db, id, { status: 'stolen' as never })).rejects.toThrow();
  });

  it('stores app meta values', async () => {
    expect(await getMeta(db, META.dataVersion)).toBeNull();
    await setMeta(db, META.dataVersion, '1.1.1');
    expect(await getMeta(db, META.dataVersion)).toBe('1.1.1');
  });
});
